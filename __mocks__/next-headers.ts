// Mock for next/headers in Jest environment
export const cookies = jest.fn().mockResolvedValue({
  get: jest.fn().mockReturnValue(undefined),
  set: jest.fn(),
  delete: jest.fn(),
  has: jest.fn().mockReturnValue(false),
});
