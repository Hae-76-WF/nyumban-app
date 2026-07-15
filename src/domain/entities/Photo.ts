

export interface Photo {
  id: string; // client UUID
  localUri: string;
  remoteId: string | null; // server pht_...
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  error?: string;
}
