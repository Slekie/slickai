/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|socket\\.io-client)',
  ],
  moduleNameMapper: {
    '^expo-apple-authentication$': '<rootDir>/__mocks__/expo-apple-authentication.js',
    '^react-native-purchases$': '<rootDir>/__mocks__/react-native-purchases.js',
    '^@react-native-community/netinfo$': '<rootDir>/__mocks__/@react-native-community/netinfo.js',
  },
  moduleDirectories: ['node_modules', 'src'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
};
