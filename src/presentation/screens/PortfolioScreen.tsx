

import React, { useState, useEffect } from 'react';
import {View, StyleSheet, FlatList, RefreshControl, ScrollView, Platform, StatusBar, SectionList, Image, useWindowDimensions} from 'react-native';
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
  Menu,
} from 'react-native-paper';
import { BottomNavigation } from 'react-native-paper';
import { TopAppBar } from '../components/TopAppBar';
import { NetworkBanner } from '../components/NetworkBanner';
import { PropertyCardSkeleton } from '../components/Skeleton';
import { getPropertiesUseCase } from '../../app/di';
import { Property } from '../../domain/entities/Property';
import { QueueItem } from '../../domain/entities/SyncState';
import { syncEngine } from '../../sync/SyncEngine';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { authRepository, inspectionRepository, propertyRepository } from '../../app/di';
import { Agent } from '../../domain/entities/Agent';
import {Inspection} from "../../types";
import {theme} from "../theme";

type Props = StackScreenProps<RootStackParamList, 'Portfolio'>;

export const PortfolioScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();

  const { width } = useWindowDimensions();
  const isSmallScreen = width < 400;

  // States
  const [properties, setProperties] = useState<Property[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Property[]>([]);
  const [drafts, setDrafts] = useState<{ [id: string]: Inspection }>({});
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

  // Tab state
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'all', title: 'All', focusedIcon: 'home', unfocusedIcon: 'home-outline', testID: 'tab-all' },
    { key: 'recent', title: 'Recent', focusedIcon: 'clock', unfocusedIcon: 'clock-outline', testID: 'tab-recent' },
    { key: 'completed', title: 'Completed', focusedIcon: 'check-circle', unfocusedIcon: 'check-circle-outline', testID: 'tab-completed' },
  ]);

  // Sync state
  const [syncQueue, setSyncQueue] = useState<QueueItem[]>([]);
  const [isOnline, setIsOnline] = useState(syncEngine.isOnline());
  const [isSyncing, setIsSyncing] = useState(syncEngine.isEngineSyncing());
  const [showQueuePanel, setShowQueuePanel] = useState(false);

  // Error dialog for upload failures
  const [errorDialogVisible, setErrorDialogVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Agent & User Menu state
  const [agent, setAgent] = useState<Agent | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  // Subscribe to updates from the sync engine
  useEffect(() => {
    setIsOnline(syncEngine.isOnline());
    const unsubscribe = syncEngine.subscribe((queue) => {
      setSyncQueue(queue);
      setIsSyncing(syncEngine.isEngineSyncing());
    });

    // Load agent details
    authRepository.getAgent().then(setAgent);

    unsubscribe();
  }, []);

  // Fetch drafts
  const loadDrafts = async () => {
    const cached = await propertyRepository.getCachedProperties();
    const draftMap: { [id: string]: Inspection } = {};
    for (const p of cached) {
      const d = await inspectionRepository.getDraft(p.id);
      if (d) draftMap[p.id] = d;
    }
    setDrafts(draftMap);
  };

  // Fetch recently viewed
  const loadRecentlyViewed = async () => {
    const recent = await propertyRepository.getRecentlyViewed();
    setRecentlyViewed(recent);
  };

  // Fetch properties helper
  const loadProperties = async (cursor?: string, isLoadMore = false) => {
    if (loading || (isLoadMore && loadingMore)) return;

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      await loadDrafts();
      await loadRecentlyViewed();

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

  const handleForceUpload = async (itemId: string) => {
    if (!isOnline) {
      setErrorMessage('No network connection. Please check your internet and try again.');
      setErrorDialogVisible(true);
      return;
    }
    try {
      await syncEngine.forceRetry(itemId);
    } catch (e: any) {
      setErrorMessage(e.message || 'Force upload failed.');
      setErrorDialogVisible(true);
    }
  };

  const handleLogout = async () => {
    setLogoutDialogVisible(false);
    await authRepository.logout();
    navigation.replace('Login');
  };

  const renderPropertyItem = (item: Property, isVertical = false) => {
    const draft = drafts[item.id];
    const pendingSync = syncQueue.find(q => q.type === 'inspection' && q.payload.propertyId === item.id);
    const isCompleted = !!item.lastInspectedAt && !pendingSync;

    if (isVertical) {
      return (
        <Card
          id={`property-card-${item.id}`}
          style={[styles.propCard, styles.verticalCard, isSmallScreen && { width: (width - 24) / 2 }]}
          mode="contained"
          onPress={() => navigation.navigate('Detail', { propertyId: item.id })}
        >
          <Card.Content style={{ padding: 8 }}>
            <Text variant="titleSmall" numberOfLines={2} style={styles.propName}>
              {item.name}
            </Text>
            <Text variant="bodySmall" numberOfLines={2} style={[styles.propAddr, { fontSize: 10, height: 32 }]}>
              {item.address || 'Address not available'}
            </Text>

            <View style={{ marginTop: 2, flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
              <Chip style={[styles.badgeChip]} textStyle={{ fontSize: 9 }}>
                Units: {item.unitCount ?? 'N/A'}
              </Chip>
              {isCompleted && (
                <IconButton icon="check-circle" iconColor="#15803d" size={16} style={{ margin: 0 }} />
              )}
            </View>
          </Card.Content>
        </Card>
      );
    }

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
                {item.address || 'Address not available'}
              </Text>
              <View style={styles.badgeRow}>
                <Chip style={styles.badgeChip} textStyle={styles.chipText}>
                  {item.unitCount ?? 'N/A'} {item.unitCount === 1 ? 'unit' : 'units'}
                </Chip>
                <Chip style={[styles.badgeChip, { backgroundColor: getStatusColor(item.status) }]} textStyle={[styles.chipText, { color: '#fff' }]}>
                  {getRegionLabel(item.status)}
                </Chip>
              </View>

              <View style={{ marginTop: 8, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {draft && (
                  <Chip icon="progress-wrench" style={{ backgroundColor: '#fff7ed' }} textStyle={{ color: '#c2410c', fontSize: 10 }}>
                    In Progress
                  </Chip>
                )}
                {pendingSync && (
                  <Chip icon="cloud-upload" style={{ backgroundColor: '#f0f9ff' }} textStyle={{ color: '#0369a1', fontSize: 10 }}>
                    Pending Upload
                  </Chip>
                )}
                {isCompleted && (
                  <Chip icon="check-circle" style={{ backgroundColor: '#f0fdf4' }} textStyle={{ color: '#15803d', fontSize: 10 }}>
                    Completed
                  </Chip>
                )}
              </View>
            </View>

            <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View>
                <Text>{getRegionLabel(item.region)}</Text>
              </View>

              {pendingSync && (
                <Button
                  mode="outlined"
                  compact
                  onPress={() => handleForceUpload(pendingSync.id)}
                  style={{ marginTop: 8 }}
                  labelStyle={{ fontSize: 10 }}
                >
                  Force Upload
                </Button>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const AllPropertiesRoute = () => {
    const sections = [
      { title: 'Pending Upload Online', data: properties.filter(p => syncQueue.some(q => q.type === 'inspection' && q.payload.propertyId === p.id)) },
      { title: 'All Properties', data: properties },
    ].filter(s => s.data.length > 0);

    return loading ? (
      <FlatList
        data={[1, 2, 3, 4, 5, 6, 7]}
        keyExtractor={(item, index) => `skeleton-${index}`}
        renderItem={() => <PropertyCardSkeleton />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.primary]} />
        }
        contentContainerStyle={styles.listContent}
      />
    ) : (
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderPropertyItem(item)}
        renderSectionHeader={({ section: { title } }) => (
          <Text variant="labelMedium" style={styles.sectionHeader}>{title}</Text>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.primary]} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="titleMedium" style={styles.emptyText}>No properties found</Text>
            <Button mode="outlined" onPress={() => loadProperties()} style={{ marginTop: 12 }}>
              Reload
            </Button>
          </View>
        }
      />
    );
  };

  const RecentRoute = () => (
    <FlatList
      data={recentlyViewed}
      keyExtractor={(item) => `recent-${item.id}`}
      renderItem={({ item }) => renderPropertyItem(item)}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text variant="titleMedium" style={styles.emptyText}>No recently viewed properties</Text>
        </View>
      }
    />
  );

  const CompletedRoute = () => {
    const completedProperties = properties.filter(p => !!p.lastInspectedAt && !syncQueue.some(q => q.type === 'inspection' && q.payload.propertyId === p.id));

    return (
      <FlatList
        data={completedProperties}
        keyExtractor={(item) => `completed-${item.id}`}
        renderItem={({ item }) => renderPropertyItem(item, true)}
        numColumns={isSmallScreen ? 2 : 1}
        key={isSmallScreen ? 'h' : 'v'}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="titleMedium" style={styles.emptyText}>No completed inspections found</Text>
          </View>
        }
      />
    );
  };

  const renderScene = ({ route }: any) => {
    switch (route.key) {
      case 'all':
        return <AllPropertiesRoute />;
      case 'recent':
        return <RecentRoute />;
      case 'completed':
        return <CompletedRoute />;
      default:
        return null;
    }
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
            style={{ height: 2, marginBottom: 8 }}
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
        logo={
        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center'}}>
          <Image
              source={require('../../../assets/logo.png')}
              style={{ width: 40, height: 40, resizeMode: 'contain' }}
          />
          <Text style={styles.headerTitle}>
            Nyumban Properties
          </Text>
        </View>

        }
        rightActions={
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <IconButton
                icon="account-circle"
                size={28}
                onPress={() => setMenuVisible(true)}
              />
            }
          >
            <View style={{ padding: 16, minWidth: 200 }}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                {agent?.displayName || 'Agent'}
              </Text>
              <Text variant="bodySmall" style={{ color: '#64748b', marginTop: 4 }}>
                Region: {agent?.assignedRegion ? getRegionLabel(agent.assignedRegion) : 'N/A'}
              </Text>
              <Divider style={{ marginVertical: 12 }} />
              <Button
                mode="outlined"
                icon="logout"
                onPress={() => {
                  setMenuVisible(false);
                  setLogoutDialogVisible(true);
                }}
                textColor={theme.colors.error}
                style={{ borderColor: theme.colors.error }}
              >
                Logout
              </Button>
            </View>
          </Menu>
        }
      >
        <View style={[styles.searchHeader]}>
          <View style={styles.searchRow}>
            <IconButton
              icon="filter-variant"
              id="filter-btn"
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
            <Button onPress={handleLogout} textColor={theme.colors.error}>Logout</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={errorDialogVisible} onDismiss={() => setErrorDialogVisible(false)}>
          <Dialog.Title>Upload Failed</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{errorMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setErrorDialogVisible(false)}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Main Content with Tabs */}
      <BottomNavigation
        navigationState={{ index, routes }}
        onIndexChange={setIndex}
        renderScene={renderScene}
        barStyle={{ backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' }}
        safeAreaInsets={{ bottom: 0 }}
      />
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
  verticalCard: {
    margin: 4,
    flex: 1,
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
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: 'bold',
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
  headerTitle: {
    color: theme.colors.secondary,
    fontWeight: 'bold',
    fontSize: 18
  },
});
