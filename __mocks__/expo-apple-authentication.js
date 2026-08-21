module.exports = {
  isAvailableAsync: jest.fn().mockResolvedValue(false),
  signInAsync: jest.fn(),
  AppleAuthenticationButtonType: { SIGN_IN: 'SIGN_IN' },
  AppleAuthenticationButtonStyle: { BLACK: 'BLACK' },
  AppleAuthenticationScope: { EMAIL: 'EMAIL', FULL_NAME: 'FULL_NAME' },
  AppleAuthenticationButton: 'AppleAuthenticationButton',
};
