const NetInfo = {
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
};
module.exports = NetInfo;
module.exports.default = NetInfo;
