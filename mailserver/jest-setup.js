// Tests run with NODE_ENV=test, where config refuses to boot without a real
// JWT_SECRET; provide one before any module loads config.
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-jest-only";

jest.setTimeout(30000);
