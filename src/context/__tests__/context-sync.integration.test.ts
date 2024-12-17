import { describe, it, expect, beforeEach } from '@jest/globals';
import { ContextSynchronizer } from '../context-sync';
import * as fs from 'fs/promises';
import * as path from 'path';

jest.mock('fs/promises');

describe('ContextSynchronizer Integration', () => {
    let synchronizer: ContextSynchronizer;
    const testDir = path.join(__dirname, '__test__');
    const testFilePath = path.join(testDir, 'context.json');
    
    const validJsonContent = JSON.stringify({
        system: {
            OS: 'Linux',
            Architecture: 'x86_64',
            Environment: 'Production'
        }
    });

    beforeEach(() => {
        synchronizer = new ContextSynchronizer(testFilePath);
        jest.clearAllMocks();
        (fs.readFile as jest.Mock).mockReset();
    });

    it('should load and parse valid JSON context', async () => {
        (fs.readFile as jest.Mock).mockResolvedValue(validJsonContent);
        
        const context = await synchronizer.loadAIContext();
        expect(context).toBeDefined();
        expect(context.system.OS).toBe('Linux');
        expect(context.system.Architecture).toBe('x86_64');
        expect(context.system.Environment).toBe('Production');
    });

    it('should handle invalid JSON content', async () => {
        (fs.readFile as jest.Mock).mockResolvedValue('invalid json content');
        
        await expect(synchronizer.loadAIContext()).rejects.toThrow(SyntaxError);
    });

    it('should handle file read errors', async () => {
        (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
        
        await expect(synchronizer.loadAIContext()).rejects.toThrow('File not found');
    });

    it('should synchronize context successfully', async () => {
        (fs.readFile as jest.Mock).mockResolvedValue(validJsonContent);
        
        await expect(synchronizer.synchronizeContext()).resolves.not.toThrow();
    });

    it('should handle synchronization failures', async () => {
        (fs.readFile as jest.Mock).mockRejectedValue(new Error('Synchronization failed'));
        
        await expect(synchronizer.synchronizeContext()).rejects.toThrow('Synchronization failed');
    });

    it('should validate context structure', async () => {
        const invalidContext = JSON.stringify({
            system: {
                // Missing required fields
                OS: 'Linux'
            }
        });
        
        (fs.readFile as jest.Mock).mockResolvedValue(invalidContext);
        
        await expect(synchronizer.loadAIContext()).rejects.toThrow(/Invalid context/);
    });

    it('should handle empty or null context', async () => {
        (fs.readFile as jest.Mock).mockResolvedValue('null');
        
        await expect(synchronizer.loadAIContext()).rejects.toThrow(/Invalid context/);
    });
});
