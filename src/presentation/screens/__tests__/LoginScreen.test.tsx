import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../LoginScreen';
import { Provider as PaperProvider } from 'react-native-paper';
import { theme } from '../../theme';
import { loginUseCase } from '../../../app/di';

// Mock navigation
const mockNavigation = {
  replace: jest.fn(),
};

// Mock loginUseCase
jest.mock('../../../app/di', () => ({
  loginUseCase: {
    execute: jest.fn(),
  },
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <PaperProvider theme={theme}>
      {component}
    </PaperProvider>
  );
};

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders correctly', async () => {
    const { getByText, getByTestId } = renderWithProviders(
      <LoginScreen navigation={mockNavigation as any} route={{} as any} />
    );

    await waitFor(() => {
      expect(getByText('NYUMBAN')).toBeTruthy();
      expect(getByTestId('login-email-input')).toBeTruthy();
      expect(getByTestId('login-password-input')).toBeTruthy();
    });
  });

  it('shows error if fields are empty', async () => {
    const { getByText } = renderWithProviders(
      <LoginScreen navigation={mockNavigation as any} route={{} as any} />
    );

    const signInButton = getByText('Sign In To Workspace');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('Please fill in both email and password.')).toBeTruthy();
    });
  });

  it('calls loginUseCase and navigates on success', async () => {
    (loginUseCase.execute as jest.Mock).mockResolvedValueOnce({});
    const { getByText, getByTestId } = renderWithProviders(
      <LoginScreen navigation={mockNavigation as any} route={{} as any} />
    );

    fireEvent.changeText(getByTestId('login-email-input'), 'test@test.com');
    fireEvent.changeText(getByTestId('login-password-input'), 'password123');
    fireEvent.press(getByText('Sign In To Workspace'));

    await waitFor(() => {
      expect(loginUseCase.execute).toHaveBeenCalledWith('test@test.com', 'password123');
      expect(mockNavigation.replace).toHaveBeenCalledWith('Portfolio');
    });
  });
});
