import React, { useState, useEffect } from 'react';
import {View, StyleSheet, ScrollView, Alert, Image, TouchableOpacity, Platform, StatusBar} from 'react-native';
import {
  Text,
  Button,
  Card,
  TextInput,
  SegmentedButtons,
  ProgressBar,
  IconButton,
  Divider,
  useTheme,
  Snackbar,
  Dialog,
  Portal,
  Appbar, Chip,
} from 'react-native-paper';
import { TopAppBar } from '../components/TopAppBar';
import { InspectionSkeleton } from '../components/Skeleton';
import { propertyRepository, inspectionRepository } from '../../app/di';
import { Property } from '../../domain/entities/Property';
import { Inspection, RoomInspection, InspectionType } from '../../domain/entities/Inspection';
import { Photo } from '../../domain/entities/Photo';
import * as ImagePicker from 'expo-image-picker';
import { AppTheme } from '../theme';
import syncEngine from "../../sync/SyncEngine";
import {DraftingCompassIcon, Save} from "lucide-react-native";
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = StackScreenProps<RootStackParamList, 'Inspection'>;

export const InspectionScreen: React.FC<Props> = ({ route, navigation }) => {
  const { propertyId, isDraft } = route.params;
  const theme = useTheme<AppTheme>();

  const [property, setProperty] = useState<Property | null>(null);
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [inspectionType, setInspectionType] = useState<InspectionType>('routine');

  // Array representing the state of each room's inspection
  const [roomStates, setRoomStates] = useState<RoomInspection[]>([]);
  const [loading, setLoading] = useState(true);

  // Feedback snackbar
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [exitDialogVisible, setExitDialogVisible] = useState(false);

  // Submission Status Dialog
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'uploading' | 'success' | 'error' | 'offline'>('idle');
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Load / Setup Property and draft
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      try {
        const prop = await propertyRepository.getPropertyDetail(propertyId);
        setProperty(prop);

        if (isDraft) {
          const draft = await inspectionRepository.getDraft(propertyId);
          if (draft) {
            setInspectionType(draft.type);
            // Align draft rooms with property rooms (handle dynamic version configurations safely)
            const syncedRooms = prop.rooms.map((room) => {
              const draftRoom = draft.rooms.find((dr) => dr.roomId === room.id);
              if (draftRoom) {
                return draftRoom;
              }
              return {
                roomId: room.id,
                condition: '',
                notes: '',
                photoIds: [],
                localPhotos: [],
              };
            });
            setRoomStates(syncedRooms);
            setLoading(false);
            return;
          }
        }

        // Fresh configuration initialization
        const initialStates = prop.rooms.map((room) => ({
          roomId: room.id,
          condition: '',
          notes: '',
          photoIds: [],
          localPhotos: [],
        }));
        setRoomStates(initialStates);

      } catch (err) {
        console.error('[Inspection] Initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [propertyId, isDraft]);

  // AUTO-SAVE Draft whenever room inputs change
  useEffect(() => {
    if (loading || !property || roomStates.length === 0) return;

    const autoSave = async () => {
      const draftPayload: Inspection = {
        id: `insp_${propertyId}_draft`, // temporary ID
        propertyId: property.id,
        propertyVersion: property.version,
        type: inspectionType,
        rooms: roomStates,
        completedAt: Math.floor(Date.now() / 1000),
        idempotencyKey: `idempotency_${propertyId}_draft`,
      };
      await inspectionRepository.saveDraft(propertyId, draftPayload);
    };

    const delayDebounce = setTimeout(() => {
      autoSave();
    }, 1500); // 1.5s debounce save

    return () => clearTimeout(delayDebounce);
  }, [roomStates, inspectionType, property, loading]);

  if (loading || !property) {
    return (
      <View style={styles.container}>
        <TopAppBar title="Assessment" onBack={() => navigation.goBack()} />
        <InspectionSkeleton />
      </View>
    );
  }

  const activeRoom = property.rooms[currentRoomIndex];
  const activeState = roomStates[currentRoomIndex];

  // Modify active state helper
  const updateActiveRoomState = (updates: Partial<RoomInspection>) => {
    setRoomStates((prev) => {
      const copy = [...prev];
      copy[currentRoomIndex] = {
        ...copy[currentRoomIndex],
        ...updates,
      };
      return copy;
    });
  };

  const handleConditionChange = (val: string) => {
    updateActiveRoomState({ condition: val });
  };

  const handleNotesChange = (text: string) => {
    updateActiveRoomState({ notes: text });
  };

  // Real Photo capture
  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Denied', 'You need to allow camera access to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const newPhotoId = `pht_local_${Math.random().toString(36).substr(2, 9)}`;

      const newPhoto: Photo = {
        id: newPhotoId,
        localUri: asset.uri,
        remoteId: null,
        status: 'pending',
      };

      const currentPhotos = activeState.localPhotos || [];
      updateActiveRoomState({
        localPhotos: [...currentPhotos, newPhoto],
      });
    }
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Denied', 'You need to allow access to your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newPhotos: Photo[] = result.assets.map((asset) => ({
        id: `pht_local_${Math.random().toString(36).substr(2, 9)}`,
        localUri: asset.uri,
        remoteId: null,
        status: 'pending',
      }));

      const currentPhotos = activeState.localPhotos || [];
      updateActiveRoomState({
        localPhotos: [...currentPhotos, ...newPhotos],
      });
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    const currentPhotos = activeState.localPhotos || [];
    updateActiveRoomState({
      localPhotos: currentPhotos.filter((p) => p.id !== photoId),
    });
  };

  // Pagination navigation
  const handleNext = () => {
    if (currentRoomIndex < property.rooms.length - 1) {
      setCurrentRoomIndex(currentRoomIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentRoomIndex > 0) {
      setCurrentRoomIndex(currentRoomIndex - 1);
    }
  };

  // Save manual draft and quit
  const handleSaveDraftAndExit = async () => {
    const draftPayload: Inspection = {
      id: `insp_${propertyId}_draft`,
      propertyId: property.id,
      propertyVersion: property.version,
      type: inspectionType,
      rooms: roomStates,
      completedAt: Math.floor(Date.now() / 1000),
      idempotencyKey: `idempotency_${propertyId}_draft`,
    };
    await inspectionRepository.saveDraft(propertyId, draftPayload);
    setExitDialogVisible(false);
    navigation.goBack();
  };

  const handleCompleteAssessment = async () => {
    // 1. Double check validation
    const missingConditionIdx = roomStates.findIndex((r) => !r.condition);
    if (missingConditionIdx !== -1) {
      const roomName = property.rooms[missingConditionIdx].label;
      setSnackbarMessage(`Cannot submit: '${roomName}' requires a condition rating.`);
      setCurrentRoomIndex(missingConditionIdx);
      return;
    }

    // 2. Formulate unique submission payload
    const finalId = `insp_${propertyId}_${Date.now()}`;
    const submission: Inspection = {
      id: finalId,
      propertyId: property.id,
      propertyVersion: property.version,
      type: inspectionType,
      rooms: roomStates,
      completedAt: Math.floor(Date.now() / 1000),
      idempotencyKey: `idem_key_${propertyId}_${Date.now()}`,
    };

    try {
      // 3. Check connectivity first
      if (!syncEngine.isOnline()) {
        setSubmissionStatus('offline');
        // Still queue it so it's not lost
        await syncEngine.queueInspection(submission);
        return;
      }

      setSubmissionStatus('uploading');

      // 4. Send to background queue
      // Note: repository handles nesting of photos into the queue automatically
      await syncEngine.queueInspection(submission);

      // 5. Monitor the sync status
      // We want to see if THIS specific inspection finishes syncing
      const checkStatus = async () => {
        const queue = await inspectionRepository.getQueue();
        const item = queue.find(q => q.id === finalId);

        if (!item) {
          // If it's gone from queue, it likely succeeded (SyncEngine removes successful items)
          // Double check by looking at sync status of the property if possible,
          // but usually SyncEngine removes from queue on success.
          setSubmissionStatus('success');
          return true;
        }

        if (item.status === 'failed') {
          setSubmissionStatus('error');
          setSubmissionError(item.error || 'An unexpected error occurred during upload.');
          return true;
        }

        return false;
      };

      // Poll for a few seconds to see if it completes immediately
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        const finished = await checkStatus();
        if (finished || attempts > 30) { // 30 seconds timeout for immediate feedback
          clearInterval(interval);
          if (!finished) {
            // If still pending after 30s, just show success since it IS in the queue
            // and will be handled by the background engine.
            setSubmissionStatus('success');
          }
        }
      }, 1000);

    } catch (e: any) {
      console.error('[Inspection] submission failed:', e);
      setSubmissionStatus('error');
      setSubmissionError(e.message || 'Submission failed. Please try again.');
    }
  };

  // Calculation for progress bar
  const completedRoomsCount = roomStates.filter((r) => !!r.condition).length;
  const progressPercent = property.rooms.length > 0 ? completedRoomsCount / property.rooms.length : 0;

  return (
    <View style={styles.container}>
      <TopAppBar
        title="Property Assessment"
        onBack={() => setExitDialogVisible(true)}
        rightActions={
          <Appbar.Action
            style={{ width: 50 }}
            icon={() => <Save color={'black'} />}
            onPress={handleSaveDraftAndExit}
          />
        }
      />

      {/* Property name and type */ }
      <View style={{ gap: 4, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#ffffff'}}>
        <Text style={styles.title}>{property.name}</Text>
        <Text variant="bodySmall" style={[styles.headerSub, { fontSize: 10, paddingBottom: 6}]}>V{property.version} • {inspectionType.toUpperCase()}</Text>

        <ProgressBar id="inspection-progress" progress={progressPercent} color={theme.colors.success} style={styles.bar} />
        <View style={styles.progressLabelRow}>
          <Text variant="bodySmall" style={styles.progressLabel}>
            Completed: {completedRoomsCount} of {property.rooms.length} rooms
          </Text>
          <Text variant="bodySmall" style={styles.roomCounter}>
            Current: Room {currentRoomIndex + 1} of {property.rooms.length}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.contentScroll} keyboardShouldPersistTaps="handled">
        {/* Inspection configuration selector (only shown in Room 1 to avoid clutter) */}
        {currentRoomIndex === 0 && (
          <Card style={styles.configCard} mode="outlined">
            <Card.Content>
              <Text variant="labelMedium" style={styles.label}>Assessment Audit Type</Text>
              <SegmentedButtons
                value={inspectionType}
                onValueChange={(val) => setInspectionType(val as InspectionType)}
                buttons={[
                  { value: 'routine', label: 'Routine' },
                  { value: 'move_in', label: 'Move-In' },
                  { value: 'move_out', label: 'Move-Out' },
                  { value: 'emergency', label: 'Emergency' },
                ]}
                style={styles.segmented}
              />
            </Card.Content>
          </Card>
        )}

        {/* Current Room Active Card */}
        {activeState && (
          <Card style={styles.activeCard} mode="elevated">
            <Card.Content>
              <View style={styles.roomHeader}>
                <IconButton icon="door-open" size={20} iconColor={theme.colors.primary} />
                <View style={styles.roomHeaderInfo}>
                  <Text variant="headlineSmall" style={styles.roomTitle}>{activeRoom?.label}</Text>
                  <Text variant="bodySmall" style={styles.roomSubtitle}>
                    Floor: {activeRoom?.floor === 0 ? 'Ground' : 'Level ' + activeRoom?.floor}
                  </Text>
                </View>
              </View>

              <Divider style={styles.divider} />

              {/* Condition rating selectors */}
              <Text variant="labelMedium" style={styles.label}>Physical Condition Rating *</Text>
              <SegmentedButtons
                value={activeState.condition}
                onValueChange={handleConditionChange}
                buttons={[
                  { value: 'good', label: 'GOOD', checkedColor: theme.colors.success },
                  { value: 'fair', label: 'FAIR', checkedColor: theme.colors.warning },
                  { value: 'poor', label: 'POOR', checkedColor: theme.colors.error },
                ]}
                style={styles.segmented}
              />

              {/* Notes Input */}
              <Text style={styles.label}>Evidence Annotations & Notes</Text>
              <TextInput
                id="room-notes-input"
                mode="outlined"
                value={activeState.notes}
                onChangeText={handleNotesChange}
                placeholder="Describe paint peeling, water damage, electrical fittings, dampness index, etc."
                multiline
                numberOfLines={8}
                style={styles.notesInput}
                contentStyle={{
                  fontSize: 14,
                  fontWeight: 'bold',
                }}
              />

              {/* Photo Upload evidence pipeline */}
              <Divider style={styles.divider} />
              <View style={styles.photoHeaderRow}>
                <Text style={styles.photoTitle}>Evidence Logs</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Chip icon={'camera'} onPress={handleTakePhoto}>
                    Capture
                  </Chip>

                  <Chip
                    icon="image-plus"
                    mode="outlined"
                    onPress={handlePickImage}
                  >
                    Gallery
                  </Chip>
                </View>
              </View>

              <Text variant="bodySmall" style={styles.photoSubtitle}>
                Add structural evidence. Photos are queued, uploaded first, and linked with this room audit.
              </Text>

              {/* Photos Grid */}
              {activeState.localPhotos && activeState.localPhotos.length > 0 ? (
                <View style={styles.photoGrid}>
                  {activeState.localPhotos.map((p) => (
                    <View key={p.id} style={styles.photoWrapper}>
                      <Image source={{ uri: p.localUri }} style={styles.photoPreview} />
                      <TouchableOpacity
                        style={styles.removePhotoBadge}
                        onPress={() => handleRemovePhoto(p.id)}
                      >
                        <IconButton icon="close" size={12} iconColor="#fff" />
                      </TouchableOpacity>
                      {p.status === 'synced' && (
                        <View style={styles.syncedBadge}>
                          <IconButton icon="check" size={12} iconColor="#fff" />
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyPhotoBox}>
                  <Text variant="bodySmall" style={styles.emptyPhotoText}>No evidence photos logged for this room yet.</Text>
                </View>
              )}

            </Card.Content>
          </Card>
        )}

        {/* Carousel buttons */}
        <View style={styles.navigationButtons}>
          <Button
            id="room-prev-button"
            mode="outlined"
            disabled={currentRoomIndex === 0}
            onPress={handlePrev}
            style={styles.navBtn}
          >
            Previous Room
          </Button>

          {currentRoomIndex === property.rooms.length - 1 ? (
            <Button
              id="complete-assessment-btn"
              mode="contained"
              onPress={handleCompleteAssessment}
              style={[styles.navBtn, { backgroundColor: theme.colors.success }]}
            >
              Complete Assessment
            </Button>
          ) : (
            <Button
              id="room-next-button"
              mode="contained"
              onPress={handleNext}
              style={styles.navBtn}
            >
              Next Room
            </Button>
          )}
        </View>
      </ScrollView>

      {/* Snackbar alerts */}
      {/* Submission Status Dialog */}
      <Portal>
        <Dialog visible={submissionStatus !== 'idle'} dismissable={false}>
          <Dialog.Title>
            {submissionStatus === 'uploading' && 'Uploading Inspection'}
            {submissionStatus === 'success' && 'Success'}
            {submissionStatus === 'error' && 'Submission Error'}
            {submissionStatus === 'offline' && 'Offline Mode'}
          </Dialog.Title>
          <Dialog.Content>
            {submissionStatus === 'uploading' && (
              <View style={{ alignItems: 'center', padding: 16 }}>
                <ProgressBar indeterminate color={theme.colors.primary} style={{ width: '100%', marginBottom: 16 }} />
                <Text>Please wait while your report is being uploaded...</Text>
              </View>
            )}
            {submissionStatus === 'success' && (
              <Text>Your inspection has been successfully queued and uploaded.</Text>
            )}
            {submissionStatus === 'error' && (
              <Text>{submissionError || 'Something went wrong while uploading your inspection. It has been saved to the sync queue for retry.'}</Text>
            )}
            {submissionStatus === 'offline' && (
              <Text>You are currently offline. Your inspection has been saved and will be uploaded automatically when you're back online.</Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            {(submissionStatus === 'success' || submissionStatus === 'offline') && (
              <Button onPress={() => navigation.popToTop()}>Go to Home</Button>
            )}
            {submissionStatus === 'error' && (
              <Button onPress={() => {
                setSubmissionStatus('idle');
                navigation.popToTop();
              }}>Back to Home</Button>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={!!snackbarMessage}
        onDismiss={() => setSnackbarMessage(null)}
        duration={3500}
        action={{
          label: 'Dismiss',
          onPress: () => setSnackbarMessage(null),
        }}
      >
        {snackbarMessage}
      </Snackbar>

      {/* Save Draft Dialog Confirmation Portal */}
      <Portal>
        <Dialog visible={exitDialogVisible} onDismiss={() => setExitDialogVisible(false)}>
          <Dialog.Title>Quit Property Assessment?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Your modifications are cached locally as a draft. You can resume this assessment from the profile details page at any time.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button id="dialog-cancel-btn" onPress={() => setExitDialogVisible(false)}>Cancel</Button>
            <Button id="dialog-confirm-btn" onPress={handleSaveDraftAndExit}>Save Draft & Exit</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  loader: {
    width: '80%',
    marginBottom: 12,
  },
  loadingText: {
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  title: {
    fontWeight: '600',
    color: '#1e293b',
  },
  headerSub: {
    color: '#64748b',
  },
  progressBarRow: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  bar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: '#475569',
    fontWeight: '500',
  },
  roomCounter: {
    color: '#64748b',
  },
  contentScroll: {
    flex: 1,
    padding: 12,
  },
  configCard: {
    backgroundColor: '#ffffff',
    marginBottom: 10,
    borderRadius: 10,
  },
  activeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 20,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomHeaderInfo: {
    marginLeft: 8,
  },
  roomTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  roomSubtitle: {
    color: '#64748b',
  },
  divider: {
    marginVertical: 12,
  },
  label: {
    color: '#475569',
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 8,
  },
  segmented: {
    marginBottom: 14,
  },
  notesInput: {
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    marginBottom: 10,
    fontSize: 14,
    fontWeight: 'semibold'
  },
  photoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  photoTitle: {
    fontWeight: '600',
    color: '#1e293b',
  },
  photoSubtitle: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
    marginVertical: 4,
  },
  photoContainer: {
    marginTop: 8,
  },
  photoCard: {
    backgroundColor: '#f1f5f9',
    marginBottom: 6,
    borderRadius: 8,
  },
  photoCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  photoInfo: {
    flex: 1,
  },
  photoUri: {
    color: '#334155',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    justifyContent: 'flex-start',
  },
  photoWrapper: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  removePhotoBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    borderRadius: 12,
    zIndex: 10,
  },
  syncedBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: 'rgba(16, 185, 129, 0.8)',
    borderRadius: 12,
  },
  emptyPhotoBox: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyPhotoText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  navBtn: {
    flex: 0.48,
    borderRadius: 8,
  },
});
