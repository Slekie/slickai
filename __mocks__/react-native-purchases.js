module.exports = {
  configure: jest.fn(),
  getOfferings: jest.fn().mockResolvedValue({ all: {}, current: null }),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
  getCustomerInfo: jest.fn(),
  LOG_LEVEL: { DEBUG: 'DEBUG', INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR' },
  setLogLevel: jest.fn(),
};
