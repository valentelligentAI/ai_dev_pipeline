import * as fs from 'fs/promises';
import { parse } from '@babel/parser';
import { Program } from '@babel/types';
import traverse from '@babel/traverse';
import { Node, FunctionDeclaration, TSInterfaceDeclaration, TSTypeAnnotation, Identifier, TSType, TSPropertySignature } from '@babel/types';

interface TestCase {
    name: string;
    type: 'function' | 'class' | 'interface';
    params?: string[];
    returnType?: string;
}

export class TestGenerator {
    public async generateTests(filePath: string): Promise<string> {
        try {
            const code = await fs.readFile(filePath, 'utf-8');
            const ast = parse(code, {
                sourceType: 'module',
                plugins: ['typescript', 'decorators-legacy'],
                tokens: true
            });

            const testCases = this.analyzeAST(ast as unknown as Program);
            return this.generateTestCode(testCases, filePath);
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('ENOENT')) {
                    throw new Error('File not found');
                }
                throw new Error(`Failed to generate tests: ${error.message}`);
            }
            throw error;
        }
    }

    private analyzeAST(ast: Program): TestCase[] {
        const testCases: TestCase[] = [];

        traverse(ast, {
            FunctionDeclaration(path) {
                const func = path.node;
                if (func.id) {
                    testCases.push({
                        name: func.id.name,
                        type: 'function',
                        params: func.params.map(param => 
                            'name' in param ? String(param.name) : 'unknown'
                        ),
                        returnType: func.returnType ? 'returnType' : undefined
                    });
                }
            },

            ClassDeclaration(path) {
                const classNode = path.node;
                if (classNode.id) {
                    testCases.push({
                        name: classNode.id.name,
                        type: 'class'
                    });
                }
            },

            InterfaceDeclaration(path) {
                const interfaceNode = path.node;
                testCases.push({
                    name: interfaceNode.id.name,
                    type: 'interface'
                });
            }
        });

        return testCases;
    }

    private generateTestCode(testCases: TestCase[], filePath: string): string {
        const fileName = filePath.split('/').pop()?.replace('.ts', '') || 'unknown';
        let testCode = `import { describe, it, expect } from 'jest';\n\n`;

        testCases.forEach(testCase => {
            testCode += this.generateTestCaseCode(testCase);
        });

        // If no test cases were found, generate a basic test structure
        if (testCases.length === 0) {
            testCode += `describe('${fileName}', () => {
    it('should work correctly', () => {
        expect(true).toBe(true);
    });
});\n`;
        }

        return testCode;
    }

    private generateTestCaseCode(testCase: TestCase): string {
        switch (testCase.type) {
            case 'function':
                return this.generateFunctionTest(testCase);
            case 'class':
                return this.generateClassTest(testCase);
            case 'interface':
                return this.generateInterfaceTest(testCase);
            default:
                return '';
        }
    }

    private generateFunctionTest(testCase: TestCase): string {
        return `describe('${testCase.name}', () => {
    it('should work correctly', () => {
        ${testCase.params?.length ? '// Parameters: ' + testCase.params.join(', ') : ''}
        expect(${testCase.name}).toBeDefined();
    });
});\n\n`;
    }

    private generateClassTest(testCase: TestCase): string {
        return `describe('${testCase.name}', () => {
    it('should be instantiable', () => {
        const instance = new ${testCase.name}();
        expect(instance).toBeInstanceOf(${testCase.name});
    });
});\n\n`;
    }

    private generateInterfaceTest(testCase: TestCase): string {
        return `describe('${testCase.name}', () => {
    it('should validate interface implementation', () => {
        // Add implementation test here
        expect(true).toBe(true);
    });
});\n\n`;
    }

    private extractFunctions(ast: Node): any[] {
        const functions: any[] = [];
        traverse(ast, {
            FunctionDeclaration(path: { node: FunctionDeclaration }) {
                const { id, params, returnType } = path.node;
                const functionData = {
                    name: (id as Identifier).name,
                    params: params.map(param => ({
                        name: (param as Identifier).name,
                        type: ((param as any).typeAnnotation as TSTypeAnnotation)?.typeAnnotation.type
                    })),
                    returnType: (returnType as TSTypeAnnotation)?.typeAnnotation.type
                };
                functions.push(functionData);
            }
        });
        return functions;
    }

    private extractInterfaces(ast: Node): any[] {
        const interfaces: any[] = [];
        traverse(ast, {
            TSInterfaceDeclaration(path: { node: TSInterfaceDeclaration }) {
                const { id, body } = path.node;
                const interfaceData = {
                    name: id.name,
                    properties: body.body.map((prop: any) => ({
                        name: (prop.key as Identifier).name,
                        type: (prop.typeAnnotation.typeAnnotation as TSType).type
                    }))
                };
                interfaces.push(interfaceData);
            }
        });
        return interfaces;
    }

    private generateTestCode(functions: any[], interfaces: any[]): string {
        let testCode = `
import { describe, it, expect } from 'jest';

`;

        // Generate test cases for each function
        functions.forEach(fn => {
            testCode += this.generateFunctionTest(fn);
        });

        // Generate test cases for each interface
        interfaces.forEach(iface => {
            testCode += this.generateInterfaceTest(iface);
        });

        return testCode;
    }

    private generateFunctionTest(fn: any): string {
        let testCode = `
describe('${fn.name}', () => {
    it('should work correctly', () => {`;

        // Generate assertions based on parameters
        fn.params.forEach((param: any) => {
            testCode += `
        // Assertions for ${param.name} of type ${param.type}`;
        });

        // Generate assertions based on return type
        testCode += `
        // Assertions for return type ${fn.returnType}
    });
});
`;
        return testCode;
    }

    private generateInterfaceTest(iface: any): string {
        let testCode = `
describe('${iface.name}', () => {
    it('should validate properly', () => {
        const obj: ${iface.name} = {`;

        // Create an object that matches the interface
        iface.properties.forEach((prop: any) => {
            testCode += `
            ${prop.name}: /* appropriate value based on ${prop.type} */,`;
        });

        testCode += `
        };
        // Assertions to validate the object
    });
});
`;
        return testCode;
    }
}
