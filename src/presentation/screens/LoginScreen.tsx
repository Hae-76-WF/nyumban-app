

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import {Button, TextInput, Text, Card, HelperText, useTheme, IconButton} from 'react-native-paper';
import { loginUseCase } from '../../app/di';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = StackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await loginUseCase.execute(email.trim(), password);
      navigation.replace('Portfolio');
    } catch (err: any) {
      const msg = err?.data?.error || err?.message || 'Login failed. Please check credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.cardContent}>
          <View style={styles.header}>
            <Text variant="headlineLarge" style={[styles.title, { color: theme.colors.primary }]}>
              NYUMBAN
            </Text>
            <Text variant="titleMedium" style={styles.subtitle}>
              Property Assessment Inspector
            </Text>
          </View>

          <TextInput
            id="login-email-input"
            testID="login-email-input"
            label="Email Address"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError(null);
            }}
            mode="outlined"
            autoCapitalize="none"
            keyboardType="email-address"
            disabled={loading}
            style={styles.input}
            contentStyle={{ fontSize: 15, fontWeight: 'bold'}}
          />

          <TextInput
            id="login-password-input"
            testID="login-password-input"
            label="Inspector Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError(null);
            }}
            contentStyle={{ fontSize: 15, fontWeight: 'bold'}}
            mode="outlined"
            secureTextEntry={!showPassword}
            disabled={loading}
            style={styles.input}
            right={<TextInput.Icon icon={
              ()=> <IconButton iconColor={'black'} icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />
            } />}
          />

          {error && (
            <HelperText type="error" visible={!!error} style={styles.errorText}>
              {error}
            </HelperText>
          )}

          <Button
            id="login-submit-button"
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.button}
            labelStyle={styles.buttonLabel}
          >
            Sign In To Workspace
          </Button>

          <Text variant="bodySmall" style={styles.footer}>
            Offline access enabled. Your inspections and photos are saved locally and will sync when you have a connection.
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  card: {
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    elevation: 4,
  },
  cardContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 4,
  },
  subtitle: {
    color: '#64748b',
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  button: {
    marginTop: 10,
    borderRadius: 8,
    paddingVertical: 4,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  demoButton: {
    marginTop: 12,
    borderRadius: 8,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 14,
  },
  footer: {
    marginTop: 30,
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
  },
});
