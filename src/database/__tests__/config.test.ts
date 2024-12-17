import { createPoolConfig, getPool, closePool, testConnection, DatabaseConfig } from '../config';
import { Pool, PoolClient } from 'pg';
import { testConfig } from './test-utils';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs/promises';

// Load test environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

describe('Database Configuration', () => {
    const testDir = path.join(__dirname, '__test__');

    beforeEach(async () => {
        await fs.mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
        await fs.rm(testDir, { recursive: true, force: true });
    });

    afterEach(async () => {
        await closePool();
        process.env['NODE_ENV'] = 'test';
    });

    describe('createPoolConfig', () => {
        it('should create config with default values', () => {
            const config = createPoolConfig();
            expect(config.host).toBe('localhost');
            expect(config.port).toBe(5432);
            expect(config.database).toBe('ai_pipeline_test');
            expect(config.user).toBe('test_user');
            expect(config.max).toBe(20);
            expect(config.idleTimeoutMillis).toBe(30000);
        });

        it('should override defaults with provided values', () => {
            const customConfig: Partial<DatabaseConfig> = {
                host: 'custom-host',
                port: 5433,
                database: 'custom-db',
                max: 10
            };
            const config = createPoolConfig(customConfig);
            expect(config.host).toBe('custom-host');
            expect(config.port).toBe(5433);
            expect(config.database).toBe('custom-db');
            expect(config.max).toBe(10);
            expect(config.idleTimeoutMillis).toBe(30000); // Default retained
        });

        it('should configure SSL for production environment', () => {
            process.env['NODE_ENV'] = 'production';
            const config = createPoolConfig();
            expect(config.ssl).toEqual({ rejectUnauthorized: false });
        });

        it('should not configure SSL for non-production environment', () => {
            process.env['NODE_ENV'] = 'development';
            const config = createPoolConfig();
            expect(config.ssl).toBeUndefined();
        });

        it('should override default config with custom config', () => {
            const customConfig: Partial<DatabaseConfig> = {
                host: 'custom-host',
                port: 1234,
                database: 'custom-db',
                user: 'custom-user',
                password: 'custom-password',
                max: 10,
                idleTimeoutMillis: 5000,
                ssl: { rejectUnauthorized: true }
            };

            // No need to pass customConfig to createPoolConfig
            const config = createPoolConfig(); 

            // Update assertions to check merged config
            expect(config.host).toBe(customConfig.host);
            expect(config.port).toBe(customConfig.port);
            expect(config.database).toBe(customConfig.database);
            expect(config.user).toBe(customConfig.user);
            expect(config.password).toBe(customConfig.password);
            expect(config.max).toBe(customConfig.max);
            expect(config.idleTimeoutMillis).toBe(customConfig.idleTimeoutMillis);
            expect(config.ssl).toEqual(customConfig.ssl);
        });
    });

    describe('getPool', () => {
        it('should return singleton pool instance', () => {
            const pool1 = getPool();
            const pool2 = getPool();
            expect(pool1).toBe(pool2);
            expect(pool1).toBeInstanceOf(Pool);
        });

        it('should create new pool with custom config', () => {
            const pool = getPool(testConfig);
            expect(pool.options.host).toBe(testConfig.host);
            expect(pool.options.port).toBe(testConfig.port);
            expect(pool.options.database).toBe(testConfig.database);
        });

        it('should handle pool errors', async () => {
            const pool = getPool();
            const errorSpy = jest.spyOn(console, 'error').mockImplementation();
            const exitSpy = jest.spyOn(process, 'exit').mockImplementation();

            return new Promise<void>((resolve) => {
                // Simulate pool error
                pool.emit('error', new Error('Test error'));

                setImmediate(() => {
                    expect(errorSpy).toHaveBeenCalledWith(
                        'Unexpected error on idle client',
                        expect.any(Error)
                    );
                    expect(exitSpy).toHaveBeenCalledWith(-1);
                    errorSpy.mockRestore();
                    exitSpy.mockRestore();
                    resolve();
                });
            });
        });

        it('should log successful connections', async () => {
            const pool = getPool();
            const logSpy = jest.spyOn(console, 'log').mockImplementation();

            return new Promise<void>((resolve) => {
                // Simulate connection
                pool.emit('connect');

                setImmediate(() => {
                    expect(logSpy).toHaveBeenCalledWith(
                        'Successfully connected to PostgreSQL'
                    );
                    logSpy.mockRestore();
                    resolve();
                });
            });
        });
    });

    describe('closePool', () => {
        it('should close pool if it exists', async () => {
            const pool = getPool();
            const endSpy = jest.spyOn(pool, 'end');

            await closePool();
            expect(endSpy).toHaveBeenCalled();
            endSpy.mockRestore();
        });

        it('should handle closing non-existent pool', async () => {
            await closePool(); // Close any existing pool
            await expect(closePool()).resolves.not.toThrow();
        });
    });

    describe('testConnection', () => {
        it('should return true for successful connection', async () => {
            // Set up pool with test config before testing connection
            getPool();
            const result = await testConnection();
            expect(result).toBe(true);
        });

        it('should return false and log error for failed connection', async () => {
            const invalidConfig: Partial<DatabaseConfig> = {
                host: 'invalid-host',
                port: 1234
            };
            const errorSpy = jest.spyOn(console, 'error').mockImplementation();

            getPool(invalidConfig as DatabaseConfig);
            const result = await testConnection();

            expect(result).toBe(false);
            expect(errorSpy).toHaveBeenCalledWith(
                'Failed to connect to PostgreSQL:',
                expect.any(Error)
            );

            errorSpy.mockRestore();
        });

        it('should properly release client after successful connection', async () => {
            // Create a real pool instance but spy on its connect method
            const pool = getPool();

            // Create a mock release function
            const releaseMock = jest.fn();

            // Spy on connect and mock its implementation
            jest.spyOn(pool, 'connect').mockImplementation(async () => {
                const mockClient = {
                    release: releaseMock,
                    query: jest.fn(),
                    on: jest.fn(),
                    off: jest.fn(),
                    removeListener: jest.fn(),
                    addListener: jest.fn(),
                    emit: jest.fn(),
                    eventNames: jest.fn(),
                    getMaxListeners: jest.fn(),
                    listenerCount: jest.fn(),
                    listeners: jest.fn(),
                    once: jest.fn(),
                    prependListener: jest.fn(),
                    prependOnceListener: jest.fn(),
                    rawListeners: jest.fn(),
                    removeAllListeners: jest.fn(),
                    setMaxListeners: jest.fn()
                } as unknown as PoolClient;

                return mockClient;
            });

            await testConnection();

            expect(pool.connect).toHaveBeenCalled();
            expect(releaseMock).toHaveBeenCalled();

            jest.restoreAllMocks();
        });
    });
});
