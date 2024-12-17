import { Pool, QueryResult } from 'pg';
import { DatabaseClient } from '../../src/database/client';
import { getPool, testConnection } from '../../src/database/config';
import { MigrationManager } from '../../src/database/migrations/MigrationManager';
import { testConfig } from '../../src/database/__tests__/test-utils';
import { initializeDatabase, resetDatabase } from '../init-database';
import { DatabaseError } from '../../src/database/errors';
import { EventEmitter } from 'events';

// Mock external modules
jest.mock('../../src/database/client');
jest.mock('../../src/database/config');
jest.mock('../../src/database/migrations/MigrationManager');

const createMockQueryResult = (): QueryResult => ({
    rows: [],
    rowCount: 0,
    command: '',
    oid: 0,
    fields: []
});

// Create a proper mock Pool class that extends EventEmitter
class MockPool extends EventEmitter implements Partial<Pool> {
    public readonly totalCount = 0;
    public readonly idleCount = 0;
    public readonly waitingCount = 0;
    public readonly expiredCount = 0;
    public readonly ending = false;
    public readonly ended = false;
    public options = {
        max: 10,
        maxUses: 0,
        allowExitOnIdle: false,
        maxLifetimeSeconds: 0,
        idleTimeoutMillis: 0
    };

    public query: jest.MockedFunction<Pool['query']> = jest.fn().mockResolvedValue(createMockQueryResult());
    public end = jest.fn();
    public connect = jest.fn();
}

describe('Database Initialization', () => {
    let mockPool: MockPool;
    let mockDbClient: jest.Mocked<DatabaseClient>;
    let mockMigrationManager: jest.Mocked<MigrationManager>;
    let mockExit: jest.SpyInstance;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock process.exit
        mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: number) => {
            throw new Error(`Process exit with code: ${code}`);
        });

        // Create new mock pool instance
        mockPool = new MockPool();

        // Mock DatabaseClient
        mockDbClient = {
            initializeSchema: jest.fn(),
            close: jest.fn(),
        } as unknown as jest.Mocked<DatabaseClient>;
        (DatabaseClient.getInstance as jest.Mock).mockReturnValue(mockDbClient);

        // Mock getPool
        (getPool as jest.Mock).mockReturnValue(mockPool);

        // Mock MigrationManager
        mockMigrationManager = {
            loadMigrations: jest.fn(),
            applyMigrations: jest.fn(),
            getCurrentVersion: jest.fn().mockResolvedValue('002'),
        } as unknown as jest.Mocked<MigrationManager>;
        (MigrationManager as unknown as jest.Mock).mockImplementation(() => mockMigrationManager);

        // Mock successful connection by default
        (testConnection as jest.Mock).mockResolvedValue(true);
    });

    afterEach(() => {
        mockExit.mockRestore();
        jest.resetModules();
    });

    describe('Normal Initialization', () => {
        it('should successfully initialize database with all steps', async () => {
            await initializeDatabase();

            // Verify connection was tested
            expect(testConnection).toHaveBeenCalled();

            // Verify schema was initialized
            expect(mockDbClient.initializeSchema).toHaveBeenCalled();

            // Verify migrations were handled
            expect(mockMigrationManager.loadMigrations).toHaveBeenCalled();
            expect(mockMigrationManager.applyMigrations).toHaveBeenCalled();
            expect(mockMigrationManager.getCurrentVersion).toHaveBeenCalled();

            // Verify default data was created
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO analysis_strategies'),
                expect.any(Array)
            );

            // Verify performance thresholds were set
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO performance_thresholds'),
                expect.any(Array)
            );

            // Verify cleanup
            expect(mockDbClient.close).toHaveBeenCalled();
        });

        it('should handle existing data gracefully', async () => {
            // Mock queries to simulate existing data
            mockPool.query.mockImplementation(async () => createMockQueryResult());

            await initializeDatabase();

            // Verify ON CONFLICT DO NOTHING worked
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('ON CONFLICT'),
                expect.any(Array)
            );
        });
    });

    describe('Error Handling', () => {
        it('should throw if database connection fails', async () => {
            (testConnection as jest.Mock).mockResolvedValue(false);

            const expectedError = new DatabaseError(
                'Failed to connect to PostgreSQL. Please check your connection settings.',
                'CONNECTION_ERROR'
            );
            await expect(initializeDatabase())
                .rejects
                .toMatchObject({
                    message: expectedError.message,
                    code: expectedError.code
                });
        });

        it('should throw if database connection throws', async () => {
            const connectionError = new DatabaseError(
                'Connection error occurred',
                'CONNECTION_ERROR'
            );
            (testConnection as jest.Mock).mockRejectedValue(connectionError);

            await expect(initializeDatabase())
                .rejects
                .toMatchObject({
                    message: connectionError.message,
                    code: connectionError.code
                });
        });

        it('should throw on schema initialization failure', async () => {
            const schemaError = new DatabaseError(
                'Schema initialization failed',
                'SCHEMA_ERROR'
            );
            mockDbClient.initializeSchema.mockRejectedValue(schemaError);

            await expect(initializeDatabase())
                .rejects
                .toMatchObject({
                    message: schemaError.message,
                    code: schemaError.code
                });
        });

        it('should throw on migration failure', async () => {
            const migrationError = new DatabaseError(
                'Migration failed',
                'MIGRATION_ERROR'
            );
            mockMigrationManager.applyMigrations.mockRejectedValue(migrationError);

            await expect(initializeDatabase())
                .rejects
                .toMatchObject({
                    message: migrationError.message,
                    code: migrationError.code
                });
        });
    });

    describe('Reset Functionality', () => {
        it('should properly reset database', async () => {
            await resetDatabase();

            // Verify reset queries were executed
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('DROP SCHEMA public CASCADE;'),
                []
            );
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('CREATE SCHEMA public;'),
                []
            );
        });

        it('should throw on reset failure', async () => {
            const resetError = new DatabaseError('Reset failed', 'RESET_ERROR');
            mockPool.query.mockImplementationOnce(() => Promise.reject(resetError));

            await expect(resetDatabase())
                .rejects
                .toMatchObject({
                    message: resetError.message,
                    code: resetError.code
                });
        });

        it('should handle full reset and initialization', async () => {
            await resetDatabase();
            await initializeDatabase();

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('DROP SCHEMA'),
                []
            );
            expect(mockDbClient.initializeSchema).toHaveBeenCalled();
            expect(mockMigrationManager.applyMigrations).toHaveBeenCalled();
        });
    });

    describe('Integration with Config', () => {
        it('should use correct database config', async () => {
            await initializeDatabase();
            expect(getPool).toHaveBeenCalledWith(expect.objectContaining({
                database: testConfig.database,
                host: testConfig.host,
                port: testConfig.port
            }));
        });

        it('should respect environment variables', async () => {
            const originalEnv = process.env;
            process.env = {
                ...originalEnv,
                POSTGRES_HOST: 'custom-host',
                POSTGRES_PORT: '5433',
                POSTGRES_DB: 'custom-db'
            };

            await initializeDatabase();
            expect(getPool).toHaveBeenCalledWith(expect.objectContaining({
                host: 'custom-host',
                port: 5433,
                database: 'custom-db'
            }));

            process.env = originalEnv;
        });
    });

    describe('Performance Monitoring', () => {
        it('should handle concurrent operations', async () => {
            const operations = [
                initializeDatabase(),
                initializeDatabase()
            ];
            await expect(Promise.all(operations)).rejects.toThrow();
        });
    });

    describe('Cleanup Handling', () => {
        it('should close connections on failure', async () => {
            mockDbClient.initializeSchema.mockRejectedValue(new Error('Schema init failed'));
            await expect(initializeDatabase()).rejects.toThrow();
            expect(mockDbClient.close).toHaveBeenCalled();
        });

        it('should clean up resources even after migration failure', async () => {
            mockMigrationManager.applyMigrations.mockRejectedValue(
                new DatabaseError('Migration failed', 'MIGRATION_ERROR')
            );
            await expect(initializeDatabase()).rejects.toThrow();
            expect(mockDbClient.close).toHaveBeenCalled();
        });
    });
});
