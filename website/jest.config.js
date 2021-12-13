module.exports = {
  rootDir: './',
  preset: 'ts-jest',
  globals: {
    'ts-jest': {
      tsConfig: '<rootDir>/tsconfig.json',
    },
  },
  testMatch: ['**/__tests__/*.test.ts'],
  testEnvironment: 'jsdom',
};
