// Mock for next/navigation in Jest environment
export const redirect = jest.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
export const unauthorized = jest.fn(() => {
  throw new Error("NEXT_UNAUTHORIZED");
});
export const forbidden = jest.fn(() => {
  throw new Error("NEXT_FORBIDDEN");
});
export const useRouter = jest.fn(() => ({
  push: jest.fn(),
  refresh: jest.fn(),
}));
export const useSearchParams = jest.fn(() => ({ get: jest.fn() }));
export const usePathname = jest.fn(() => "/");
