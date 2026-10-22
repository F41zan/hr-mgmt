import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  preset: "ts-jest",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^server-only$": "<rootDir>/__mocks__/server-only.ts",
    "^next/headers$": "<rootDir>/__mocks__/next-headers.ts",
    "^next/navigation$": "<rootDir>/__mocks__/next-navigation.ts",
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  // jose v6 is ESM-only, so it is compiled to CommonJS like our own code
  transformIgnorePatterns: ["/node_modules/(?!jose/)"],
  transform: {
    "^.+\\.[tj]sx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
          jsx: "react-jsx",
          esModuleInterop: true,
          allowJs: true,
          paths: {
            "@/*": ["./*"],
          },
        },
      },
    ],
  },
  testTimeout: 15000,
};

export default config;
