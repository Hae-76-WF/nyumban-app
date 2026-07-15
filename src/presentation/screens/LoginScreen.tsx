

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Button, TextInput, Text, Card, HelperText, useTheme } from 'react-native-paper';
import { loginUseCase } from '../../app/di';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await loginUseCase.execute(email.trim(), password);
      onLoginSuccess();
    } catch (err: any) {
      const msg = err?.data?.error || err?.message || 'Login failed. Please check credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('agent@nyumban.test');
    setPassword('Kireka2026!');
    setError(null);
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
          />

          <TextInput
            id="login-password-input"
            label="Inspector Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError(null);
            }}
            mode="outlined"
            secureTextEntry
            disabled={loading}
            style={styles.input}
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

          <Button
            id="demo-credentials-button"
            mode="outlined"
            onPress={handleFillDemo}
            disabled={loading}
            style={styles.demoButton}
          >
            1-Click Demo Login
          </Button>

          <Text variant="bodySmall" style={styles.footer}>
            Offline-first database activated. Assessments and photo logs will cache securely on your device.
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
