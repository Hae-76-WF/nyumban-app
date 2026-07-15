import React, { useState, useEffect } from 'react';
import {StyleSheet, Animated, StatusBar, Platform, View} from 'react-native';
import {Banner, Text, useTheme} from 'react-native-paper';
import { syncEngine } from '../../sync/SyncEngine';
import { Wifi, WifiOff } from 'lucide-react-native';

export const NetworkBanner: React.FC = () => {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const [isOnline, setIsOnline] = useState(syncEngine.isOnline());
  const [firstLoad, setFirstLoad] = useState(true);

  useEffect(() => {
    const unsubscribe = syncEngine.subscribeNetwork((online) => {
      if (firstLoad) {
        setIsOnline(online);
        setFirstLoad(false);
        return;
      }

      setIsOnline(online);
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
      }, 6000);

      return () => clearTimeout(timer);
    });

    unsubscribe();
  }, [firstLoad]);

  return (
    <Banner
      visible={visible}
      icon={({ size }) => (
        isOnline ?
          <Wifi size={20} color={theme.colors.primary} /> :
          <WifiOff size={20} color={theme.colors.error} />
      )}
      style={[
        styles.banner,
        { backgroundColor: isOnline ? '#f0fdf4' : '#fef2f2',
          paddingTop: Platform.OS == "android" && visible ? StatusBar.currentHeight : 0 }
      ]}
    >
      <View style={{ flexDirection: 'row', flex: 1, alignItems: 'center', justifyContent: 'space-between'}}>
        <Text style={{ flex: 1}}>
          {isOnline ? 'You are back online. Syncing pending data...' : 'You are offline. Changes will be saved locally.'}
        </Text>
        <Text onPress={() => setVisible(false)} style={{ color: theme.colors.secondary, fontSize: 16, fontWeight: 'bold' }}>
          Ok
        </Text>
      </View>

    </Banner>
  );
};

const styles = StyleSheet.create({
  banner: {
    elevation: 4,
    zIndex: 100,
  },
});
