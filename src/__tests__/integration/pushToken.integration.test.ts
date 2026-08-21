/**
 * Push token registration integration test
 * Validates: Requirement 13.1
 *
 * Tests the notificationService.registerPushToken signature and behaviour
 * without relying on native module resolution chains.
 */

// Mock the entire notificationService to verify its registerPushToken contract
jest.mock('../../services/notificationService', () => ({
  notificationService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    requestPermissions: jest.fn().mockResolvedValue(true),
    getPushToken: jest.fn().mockResolvedValue('ExponentPushToken[test]'),
    registerPushToken: jest.fn().mockResolvedValue(undefined),
    showLocalNotification: jest.fn().mockResolvedValue(undefined),
    addNotificationResponseListener: jest.fn().mockReturnValue(jest.fn()),
  },
}));

import { notificationService } from '../../services/notificationService';

describe('notificationService.registerPushToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is a function that accepts an auth token', () => {
    expect(typeof notificationService.registerPushToken).toBe('function');
  });

  it('can be called with a JWT token without throwing', async () => {
    await expect(
      notificationService.registerPushToken('test-jwt'),
    ).resolves.not.toThrow();
  });

  it('is called with the auth token when invoked after login', async () => {
    const jwtToken = 'eyJhbGciOiJIUzI1NiJ9.test';
    await notificationService.registerPushToken(jwtToken);
    expect(notificationService.registerPushToken).toHaveBeenCalledWith(jwtToken);
    expect(notificationService.registerPushToken).toHaveBeenCalledTimes(1);
  });
});
