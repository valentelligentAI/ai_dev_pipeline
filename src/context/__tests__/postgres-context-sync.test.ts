import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PostgresContextSynchronizer } from '../postgres-context-sync';
import { Pool, PoolClient, QueryResult } from 'pg';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Mock } from 'jest-mock';
import { AIContext } from '../types';

// Define types for database results
interface DBContext {
    project_name: string;
    project_version: string;
    project_description: string;
    project_repository: string;
    system_os: string;
    system_arch: string;
    system_env: string;
    system_processor_count: number;
    system_powershell: string;
    system_directory: string;
    system_env_vars: string;
    system_username: string;
    system_computer_name: string;
    system_working_dir: string;
    capabilities_database: boolean;
    capabilities_filesystem: boolean;
    capabilities_networking: boolean;
}

// Mock the fs module and pg Pool
jest.mock('fs/promises');
jest.mock('pg', () => {
    const mPool = {
        connect: jest.fn(),
        query: jest.fn(),
        end: jest.fn(),
    };
    return { Pool: jest.fn(() => mPool) };
});

describe('PostgresContextSynchronizer', () => {
    let synchronizer: PostgresContextSynchronizer;
    let mockClient: any;
    let pool: any;
    const testDir = path.join(__dirname, '__test__');
    const testFilePath = path.join(testDir, 'context.json');
    
    type MockedReadFile = Mock<(path: string, encoding: string) => Promise<string>>;

    const mockContext: AIContext = {
        system: {
            OS: 'Linux',
            Architecture: 'x86_64',
            Environment: 'test',
            ProcessorCount: 8,
            PowerShell: '7.3.0',
            SystemDirectory: '/usr/local/bin',
            EnvironmentVariables: {},
            UserName: 'testuser',
            ComputerName: 'testhost',
            WorkingDirectory: '/home/testuser'
        },
        project: {
            name: 'test-project',
            version: '1.0.0',
            description: 'Test Project',
            repository: 'https://github.com/test/project'
        },
        capabilities: {
            database: true,
            fileSystem: true,
            networking: true
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockClient = {
            query: jest.fn(),
            release: jest.fn()
        };
        pool = {
            connect: jest.fn(() => Promise.resolve(mockClient)),
            end: jest.fn()
        };
        synchronizer = new PostgresContextSynchronizer(pool);
        (fs.readFile as unknown as MockedReadFile).mockReset();
    });

    describe('loadAIContext', () => {
        it('should load context from file and sync with database', async () => {
            const dbContext: DBContext = {
                project_name: 'db-project',
                project_version: '2.0.0',
                project_description: 'DB Project',
                project_repository: 'https://github.com/db/project',
                system_os: 'Windows',
                system_arch: 'x64',
                system_env: 'production',
                system_processor_count: 4,
                system_powershell: '5.1',
                system_directory: 'C:\\Windows',
                system_env_vars: '{}',
                system_username: 'dbuser',
                system_computer_name: 'DBHOST',
                system_working_dir: 'C:\\Users\\dbuser',
                capabilities_database: true,
                capabilities_filesystem: true,
                capabilities_networking: true
            };

            (fs.readFile as unknown as MockedReadFile).mockImplementationOnce(
                async () => JSON.stringify(mockContext)
            );

            pool.query.mockImplementation(async () => {
                return {
                    rows: [dbContext],
                    rowCount: 1,
                    command: '',
                    oid: 0,
                    fields: []
                } as QueryResult<DBContext>;
            });

            const context = await synchronizer.loadAIContext();
            expect(context).toBeDefined();
            expect(pool.query).toHaveBeenCalled();
        });

        it('should handle database sync errors', async () => {
            (fs.readFile as unknown as MockedReadFile).mockImplementationOnce(
                async () => JSON.stringify(mockContext)
            );

            pool.query.mockImplementation(async () => {
                throw new Error('Database error');
            });

            await expect(synchronizer.loadAIContext()).rejects.toThrow('Database synchronization failed');
        });
    });

    describe('synchronizeContext', () => {
        it('should save context to database', async () => {
            (fs.readFile as unknown as MockedReadFile).mockImplementationOnce(
                async () => JSON.stringify(mockContext)
            );

            const mockClient: jest.Mocked<PoolClient> = {
                query: jest.fn().mockImplementation(async () => {
                    return {
                        rows: [],
                        rowCount: 0,
                        command: '',
                        oid: 0,
                        fields: []
                    } as QueryResult<DBContext>;
                }),
                release: jest.fn(),
            } as unknown as jest.Mocked<PoolClient>;

            pool.connect.mockImplementation(async () => mockClient);

            await synchronizer.synchronizeContext();

            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO ai_context'),
                expect.any(Array)
            );
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should handle database save errors', async () => {
            (fs.readFile as unknown as MockedReadFile).mockImplementationOnce(
                async () => JSON.stringify(mockContext)
            );

            mockClient.query.mockRejectedValueOnce(new Error('Database error'));

            await expect(synchronizer.synchronizeContext()).rejects.toThrow('Failed to save context to database');
            expect(mockClient.release).toHaveBeenCalled();
        });
    });
});
