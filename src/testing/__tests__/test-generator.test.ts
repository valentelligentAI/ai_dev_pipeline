import { TestGenerator } from '../test-generator';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from '@typescript-eslint/parser';

jest.mock('@typescript-eslint/parser', () => ({
    parse: jest.fn().mockImplementation((code) => ({
        type: 'Program',
        body: [],
        sourceType: 'module',
        range: [0, code.length],
        loc: {
            start: { line: 1, column: 0 },
            end: { line: 1, column: code.length }
        }
    }))
}));

describe('TestGenerator', () => {
    const testDir = path.join(__dirname, '__temp__');
    let generator: TestGenerator;

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
        generator = new TestGenerator();
        (parse as jest.Mock).mockClear();
    });

    const createTestFile = (content: string): string => {
        const filePath = path.join(testDir, `test-${Date.now()}.ts`);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, content);
        return filePath;
    };

    describe('generateTests', () => {
        it('should parse TypeScript code successfully', async () => {
            const testCode = `
                function add(a: number, b: number): number {
                    return a + b;
                }
            `;
            const filePath = createTestFile(testCode);

            const result = await generator.generateTests(filePath);
            expect(result).toBeDefined();
            expect(parse).toHaveBeenCalledWith(testCode, expect.any(Object));
        });
    });
}); 