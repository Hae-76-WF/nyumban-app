import 'react-native-gesture-handler/jestSetup';

// Mock Animated
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock Async Storage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Global mock for Animated to prevent timer leaks
jest.mock('react-native/Libraries/Animated/animations/TimingAnimation', () => {
  return class MockTimingAnimation {
    constructor(config) {
      this.config = config;
    }
    start(callback) {
      if (typeof callback === 'function') callback({ finished: true });
    }
    stop() {}
  };
});
