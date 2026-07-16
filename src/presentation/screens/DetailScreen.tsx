

import React, { useState, useEffect } from 'react';
import {View, StyleSheet, ScrollView, Platform, StatusBar} from 'react-native';
import { Text, Card, Button, List, Divider, Chip, IconButton, useTheme } from 'react-native-paper';
import { TopAppBar } from '../components/TopAppBar';
import { DetailSkeleton } from '../components/Skeleton';
import { propertyRepository, inspectionRepository } from '../../app/di';
import { Property } from '../../domain/entities/Property';
import { Inspection } from '../../domain/entities/Inspection';
import { AppTheme, theme } from '../theme';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = StackScreenProps<RootStackParamList, 'Detail'>;

export const DetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { propertyId } = route.params;
  const theme = useTheme<AppTheme>();

  const [property, setProperty] = useState<Property | null>(null);
  const [draft, setDraft] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);
      try {
        // Fetch property detail (which loads room configurations)
        const p = await propertyRepository.getPropertyDetail(propertyId);
        setProperty(p);

        // Check if there is an active draft inspection
        const activeDraft = await inspectionRepository.getDraft(propertyId);
        setDraft(activeDraft);
      } catch (err) {
        console.error('[Detail] Error loading detail:', err);
        // Fallback to cache
        const cached = await propertyRepository.getCachedProperties();
        const found = cached.find((p) => p.id === propertyId);
        if (found) {
          setProperty(found);
        }
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [propertyId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <TopAppBar title="Property Profile" onBack={() => navigation.goBack()} />
        <DetailSkeleton />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Property details not found.</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>Go Back</Button>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return theme.colors.success;
      case 'under_renovation':
        return theme.colors.warning;
      default:
        return '#64748b';
    }
  };

  return (
    <View style={styles.container}>
      <TopAppBar title="Property Profile" onBack={() => navigation.goBack()} />
      <ScrollView>
        {/* Primary info card */}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <View style={styles.badgeRow}>
              <Chip
                style={[styles.statusChip, { backgroundColor: getStatusColor(property.status) + '15' }]}
                textStyle={{ color: getStatusColor(property.status), fontWeight: 'bold', fontSize: 10 }}
              >
                ● {property.status.toUpperCase()}
              </Chip>
              <Chip style={styles.chip}>Region: {property.region.toUpperCase()}</Chip>
              <Chip style={styles.chip}>V{property.version}</Chip>
            </View>

            <Text style={styles.propName}>{property.name}</Text>
            <Text style={styles.propAddr}>{property.address}</Text>

            <Divider style={styles.divider} />

            <View style={styles.metaRow}>
              <View style={styles.metaCol}>
                <Text variant="labelMedium" style={styles.metaLabel}>Total Configured Units</Text>
                <Text style={styles.metaVal}>{property.unitCount}</Text>
              </View>
              <View style={styles.metaCol}>
                <Text variant="labelMedium" style={styles.metaLabel}>Last Assessment Date</Text>
                <Text style={styles.metaVal}>
                  {property.lastInspectedAt ? new Date(property.lastInspectedAt).toLocaleDateString() : 'Never'}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Room layout list */}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text style={styles.sectionTitle}>Physical Floor & Room Config</Text>
            <Text variant="bodySmall" style={styles.sectionSubtitle}>
              These rooms represent the structural assets requiring physical condition logging.
            </Text>

            <Divider style={styles.divider} />

            {property.rooms && property.rooms.length > 0 ? (
              property.rooms.map((room) => (
                <List.Item
                  id={`room-item-${room.id}`}
                  key={room.id}
                  title={room.label}
                  description={`Floor: ${room.floor === 0 ? 'Ground' : 'Level ' + room.floor}`}
                  left={(props) => <List.Icon {...props} icon="door-closed" />}
                  style={styles.roomItem}
                />
              ))
            ) : (
              <Text style={styles.emptyRooms}>No room configurations associated with this property.</Text>
            )}
          </Card.Content>
        </Card>

        {/* CTA Draft Status and Button */}
        <View style={styles.ctaContainer}>
          {draft ? (
            <View style={styles.draftBox}>
              <Text style={styles.draftText}>
                Unfinished Draft Found! Last modified on {new Date(draft.completedAt * 1000).toLocaleTimeString()}.
              </Text>
              <Button
                id="begin-inspection-button"
                mode="contained"
                onPress={() => navigation.navigate('Inspection', { propertyId: property.id, isDraft: true })}
                style={styles.ctaBtn}
              >
                Resume Inspection Draft
              </Button>
            </View>
          ) : (
            <Button
              id="begin-inspection-button"
              mode="contained"
              disabled={property.rooms.length === 0}
              onPress={() => navigation.navigate('Inspection', { propertyId: property.id, isDraft: false })}
              style={styles.ctaBtn}
            >
              Start New Property Assessment
            </Button>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontWeight: '600',
    color: '#1e293b',
  },
  card: {
    margin: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  statusChip: {
    marginRight: 6,
  },
  chip: {
    marginRight: 6,
    backgroundColor: '#f1f5f9',
  },
  propName: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#0f172a',
    marginBottom: 6,
  },
  propAddr: {
    color: '#475569',
    lineHeight: 22,
  },
  divider: {
    marginVertical: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    color: '#94a3b8',
    marginBottom: 4,
  },
  metaVal: {
    fontWeight: 'semibold',
    color: '#1e293b',
  },
  sectionTitle: {
    fontWeight: 'semibold',
    color: '#1e293b',
  },
  sectionSubtitle: {
    color: '#64748b',
    marginTop: 2,
  },
  roomItem: {
    paddingVertical: 4,
  },
  emptyRooms: {
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 20,
  },
  ctaContainer: {
    padding: 12,
    marginBottom: 30,
  },
  draftBox: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  draftText: {
    color: theme.colors.secondary,
    marginBottom: 12,
    fontWeight: '500',
  },
  ctaBtn: {
    borderRadius: 8,
    paddingVertical: 6,
  },
});
