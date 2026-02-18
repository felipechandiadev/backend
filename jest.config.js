module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: [
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/test/**/*.spec.ts'
  ],
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: {
        allowJs: true,
      },
    }],
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/main.ts',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^jose$': '<rootDir>/test/mocks/jose.mock.ts',
  },
};
