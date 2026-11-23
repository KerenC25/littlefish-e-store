/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  // Full-app integration tests (axe scans, typing a whole checkout form) exceed Jest's 5 s
  // default, and shared CI runners can be several times slower than a laptop.
  testTimeout: 60000,
  setupFiles: ['<rootDir>/src/test/polyfills.ts'],
  // Stand-ins for the values Vite `define` injects at build time. Sign-up is on in tests;
  // individual tests switch it off by blanking these.
  globals: {
    __LFM_SUPABASE_URL__: 'https://test-project.supabase.co',
    __LFM_SUPABASE_ANON_KEY__: 'test-anon-key',
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/setupTests.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          target: 'ES2020',
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'commonjs',
          moduleResolution: 'node',
          esModuleInterop: true,
          isolatedModules: true,
          strict: true,
          skipLibCheck: true,
          types: ['jest', '@testing-library/jest-dom'],
        },
        diagnostics: { ignoreCodes: ['TS151001'] },
      },
    ],
  },
  moduleNameMapper: {
    '\\.(css|less|scss)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/main.tsx', '!src/test/**', '!src/**/*.d.ts'],
};
