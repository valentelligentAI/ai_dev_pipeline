import { describe, it, expect, beforeEach } from '@jest/globals';
import { ContextSynchronizer } from '../context-sync';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Mock } from 'jest-mock';

// Properly type the mock
type MockedReadFile = Mock<(path: string, encoding: string) => Promise<string>>;

// Mock the fs module
jest.mock('fs/promises');

describe('ContextSynchronizer', () => {
    let synchronizer: ContextSynchronizer;
    const testDir = path.join(__dirname, '__test__');
    const testFilePath = path.join(testDir, 'context.json');

    beforeEach(() => {
        jest.clearAllMocks();
        synchronizer = new ContextSynchronizer(testFilePath);
        (fs.readFile as unknown as MockedReadFile).mockReset();
    });

    describe('loadAIContext', () => {
        it('should load and parse valid JSON context', async () => {
            const mockContext = {
                system: {
                    OS: 'Linux',
                    Architecture: 'x86_64',
                    Environment: 'test'
                }
            };

            (fs.readFile as unknown as MockedReadFile).mockImplementationOnce(
                async () => JSON.stringify(mockContext)
            );

            const context = await synchronizer.loadAIContext();
            expect(context).toEqual(mockContext);
        });

        it('should handle file not found error', async () => {
            (fs.readFile as unknown as MockedReadFile).mockImplementationOnce(
                async () => { throw new Error('File not found'); }
            );

            await expect(synchronizer.loadAIContext()).rejects.toThrow('File not found');
        });

        it('should handle invalid JSON', async () => {
            (fs.readFile as unknown as MockedReadFile).mockImplementationOnce(
                async () => 'invalid json'
            );

            await expect(synchronizer.loadAIContext()).rejects.toThrow(SyntaxError);
        });
    });

    describe('synchronizeContext', () => {
        it('should synchronize context successfully', async () => {
            const mockContext = {
                system: {
                    OS: 'Linux',
                    Architecture: 'x86_64',
                    Environment: 'test'
                }
            };

            (fs.readFile as unknown as MockedReadFile).mockImplementationOnce(
                async () => JSON.stringify(mockContext)
            );

            await expect(synchronizer.synchronizeContext()).resolves.not.toThrow();
        });

        it('should handle synchronization errors', async () => {
            (fs.readFile as unknown as MockedReadFile).mockImplementationOnce(
                async () => { throw new Error('Sync failed'); }
            );

            await expect(synchronizer.synchronizeContext()).rejects.toThrow('Sync failed');
        });
    });

    describe('validateContext', () => {
        it('should validate correct context structure', async () => {
            const mockContext = {
                system: {
                    OS: 'Linux',
                    Architecture: 'x86_64',
                    Environment: 'test'
                }
            };

            (fs.readFile as unknown as MockedReadFile).mockImplementationOnce(
                async () => JSON.stringify(mockContext)
            );

            const context = await synchronizer.loadAIContext();
            expect(context.system).toBeDefined();
            expect(context.system.OS).toBeDefined();
            expect(context.system.Architecture).toBeDefined();
            expect(context.system.Environment).toBeDefined();
        });

        it('should reject invalid context structure', async () => {
            const invalidContext = {
                system: {
                    OS: 'Linux'
                    // Missing required fields
                }
            };

            (fs.readFile as unknown as MockedReadFile).mockImplementationOnce(
                async () => JSON.stringify(invalidContext)
            );

            await expect(synchronizer.loadAIContext()).rejects.toThrow();
        });
    });
});
