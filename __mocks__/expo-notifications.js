module.exports = {
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test]' }),
  setNotificationHandler: jest.fn(),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue(undefined),
  addNotificationResponseListener: jest.fn(() => ({ remove: jest.fn() })),
  removeNotificationSubscription: jest.fn(),
};
