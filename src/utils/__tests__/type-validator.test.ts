import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { TypeValidator } from '../type-validator';

describe('TypeValidator', () => {
    const testDir = path.join(__dirname, '__temp__');
    let validator: TypeValidator;
    const testConfigPath = path.resolve(__dirname, '../../tsconfig.test.json');

    beforeAll(() => {
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
    });

    afterAll(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    beforeEach(() => {
        const compilerOptions = getTypeScriptConfig(testConfigPath);
        validator = new TypeValidator(compilerOptions);
    });

    const createTestFile = (content: string): string => {
        const filePath = path.join(testDir, `test-${Date.now()}.ts`);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, content);
        return filePath;
    };

    const createProgram = (files: string[]): ts.Program => {
        return ts.createProgram(files, {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.CommonJS,
            strict: true
        });
    };

    describe('file validation', () => {
        it('should detect type errors in source code', async () => {
            const filePath = path.resolve(__dirname, './test-files/invalid-code.ts');
            const result = await validator.validate([filePath]);

            expect(result[0].isValid).toBe(false);
            expect(result[0].diagnostics).toHaveLength(1);
            const messageText = ts.flattenDiagnosticMessageText(result[0].diagnostics[0]?.messageText ?? '', '\n');
            expect(messageText).toContain("Type 'string' is not assignable to type 'number'");
        });

        it('should validate correct type usage', () => {
            const filePath = createTestFile(`
                function add(a: number, b: number): number {
                    return a + b;
                }
            `);

            validator = new TypeValidator(createProgram([filePath]));
            const result = validator.validateFile(filePath);

            expect(result.isValid).toBe(true);
            expect(result.diagnostics).toHaveLength(0);
        });

        it('should detect implicit any usage', () => {
            const filePath = createTestFile(`
                function processData(data) { // Missing type annotation
                    return data.length;
                }
            `);

            validator = new TypeValidator(createProgram([filePath]));
            const result = validator.validateFile(filePath);

            expect(result.typeInfo.implicitAny).toBeGreaterThan(0);
        });
    });

    describe('type assertions', () => {
        it('should detect unnecessary type assertions', () => {
            const filePath = createTestFile(`
                const str: string = "hello";
                const redundant = str as string; // Unnecessary assertion
            `);

            validator = new TypeValidator(createProgram([filePath]));
            const result = validator.validateFile(filePath);

            expect(result.typeAssertions).toHaveLength(1);
            const suggestedFix = result.typeAssertions[0]?.suggestedFix ?? '';
            expect(suggestedFix).toBe('Remove unnecessary type assertion');
        });

        it('should suggest type guards for complex assertions', () => {
            const filePath = createTestFile(`
                interface User { name: string; }
                const data: any = { name: 'John' };
                const user = data as User; // Could use type guard
            `);

            validator = new TypeValidator(createProgram([filePath]));
            const result = validator.validateFile(filePath);

            expect(result.typeAssertions).toHaveLength(1);
            const suggestedFix = result.typeAssertions[0]?.suggestedFix ?? '';
            expect(suggestedFix).toBe('Consider using type guard instead of assertion');
        });
    });

    describe('error handling', () => {
        it('should handle missing files gracefully', () => {
            validator = new TypeValidator(createProgram([]));
            expect(() => validator.validateFile('non-existent.ts')).toThrow('File not found');
        });

        it('should handle invalid TypeScript syntax', () => {
            const filePath = createTestFile('invalid typescript code @#$%');

            validator = new TypeValidator(createProgram([filePath]));
            const result = validator.validateFile(filePath);

            expect(result.isValid).toBe(false);
            expect(result.diagnostics.length).toBeGreaterThan(0);
        });
    });

    describe('type compatibility', () => {
        it('should validate interface implementation', () => {
            const filePath = createTestFile(`
                interface Animal {
                    name: string;
                    makeSound(): void;
                }

                class Dog implements Animal {
                    // Missing name property
                    makeSound() { console.log('woof'); }
                }
            `);

            validator = new TypeValidator(createProgram([filePath]));
            const result = validator.validateFile(filePath);

            expect(result.isValid).toBe(false);
            expect(result.diagnostics).toHaveLength(1);
            const messageText = ts.flattenDiagnosticMessageText(result.diagnostics[0]?.messageText ?? '', '\n');
            expect(messageText).toContain("Property 'name' is missing");
        });

        it('should validate generic constraints', () => {
            const filePath = createTestFile(`
                interface HasLength {
                    length: number;
                }

                function getLength<T extends HasLength>(item: T): number {
                    return item.length;
                }

                getLength(42); // Error: number doesn't have length property
            `);

            validator = new TypeValidator(createProgram([filePath]));
            const result = validator.validateFile(filePath);

            expect(result.isValid).toBe(false);
            expect(result.diagnostics).toHaveLength(1);
            const messageText = ts.flattenDiagnosticMessageText(result.diagnostics[0]?.messageText ?? '', '\n');
            expect(messageText).toContain("Argument of type 'number' is not assignable");
        });
    });
});
