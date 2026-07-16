import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme, Divider } from 'react-native-paper';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: any;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#e2e8f0',
          opacity,
        },
        style,
      ]}
    />
  );
};

export const PropertyCardSkeleton = () => {
  return (
    <View style={skeletonStyles.card}>
      <Skeleton height={100} borderRadius={12} style={{ marginBottom: 12 }} />
      <Skeleton width="60%" height={16} style={{ marginBottom: 8 }} />
      <Skeleton width="40%" height={9} style={{ marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Skeleton width={80} height={20} borderRadius={16} />
        <Skeleton width={80} height={20} borderRadius={16} />
      </View>
    </View>
  );
};

export const DetailSkeleton = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: 6 }}>
      <View style={skeletonStyles.card}>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <Skeleton width={80} height={24} borderRadius={12} />
          <Skeleton width={100} height={24} borderRadius={12} />
        </View>
        <Skeleton width="80%" height={32} style={{ marginBottom: 8 }} />
        <Skeleton width="60%" height={20} style={{ marginBottom: 20 }} />
        <Divider style={{ marginVertical: 16 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ width: '45%' }}>
            <Skeleton width="80%" height={14} style={{ marginBottom: 4 }} />
            <Skeleton width="40%" height={24} />
          </View>
          <View style={{ width: '45%' }}>
            <Skeleton width="80%" height={14} style={{ marginBottom: 4 }} />
            <Skeleton width="40%" height={24} />
          </View>
        </View>
      </View>

      <Skeleton width="40%" height={24} style={{ marginTop: 24, marginBottom: 16, marginLeft: 4 }} />

      {[1, 2, 3].map(i => (
        <View key={i} style={[skeletonStyles.card, { padding: 12, marginBottom: 8 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Skeleton width={40} height={40} borderRadius={20} />
            <View style={{ flex: 1 }}>
              <Skeleton width="50%" height={18} style={{ marginBottom: 4 }} />
              <Skeleton width="80%" height={14} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

export const InspectionSkeleton = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <Skeleton height={4} width="100%" borderRadius={0} style={{ marginBottom: 16 }} />
      <View style={{ padding: 16 }}>
        <Skeleton width="40%" height={18} style={{ marginBottom: 16 }} />
        <Skeleton width="100%" height={48} borderRadius={24} style={{ marginBottom: 24 }} />

        <View style={skeletonStyles.card}>
          <Skeleton width="30%" height={24} style={{ marginBottom: 12 }} />
          <Skeleton width="60%" height={16} style={{ marginBottom: 20 }} />

          <Skeleton width="100%" height={120} borderRadius={8} style={{ marginBottom: 16 }} />

          <Skeleton width="100%" height={100} borderRadius={8} style={{ marginBottom: 20 }} />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Skeleton width={80} height={80} borderRadius={8} />
            <Skeleton width={80} height={80} borderRadius={8} />
          </View>
        </View>
      </View>
    </View>
  );
};

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 6,
    marginBottom: 6,
    elevation: 2,
  },
});
