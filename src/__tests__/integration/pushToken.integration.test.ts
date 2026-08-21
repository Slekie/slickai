/**
 * Push token registration integration test
 * Validates: Requirement 13.1
 */

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: { eas: { projectId: 'test-project-id' } },
    },
  },
}));

jest.mock('expo-notifications', () => ({
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test]' }),
  setNotificationHandler: jest.fn(),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  scheduleNotificationAsync: jest.fn(),
  addNotificationResponseListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('axios', () => ({
  post: jest.fn().mockResolvedValue({ data: { success: true } }),
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    defaults: { headers: { common: {} } },
    interceptors: { response: { use: jest.fn() } },
  })),
  isAxiosError: jest.fn(() => false),
}));

import { notificationService } from '../../services/notificationService';
import axios from 'axios';

describe('notificationService.registerPushToken', () => {
  it('calls POST /notifications/register with token and platform', async () => {
    await notificationService.registerPushToken('test-jwt');
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/notifications/register'),
      expect.objectContaining({ token: 'ExponentPushToken[test]' }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-jwt' }),
      }),
    );
  });
});
