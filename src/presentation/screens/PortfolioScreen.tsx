

import React, { useState, useEffect } from 'react';
import {View, StyleSheet, FlatList, RefreshControl, ScrollView, Platform, StatusBar} from 'react-native';
import {
  Text,
  Searchbar,
  Card,
  Chip,
  IconButton,
  Button,
  useTheme,
  Divider,
  ProgressBar,
  Modal,
  Portal,
  RadioButton,
  Dialog,
} from 'react-native-paper';
import { TopAppBar } from '../components/TopAppBar';
import { NetworkBanner } from '../components/NetworkBanner';
import { PropertyCardSkeleton } from '../components/Skeleton';
import { getPropertiesUseCase } from '../../app/di';
import { Property, PropertyRegion, PropertyStatus } from '../../domain/entities/Property';
import { QueueItem } from '../../domain/entities/SyncState';
import { syncEngine } from '../../sync/SyncEngine';
import {Icon, WifiIcon, WifiOffIcon} from "lucide-react-native";
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { authRepository } from '../../app/di';

type Props = StackScreenProps<RootStackParamList, 'Portfolio'>;

export const PortfolioScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();

  // States
  const [properties, setProperties] = useState<Property[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<PropertyRegion | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<PropertyStatus | 'all'>('all');

  // Menus
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

  // Sync state
  const [syncQueue, setSyncQueue] = useState<QueueItem[]>([]);
  const [isOnline, setIsOnline] = useState(syncEngine.isOnline());
  const [isSyncing, setIsSyncing] = useState(syncEngine.isEngineSyncing());
  const [showQueuePanel, setShowQueuePanel] = useState(false);

  // Subscribe to Sync Queue and online status
  useEffect(() => {
    setIsOnline(syncEngine.isOnline());
    const unsubscribe = syncEngine.subscribe((queue) => {
      setSyncQueue(queue);
      setIsSyncing(syncEngine.isEngineSyncing());
    });
    unsubscribe();
  }, []);

  // Fetch properties helper
  const loadProperties = async (cursor?: string, isLoadMore = false) => {
    if (loading || (isLoadMore && loadingMore)) return;

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const q = searchQuery.trim() || undefined;
      const region = selectedRegion === 'all' ? undefined : selectedRegion;
      const status = selectedStatus === 'all' ? undefined : selectedStatus;

      const response = await getPropertiesUseCase.execute(q, region, status, cursor, !isOnline);

      if (isLoadMore) {
        // Avoid duplicate ids
        setProperties((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const union = [...prev];
          response.data.forEach((p) => {
            if (!existingIds.has(p.id)) {
              union.push(p);
            }
          });
          return union;
        });
      } else {
        setProperties(response.data);
      }
      setNextCursor(response.nextCursor);
    } catch (e) {
      console.error('[Portfolio] Error loading properties:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Initial and Filter-triggered loads
  useEffect(() => {
    loadProperties();
  }, [searchQuery, selectedRegion, selectedStatus, isOnline]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProperties();
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (nextCursor && !loadingMore && isOnline) {
      loadProperties(nextCursor, true);
    }
  };

  const toggleNetworkMode = () => {
    const nextMode = !isOnline;
    setIsOnline(nextMode);
    syncEngine.setOnlineStatus(nextMode);
  };

  const getRegionLabel = (key: string) => {
    switch (key) {
      case 'all': return 'All';
      case 'central': return 'Central';
      case 'eastern': return 'Eastern';
      case 'western': return 'Western';
      case 'northern': return 'Northern';
      case 'active': return 'Active';
      case 'under_renovation': return 'Under Renovation';
      default: return key.charAt(0).toUpperCase() + key.slice(1);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return theme.colors.primary;
      case 'under_renovation':
        return theme.colors.secondary;
      default:
        return '#64748b';
    }
  };

  // Conflict Resolution helper
  const resolveConflict = async (itemId: string, action: 'override' | 'discard', serverVersion?: number) => {
    await syncEngine.resolveConflict(itemId, action, serverVersion);
  };

  return (
    <View style={styles.container}>
      {/* Network Status Banner managed internally */}
      <NetworkBanner />

      {/* Sync Queue Banner/Panel */}
      {syncQueue.length > 0 && (
        <View style={styles.syncContainer}>
          <ProgressBar
            id="sync-progress"
            indeterminate={isSyncing}
            progress={isSyncing ? undefined : 0}
            color={theme.colors.primary}
          />
          <Card style={styles.syncCard} mode="outlined">
            <Card.Content style={styles.syncHeader}>
              <View>
                <Text style={styles.syncTitle}>
                  Sync Queue: {syncQueue.length} {syncQueue.length === 1 ? 'item' : 'items'} remaining
                </Text>
                <Text style={styles.syncSub}>
                  {isSyncing ? 'Syncing assets to server...' : 'Waiting for connection/cycle...'}
                </Text>
              </View>
              <Button
                id="toggle-sync-panel-btn"
                mode="text"
                compact
                onPress={() => setShowQueuePanel(!showQueuePanel)}
              >
                {showQueuePanel ? 'Hide Details' : 'Show Details'}
              </Button>
            </Card.Content>

            {showQueuePanel && (
              <ScrollView style={styles.queueScroll} nestedScrollEnabled>
                {syncQueue.map((item) => (
                  <View key={item.id} style={styles.queueItemRow}>
                    <View style={styles.queueItemInfo}>
                      <View style={styles.queueItemTypeRow}>
                        <Chip
                          id={`sync-chip-${item.id}`}
                          compact
                          textStyle={styles.chipText}
                          style={[
                            styles.typeChip,
                            { backgroundColor: item.type === 'photo' ? '#e0f2fe' : '#ede9fe' },
                          ]}
                        >
                          {item.type.toUpperCase()}
                        </Chip>
                        <Text style={[styles.queueStatus, { color: getStatusColor(item.status) }]}>
                          {item.status.toUpperCase()}
                        </Text>
                      </View>

                      <Text variant="bodySmall" numberOfLines={1} style={styles.queueId}>
                        ID: {item.id} {item.payload.name ? `(${item.payload.name})` : ''}
                      </Text>

                      {item.error && (
                        <Text style={styles.errorLabel}>
                          Error: {item.error}
                        </Text>
                      )}

                      {/* Conflict Action Buttons */}
                      {item.status === 'conflict' && item.payload.conflictData && (
                        <View style={styles.conflictBox}>
                          <Text style={styles.conflictTitle}>Conflict Resolution Needed:</Text>
                          <Text variant="bodySmall" style={styles.conflictText}>
                            Your version: V{item.payload.propertyVersion} | Server: V{item.payload.conflictData.version}
                          </Text>
                          <View style={styles.conflictActions}>
                            <Button
                              id={`resolve-override-${item.id}`}
                              mode="contained"
                              compact
                              onPress={() => resolveConflict(item.id, 'override', item.payload.conflictData.version)}
                              style={styles.conflictBtn}
                            >
                              Sync server V{item.payload.conflictData.version}
                            </Button>
                            <Button
                              id={`resolve-discard-${item.id}`}
                              mode="outlined"
                              compact
                              onPress={() => resolveConflict(item.id, 'discard')}
                              style={styles.conflictBtn}
                            >
                              Discard
                            </Button>
                          </View>
                        </View>
                      )}
                    </View>

                    <View style={styles.queueActions}>
                      {item.status === 'failed' && (
                        <IconButton
                          id={`retry-sync-btn-${item.id}`}
                          icon="refresh"
                          size={20}
                          onPress={() => syncEngine.forceRetry(item.id)}
                        />
                      )}
                      {item.status !== 'syncing' && item.status !== 'conflict' && (
                        <IconButton
                          id={`discard-sync-btn-${item.id}`}
                          icon="delete"
                          iconColor={theme.colors.error}
                          size={20}
                          onPress={() => syncEngine.discardItem(item.id)}
                        />
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </Card>
        </View>
      )}

      {/* Header and Controls */}
      <TopAppBar
        title="Nyumban Properties"
        rightActions={
          <IconButton
            id="workspace-logout-button"
            icon="logout"
            size={24}
            onPress={() => setLogoutDialogVisible(true)}
          />
        }
      >
        <View style={[styles.searchHeader]}>
          <View style={styles.searchRow}>
            <IconButton
              icon="filter-variant"
              mode="contained"
              containerColor={theme.colors.secondary}
              iconColor={theme.colors.primary}
              size={34}
              onPress={() => setFilterModalVisible(true)}
              style={[styles.filterIconButton, { elevation: 1}]}
            />
            <Searchbar
              id="property-search-input"
              placeholder="Search properties..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
              elevation={0}
              inputStyle={{
                fontSize: 14,
                fontWeight: 'semibold'
              }}
            />
          </View>

          {(selectedRegion !== 'all' || selectedStatus !== 'all') && (
            <View style={styles.activeFiltersRow}>
              {selectedRegion !== 'all' && (
                <Chip
                  onClose={() => setSelectedRegion('all')}
                  style={styles.activeFilterChip}
                  textStyle={styles.activeFilterChipText}
                >
                  Region: {getRegionLabel(selectedRegion)}
                </Chip>
              )}
              {selectedStatus !== 'all' && (
                <Chip
                  onClose={() => setSelectedStatus('all')}
                  style={styles.activeFilterChip}
                  textStyle={styles.activeFilterChipText}
                >
                  Status: {getRegionLabel(selectedStatus)}
                </Chip>
              )}
            </View>
          )}
        </View>
      </TopAppBar>

      <Portal>
        <Modal
          visible={filterModalVisible}
          onDismiss={() => setFilterModalVisible(false)}
          contentContainerStyle={[styles.filterModal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>Filters</Text>
          <Divider style={styles.modalDivider} />

          <Text variant="titleMedium" style={styles.filterSectionTitle}>Region</Text>
          <RadioButton.Group onValueChange={value => setSelectedRegion(value as any)} value={selectedRegion}>
            <View style={styles.radioRow}>
              <RadioButton.Item label="All Regions" value="all" />
              <RadioButton.Item label="Central" value="central" />
              <RadioButton.Item label="Eastern" value="eastern" />
              <RadioButton.Item label="Western" value="western" />
              <RadioButton.Item label="Northern" value="northern" />
            </View>
          </RadioButton.Group>

          <Divider style={styles.modalDivider} />

          <Text variant="titleMedium" style={styles.filterSectionTitle}>Status</Text>
          <RadioButton.Group onValueChange={value => setSelectedStatus(value as any)} value={selectedStatus}>
            <View style={styles.radioRow}>
              <RadioButton.Item label="All Statuses" value="all" />
              <RadioButton.Item label="Active" value="active" />
              <RadioButton.Item label="Under Renovation" value="under_renovation" />
            </View>
          </RadioButton.Group>

          <Button
            mode="contained"
            onPress={() => setFilterModalVisible(false)}
            style={styles.applyBtn}
          >
            Apply Filters
          </Button>
        </Modal>

        <Dialog visible={logoutDialogVisible} onDismiss={() => setLogoutDialogVisible(false)}>
          <Dialog.Title>Logout Warning</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Are you sure you want to logout? You might lose access to offline synchronization until you log back in.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLogoutDialogVisible(false)}>Cancel</Button>
            <Button onPress={async () => {
              setLogoutDialogVisible(false);
              await authRepository.logout();
              navigation.replace('Login');
            }}>Logout</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Main FlatList */}
      {
        loading ? (
            <FlatList
                data={[1,2,3,4,5,6,7]}
                keyExtractor={(item, index) => `skeleton-${index}`}
                renderItem={({ item }) => {
                    return <PropertyCardSkeleton />;
                }}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.primary]} />
                }
                onEndReachedThreshold={0.4}
                contentContainerStyle={styles.listContent}
            />

          ) : (
            <FlatList
                data={properties}
                keyExtractor={(item, index) => item.id}
                renderItem={({ item }) => {
                  return (
                      <Card
                          id={`property-card-${item.id}`}
                          style={styles.propCard}
                          mode="contained"
                          onPress={() => navigation.navigate('Detail', { propertyId: item.id })}
                      >
                        <Card.Content>
                          <View style={styles.propRow}>
                            <View style={styles.propMain}>
                              <Text variant="titleMedium" style={styles.propName}>
                                {item.name}
                              </Text>
                              <Text variant="bodySmall" style={styles.propAddr}>
                                {item.address}
                              </Text>
                              <View style={styles.badgeRow}>
                                <Chip style={styles.badgeChip}>
                                  {item.unitCount} {item.unitCount === 1 ? 'unit' : 'units'}
                                </Chip>
                                <Chip style={styles.badgeChip}>
                                  Region: {getRegionLabel(item.region)}
                                </Chip>
                                <Chip style={styles.badgeChip}>
                                  V{item.version}
                                </Chip>
                              </View>
                            </View>

                            <View style={styles.propRight}>
                              <Text
                                  variant="bodySmall"
                                  style={[styles.statusText, { color: getStatusColor(item.status) }]}
                              >
                                ● {item.status.toUpperCase()}
                              </Text>
                              {item.lastInspectedAt && (
                                  <Text variant="labelSmall" style={styles.lastInspected}>
                                    Last: {new Date(item.lastInspectedAt).toLocaleDateString()}
                                  </Text>
                              )}
                            </View>
                          </View>
                        </Card.Content>
                      </Card>
                  );
                }}
                ListEmptyComponent={
                  !loading ? (
                      <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                          No properties found matching filters.
                        </Text>
                      </View>
                  ) : null
                }
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.primary]} />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.4}
                contentContainerStyle={styles.listContent}
            />

        )
      }


      {/* Network Connectivity Switch Banner - REMOVED, replaced by NetworkBanner */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  syncContainer: {
    padding: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  syncCard: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
  },
  syncHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  syncSub: {
    fontSize: 12,
    color: '#64748b',
  },
  queueScroll: {
    maxHeight: 200,
    marginTop: 10,
  },
  queueItemRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  queueItemInfo: {
    flex: 1,
    marginRight: 10,
  },
  queueItemTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeChip: {
    marginRight: 8,
    height: 24,
  },
  chipText: {
    fontSize: 10,
    lineHeight: 12,
  },
  queueStatus: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  queueId: {
    color: '#475569',
    fontSize: 11,
  },
  errorLabel: {
    color: '#ef4444',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  queueActions: {
    flexDirection: 'row',
  },
  conflictBox: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  conflictTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#b45309',
  },
  conflictText: {
    color: '#78350f',
  },
  conflictActions: {
    flexDirection: 'row',
    marginTop: 6,
  },
  conflictBtn: {
    marginRight: 6,
  },
  searchHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 2,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  portfolioTitle: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  searchBar: {
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
  },
  filterIconButton: {
    borderRadius: 12,
  },
  activeFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  activeFilterChip: {
    marginRight: 8,
    marginBottom: 4,
    backgroundColor: '#e2e8f0',
  },
  activeFilterChipText: {
    fontSize: 12,
  },
  filterModal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalDivider: {
    marginVertical: 10,
  },
  filterSectionTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  radioRow: {
    marginLeft: -8,
  },
  applyBtn: {
    marginTop: 20,
    borderRadius: 8,
  },
  listContent: {
    padding: 6,
  },
  propCard: {
    marginBottom: 10,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  propRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  propMain: {
    flex: 1,
    paddingRight: 10,
  },
  propName: {
    fontWeight: 'bold',
    color: '#1e293b',
  },
  propAddr: {
    color: '#64748b',
    marginVertical: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  badgeChip: {
    marginRight: 4,
    marginTop: 4,
    height: 34,
    backgroundColor: '#f1f5f9',
  },
  propRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  lastInspected: {
    color: '#94a3b8',
    marginTop: 6,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
  },
});
