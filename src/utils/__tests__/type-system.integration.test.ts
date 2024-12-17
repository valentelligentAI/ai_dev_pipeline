import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TypeValidator } from '../type-validator';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getTypeScriptConfig } from '../utils/get-tsconfig';

jest.mock('fs/promises');

describe('Type System Integration Tests', () => {
    const testConfigPath = path.resolve(__dirname, '../../tsconfig.test.json');
    const typeValidator = new TypeValidator(getTypeScriptConfig(testConfigPath));

    let validator: TypeValidator;
    const tempDir = path.join(__dirname, '__temp__');

    beforeEach(async () => {
        validator = new TypeValidator();
        jest.clearAllMocks();
        (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
        await fs.mkdir(tempDir, { recursive: true });
    });

    afterEach(async () => {
        (fs.rm as jest.Mock).mockResolvedValue(undefined);
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    describe('type validation and diagnostics', () => {
        it('should validate interface type mismatches', async () => {
            const testCode = `
                interface User {
                    id: number;
                    name: string;
                }
                
                const user: User = {
                    id: "123",  // Type error: string is not assignable to number
                    name: "John"
                };
            `;

            const testFile = path.join(tempDir, 'test.ts');
            (fs.readFile as jest.Mock).mockResolvedValue(testCode);
            (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

            const diagnostics = await validator.validateFile(testFile);
            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnostics[0]).toMatchObject({
                category: expect.any(Number),
                code: expect.any(Number),
                file: expect.any(Object),
                messageText: expect.stringContaining('Type')
            });
        });

        it('should validate generic type constraints', async () => {
            const testCode = `
                type ComplexType<T> = T extends Array<infer U> ? U : never;
                const value: ComplexType<string[]> = 42;  // Type error: number is not assignable to string
            `;

            const testFile = path.join(tempDir, 'test.ts');
            (fs.readFile as jest.Mock).mockResolvedValue(testCode);

            const diagnostics = await validator.validateFile(testFile);
            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnostics[0]).toMatchObject({
                category: expect.any(Number),
                messageText: expect.stringContaining('Type')
            });
        });

        it('should validate function return types', async () => {
            const testCode = `
                function processValue(value: string): number {
                    return value;  // Type error: string is not assignable to number
                }
            `;

            const testFile = path.join(tempDir, 'test.ts');
            (fs.readFile as jest.Mock).mockResolvedValue(testCode);

            const diagnostics = await validator.validateFile(testFile);
            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnostics[0]).toMatchObject({
                category: expect.any(Number),
                messageText: expect.stringContaining('Type')
            });
        });

        it('should handle multiple type errors in a single file', async () => {
            const testCode = `
                function process(value: number): string {
                    return value;  // Error 1
                }
                
                const x: string = 42;  // Error 2
            `;

            const testFile = path.join(tempDir, 'test.ts');
            (fs.readFile as jest.Mock).mockResolvedValue(testCode);

            const diagnostics = await validator.validateFile(testFile);
            expect(diagnostics.length).toBe(2);
        });

        it('should handle syntax errors gracefully', async () => {
            const testCode = `
                const x: string = 
                const y = 42;
            `;  // Syntax error

            const testFile = path.join(tempDir, 'test.ts');
            (fs.readFile as jest.Mock).mockResolvedValue(testCode);

            const diagnostics = await validator.validateFile(testFile);
            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnostics[0].category).toBe(1); // Syntax error category
        });

        it('should return no diagnostics for valid code', async () => {
            const code = `
                function add(a: number, b: number): number {
                    return a + b;
                }
            `;
            const result = typeSystem.analyzeCode(code);
            expect(result).toBeDefined();
            expect(result.diagnostics).toBeDefined();
            expect(result.diagnostics.length).toBe(0);
        });

        it('should detect syntax errors', async () => {
            const code = `
function test( {
    return 1;
}`;
            const filePath = path.resolve(__dirname, './test-files/syntax-error.ts');
            fs.writeFileSync(filePath, code);

            const diagnostics = await typeValidator.validate([filePath]);
            expect(diagnostics[0].diagnostics[0].category).toBe(1); // Syntax error category
        });

        it('should analyze valid code', async () => {
            const code = `
function test(a: number): number {
    return a * 2;
}`;
            const filePath = path.resolve(__dirname, './test-files/valid-code.ts');
            fs.writeFileSync(filePath, code);

            const result = await typeValidator.validate([filePath]);
            expect(result[0].isValid).toBe(true);
        });
    });
});
