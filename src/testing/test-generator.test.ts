import { describe, it, expect, beforeEach } from '@jest/globals';
import * as fs from 'fs/promises';
import { TestGenerator } from './test-generator';

jest.mock('fs/promises');

describe('TestGenerator', () => {
    let generator: TestGenerator;

    beforeEach(() => {
        jest.clearAllMocks();
        generator = new TestGenerator();
    });

    it('should generate a test file with proper structure', async () => {
        const mockSourceCode = `
            function add(a: number, b: number): number {
                return a + b;
            }
        `;
        
        (fs.readFile as jest.Mock).mockResolvedValue(mockSourceCode);
        
        const result = await generator.generateTests('add.ts');
        
        expect(result).toContain('describe');
        expect(result).toContain('it');
        expect(result).toContain('add');
    });

    it('should handle empty source files', async () => {
        (fs.readFile as jest.Mock).mockResolvedValue('');
        
        const result = await generator.generateTests('empty.ts');
        
        expect(result).toContain('import { describe, it, expect } from \'jest\';');
    });

    it('should properly parse function parameters', async () => {
        const mockSourceCode = `
            function multiply(x: number, y: number): number {
                return x * y;
            }
        `;
        
        (fs.readFile as jest.Mock).mockResolvedValue(mockSourceCode);
        
        const result = await generator.generateTests('multiply.ts');
        
        expect(result).toContain('multiply');
        expect(result).toContain('should work correctly');
    });

    it('should handle async functions', async () => {
        const mockSourceCode = `
            async function fetchData(): Promise<string> {
                return 'data';
            }
        `;
        
        (fs.readFile as jest.Mock).mockResolvedValue(mockSourceCode);
        
        const result = await generator.generateTests('async.ts');
        
        expect(result).toContain('fetchData');
        expect(result).toContain('should work correctly');
    });

    it('should handle interface definitions', async () => {
        const mockSourceCode = `
            interface TestInterface {
                prop1: string;
                prop2: number;
            }
            
            function processInterface(data: TestInterface): string {
                return data.prop1;
            }
        `;
        
        (fs.readFile as jest.Mock).mockResolvedValue(mockSourceCode);
        
        const result = await generator.generateTests('interface.ts');
        
        expect(result).toContain('processInterface');
        expect(result).toContain('should work correctly');
    });

    it('should handle errors gracefully', async () => {
        (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
        
        await expect(generator.generateTests('nonexistent.ts')).rejects.toThrow('File not found');
    });
}); 