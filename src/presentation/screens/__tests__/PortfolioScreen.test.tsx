import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { PortfolioScreen } from '../PortfolioScreen';
import { Provider as PaperProvider } from 'react-native-paper';
import { theme } from '../../theme';
import { getPropertiesUseCase } from '../../../app/di';

// Mock dependencies
jest.mock('../../../app/di', () => ({
  getPropertiesUseCase: {
    execute: jest.fn(),
  },
  authRepository: {
    logout: jest.fn(),
    getAgent: jest.fn().mockResolvedValue({ id: 'agt_1', displayName: 'Test Agent' }),
  },
  propertyRepository: {
    getCachedProperties: jest.fn().mockResolvedValue([]),
    getRecentlyViewed: jest.fn().mockResolvedValue([]),
  },
  inspectionRepository: {
    getDraft: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('../../../sync/SyncEngine', () => ({
  syncEngine: {
    isOnline: jest.fn(() => true),
    isEngineSyncing: jest.fn(() => false),
    subscribe: jest.fn(() => () => {}),
    subscribeNetwork: jest.fn(() => () => {}),
  },
}));

const mockNavigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <PaperProvider theme={theme}>
      {component}
    </PaperProvider>
  );
};

describe('PortfolioScreen', () => {
  it('renders properties correctly', async () => {
    const mockProperties = [
      { id: '1', name: 'Property 1', address: 'Address 1', status: 'active', region: 'central', version: 1, unitCount: 10 },
    ];
    (getPropertiesUseCase.execute as jest.Mock).mockResolvedValueOnce({ data: mockProperties, nextCursor: null });

    const { getByText } = renderWithProviders(
      <PortfolioScreen navigation={mockNavigation as any} route={{} as any} />
    );

    await waitFor(() => {
      expect(getByText('Property 1')).toBeTruthy();
      expect(getByText('Address 1')).toBeTruthy();
    });
  });

  it('shows empty state when no properties found', async () => {
    (getPropertiesUseCase.execute as jest.Mock).mockResolvedValueOnce({ data: [], nextCursor: null });

    const { getByText } = renderWithProviders(
      <PortfolioScreen navigation={mockNavigation as any} route={{} as any} />
    );

    await waitFor(() => {
      expect(getByText('No properties found')).toBeTruthy();
    });
  });
});
