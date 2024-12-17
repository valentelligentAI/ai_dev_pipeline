import { TypeScriptDiagnostics } from '../typescript-diagnostics';
import { resolve } from 'path';
import * as fs from 'fs';
import { getTypeScriptConfig } from '../utils/type-system';

describe('TypeScriptDiagnostics', () => {
    let diagnostics: TypeScriptDiagnostics;
    const testConfigPath = resolve(__dirname, '../../tsconfig.test.json');
    const testFilesPath = resolve(__dirname, './test-files');

    beforeEach(() => {
        const compilerOptions = getTypeScriptConfig(testConfigPath);
        diagnostics = new TypeScriptDiagnostics(compilerOptions);
    });

    describe('codebase analysis', () => {
        it('should analyze TypeScript files and detect type errors', async () => {
            const results = await diagnostics.analyzeCodebase([testFilesPath]);
            const result = results.get(resolve(testFilesPath, 'invalid-code.ts')) || [];

            expect(result.length).toBeGreaterThan(0);
            expect(result[0]).toBeDefined();
            expect(result[0]?.messageText).toContain("Type 'string' is not assignable to type 'number'");
        });

        it('should detect unnecessary type assertions', async () => {
            const testFilePath = resolve(__dirname, 'temp-test.ts');
            fs.writeFileSync(testFilePath, `
                const str: string = "hello";
                const redundant = str as string; // Unnecessary assertion
            `);

            try {
                const results = await diagnostics.analyzeCodebase();
                const result = results.get(testFilePath);

                expect(result).toBeDefined();
                if (!result) throw new Error('Result should be defined');
                expect(result.typeInfo.unnecessaryTypeAssertions).toBeGreaterThan(0);
            } finally {
                if (fs.existsSync(testFilePath)) {
                    fs.unlinkSync(testFilePath);
                }
            }
        });

        it('should detect implicit any usage', async () => {
            const testFilePath = resolve(__dirname, 'temp-test.ts');
            fs.writeFileSync(testFilePath, `
                function processData(data) { // Missing type annotation
                    return data.length;
                }
            `);

            try {
                const results = await diagnostics.analyzeCodebase();
                const result = results.get(testFilePath);

                expect(result).toBeDefined();
                if (!result) throw new Error('Result should be defined');
                expect(result.typeInfo.implicitAny).toBeGreaterThan(0);
            } finally {
                if (fs.existsSync(testFilePath)) {
                    fs.unlinkSync(testFilePath);
                }
            }
        });
    });

    describe('function analysis', () => {
        it('should analyze function declarations', async () => {
            const testFilePath = resolve(__dirname, 'temp-test.ts');
            fs.writeFileSync(testFilePath, `
                async function getData(): Promise<string> {
                    return "data";
                }

                function processItem<T>(item: T): void {
                    console.log(item);
                }
            `);

            try {
                const results = await diagnostics.analyzeCodebase();
                const result = results.get(testFilePath);

                expect(result).toBeDefined();
                if (!result) throw new Error('Result should be defined');
                expect(result.functions).toHaveLength(2);
                
                const [getData, processItem] = result.functions;
                
                expect(getData).toMatchObject({
                    name: 'getData',
                    returnType: 'Promise<string>',
                    async: true
                });

                expect(processItem).toMatchObject({
                    name: 'processItem',
                    returnType: 'void',
                    async: false
                });
            } finally {
                if (fs.existsSync(testFilePath)) {
                    fs.unlinkSync(testFilePath);
                }
            }
        });
    });

    describe('report generation', () => {
        it('should generate analysis report', async () => {
            const testFilePath = resolve(__dirname, 'temp-test.ts');
            fs.writeFileSync(testFilePath, `
                function example(x: any) { // Implicit any parameter
                    const str: string = "hello";
                    return str as string; // Unnecessary assertion
                }
            `);

            try {
                const results = await diagnostics.analyzeCodebase();
                const reportPath = 'type-analysis-test-report.json';
                
                diagnostics.generateReport(results, reportPath);

                const reportFile = resolve(process.cwd(), 'reports', reportPath);
                expect(fs.existsSync(reportFile)).toBe(true);

                const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
                expect(report.summary).toBeDefined();
                expect(report.fileResults).toBeDefined();
                expect(Array.isArray(report.fileResults)).toBe(true);

                // Clean up report
                if (fs.existsSync(reportFile)) {
                    fs.unlinkSync(reportFile);
                }
            } finally {
                if (fs.existsSync(testFilePath)) {
                    fs.unlinkSync(testFilePath);
                }
            }
        });
    });

    describe('error handling', () => {
        it('should handle invalid TypeScript files', async () => {
            const testFilePath = resolve(__dirname, 'temp-test.ts');
            fs.writeFileSync(testFilePath, 'let x: number = "string";'); // Invalid TypeScript code

            try {
                const results = await diagnostics.analyzeCodebase();
                const result = results.get(testFilePath);

                // Assert result exists
                expect(result).toBeDefined();
                
                // Type guard
                if (!result) {
                    return; // This satisfies TypeScript, expect above will fail if undefined
                }

                // Assert errors exist and have expected content
                expect(result.errors).toHaveLength(1);
                expect(result.errors[0]?.message).toContain("Type 'string' is not assignable to type 'number'");
                
            } finally {
                if (fs.existsSync(testFilePath)) {
                    fs.unlinkSync(testFilePath);
                }
            }
        });

        it('should handle missing files gracefully', async () => {
            const results = await diagnostics.analyzeCodebase();
            expect(results).toBeDefined();
            expect(results instanceof Map).toBe(true);
        });
    });
});
