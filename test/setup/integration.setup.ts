// Global setup for integration tests
import 'reflect-metadata';
import 'dotenv/config';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'fincore_test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_USER = 'test';
process.env.DB_PASS = 'test';

// Global test timeout for integration tests
jest.setTimeout(30000);

// Global teardown
afterAll(async () => {
  // Clean up any global resources if needed
});
