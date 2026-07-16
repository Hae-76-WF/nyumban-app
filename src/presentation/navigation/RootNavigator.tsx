import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { LoginScreen } from '../screens/LoginScreen';
import { PortfolioScreen } from '../screens/PortfolioScreen';
import { DetailScreen } from '../screens/DetailScreen';
import { InspectionScreen } from '../screens/InspectionScreen';

export type RootStackParamList = {
  Login: undefined;
  Portfolio: undefined;
  Detail: { propertyId: string };
  Inspection: { propertyId: string; isDraft: boolean };
};

const Stack = createStackNavigator<RootStackParamList>();

export const RootNavigator = ({ initialRouteName }: { initialRouteName?: keyof RootStackParamList }) => {
  return (
    <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Portfolio" component={PortfolioScreen} />
      <Stack.Screen name="Detail" component={DetailScreen} />
      <Stack.Screen name="Inspection" component={InspectionScreen} />
    </Stack.Navigator>
  );
};
