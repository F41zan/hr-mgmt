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
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
          jsx: "react-jsx",
          esModuleInterop: true,
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
