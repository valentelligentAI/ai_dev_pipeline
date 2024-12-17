import * as ts from 'typescript';
import * as fs from 'fs/promises';
import * as path from 'path';

export class TypeScriptDiagnostics {
    private readonly compilerOptions: ts.CompilerOptions;

    constructor(compilerOptions: ts.CompilerOptions = {}) {
        this.compilerOptions = {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.CommonJS,
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            noImplicitAny: true,
            strictNullChecks: true,
            ...compilerOptions
        };
    }

    async analyzeCodebase(files: string[]): Promise<Map<string, ts.Diagnostic[]>> {
        try {
            const results = new Map<string, ts.Diagnostic[]>();
            const program = await this.createProgram(files);

            for (const file of files) {
                const sourceFile = program.getSourceFile(file);
                if (!sourceFile) {
                    throw new Error(`File not found: ${file}`);
                }

                const diagnostics = await this.analyzeSingleFile(program, sourceFile);
                results.set(file, this.processDiagnostics(diagnostics));
            }

            return results;
        } catch (error) {
            throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async createProgram(files: string[]): Promise<ts.Program> {
        const host = this.createCompilerHost();
        return ts.createProgram(files, this.compilerOptions, host);
    }

    private createCompilerHost(): ts.CompilerHost {
        const host = ts.createCompilerHost(this.compilerOptions);
        const originalReadFile = host.readFile;

        host.readFile = (fileName: string) => {
            try {
                return originalReadFile(fileName);
            } catch (error) {
                console.warn(`Error reading file: ${fileName}`, error);
                return undefined;
            }
        };

        return host;
    }

    private async analyzeSingleFile(program: ts.Program, sourceFile: ts.SourceFile): Promise<ts.Diagnostic[]> {
        return [
            ...this.getCompilerDiagnostics(program, sourceFile),
            ...this.getCustomDiagnostics(sourceFile)
        ];
    }

    private getCompilerDiagnostics(program: ts.Program, sourceFile: ts.SourceFile): ts.Diagnostic[] {
        return [
            ...program.getSemanticDiagnostics(sourceFile),
            ...program.getSyntacticDiagnostics(sourceFile),
            ...program.getDeclarationDiagnostics(sourceFile)
        ];
    }

    private getCustomDiagnostics(sourceFile: ts.SourceFile): ts.Diagnostic[] {
        const diagnostics: ts.Diagnostic[] = [];

        const visitNode = (node: ts.Node): void => {
            // Type assertion checks
            if (ts.isTypeAssertion(node) || ts.isAsExpression(node)) {
                diagnostics.push(this.createDiagnostic(
                    sourceFile,
                    node,
                    'Unnecessary type assertion detected',
                    ts.DiagnosticCategory.Warning,
                    2352
                ));
            }

            // Function checks
            if (ts.isFunctionLike(node)) {
                // Parameter type checks
                node.parameters.forEach(param => {
                    if (!param.type) {
                        diagnostics.push(this.createDiagnostic(
                            sourceFile,
                            param,
                            'Parameter has implicit any type',
                            ts.DiagnosticCategory.Warning,
                            7006
                        ));
                    }
                });

                // Return type checks
                if (!node.type && !ts.isConstructorDeclaration(node)) {
                    diagnostics.push(this.createDiagnostic(
                        sourceFile,
                        node,
                        'Function lacks return type annotation',
                        ts.DiagnosticCategory.Warning,
                        7008
                    ));
                }
            }

            // Type mismatch checks
            if (ts.isReturnStatement(node) && node.expression) {
                const typeChecker = node.getSourceFile().languageVersion;
                if (typeChecker) {
                    // Add type checking logic here if needed
                }
            }

            ts.forEachChild(node, visitNode);
        };

        visitNode(sourceFile);
        return diagnostics;
    }

    private createDiagnostic(
        sourceFile: ts.SourceFile,
        node: ts.Node,
        message: string,
        category: ts.DiagnosticCategory,
        code: number
    ): ts.Diagnostic {
        return {
            file: sourceFile,
            start: node.getStart(),
            length: node.getEnd() - node.getStart(),
            category,
            code,
            messageText: message,
            source: 'ts-diagnostics'
        };
    }

    private processDiagnostics(diagnostics: ts.Diagnostic[]): ts.Diagnostic[] {
        // Remove duplicates and sort by position
        const seen = new Set<string>();
        return diagnostics
            .filter(diagnostic => {
                const key = `${diagnostic.start}-${diagnostic.messageText}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a, b) => (a.start || 0) - (b.start || 0));
    }

    formatDiagnostic(diagnostic: ts.Diagnostic): string {
        if (diagnostic.file) {
            const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
            return `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`;
        }
        return ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    }
}
