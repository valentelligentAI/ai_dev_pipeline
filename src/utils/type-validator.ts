import * as ts from 'typescript';
import * as fs from 'fs/promises';

export class TypeValidator {
    private program: ts.Program | null = null;
    private readonly compilerOptions: ts.CompilerOptions;

    constructor(compilerOptions: ts.CompilerOptions = {}) {
        this.compilerOptions = {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.CommonJS,
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            ...compilerOptions
        };
    }

    async validateFile(filePath: string): Promise<ts.Diagnostic[]> {
        try {
            // Ensure the file exists and is readable
            try {
                await fs.access(filePath);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'File does not exist';
                throw new Error(`Validation failed: ${message}`);
            }
            
            // Create or update the program
            this.createProgram(filePath);
            
            if (!this.program) {
                throw new Error('Validation failed: Failed to create TypeScript program');
            }

            const sourceFile = this.program.getSourceFile(filePath);
            if (!sourceFile) {
                throw new Error('Validation failed: Failed to load source file');
            }

            // Get all diagnostics
            const diagnostics = [
                ...this.getPreEmitDiagnostics(sourceFile),
                ...this.getDetailedDiagnostics(sourceFile)
            ];

            // Filter out duplicates and sort by position
            return this.processDiagnostics(diagnostics);
        } catch (error) {
            if (error instanceof Error) {
                // If the error already starts with 'Validation failed', pass it through
                if (error.message.startsWith('Validation failed')) {
                    throw error;
                }
                // Otherwise, wrap it in our standard format
                throw new Error(`Validation failed: ${error.message}`);
            }
            throw new Error('Validation failed: Unknown error occurred');
        }
    }

    private createProgram(filePath: string): void {
        const host = ts.createCompilerHost(this.compilerOptions);
        
        // Bind the original getSourceFile method to the host
        const boundGetSourceFile = host.getSourceFile.bind(host);
        
        // Use arrow function to maintain correct 'this' binding
        host.getSourceFile = (fileName: string, languageVersion: ts.ScriptTarget): ts.SourceFile | undefined => {
            const sourceFile = boundGetSourceFile(fileName, languageVersion);
            if (sourceFile) return sourceFile;

            // Handle virtual files for testing
            if (fileName === filePath) {
                const sourceText = ts.sys.readFile(fileName) || '';
                return ts.createSourceFile(fileName, sourceText, languageVersion);
            }
            return undefined;
        };

        this.program = ts.createProgram([filePath], this.compilerOptions, host);
    }

    private getPreEmitDiagnostics(sourceFile: ts.SourceFile): ts.Diagnostic[] {
        if (!this.program) return [];
        const diagnostics = ts.getPreEmitDiagnostics(this.program, sourceFile);
        return Array.from(diagnostics); // Convert readonly array to mutable
    }

    private getDetailedDiagnostics(sourceFile: ts.SourceFile): ts.Diagnostic[] {
        if (!this.program) return [];

        const semanticDiagnostics = this.program.getSemanticDiagnostics(sourceFile);
        const syntacticDiagnostics = this.program.getSyntacticDiagnostics(sourceFile);
        const customDiagnostics = this.analyzeSyntaxTree(sourceFile);

        return [
            ...semanticDiagnostics,
            ...syntacticDiagnostics,
            ...customDiagnostics
        ];
    }

    private analyzeSyntaxTree(sourceFile: ts.SourceFile): ts.Diagnostic[] {
        const diagnostics: ts.Diagnostic[] = [];

        const visit = (node: ts.Node): void => {
            // Check type assertions
            if (ts.isAsExpression(node)) {
                diagnostics.push(this.createDiagnostic(
                    sourceFile,
                    node,
                    'Unnecessary type assertion detected',
                    ts.DiagnosticCategory.Warning
                ));
            }

            // Check implicit any
            if (ts.isFunctionLike(node)) {
                node.parameters.forEach(param => {
                    if (!param.type) {
                        diagnostics.push(this.createDiagnostic(
                            sourceFile,
                            param,
                            'Parameter has implicit any type',
                            ts.DiagnosticCategory.Warning
                        ));
                    }
                });
            }

            ts.forEachChild(node, visit);
        };

        visit(sourceFile);
        return diagnostics;
    }

    private createDiagnostic(
        sourceFile: ts.SourceFile,
        node: ts.Node,
        message: string,
        category: ts.DiagnosticCategory
    ): ts.Diagnostic {
        return {
            file: sourceFile,
            start: node.getStart(),
            length: node.getWidth(),
            category,
            code: 9999, // Custom diagnostic code
            messageText: message
        };
    }

    private processDiagnostics(diagnostics: ts.Diagnostic[]): ts.Diagnostic[] {
        // Remove duplicates based on position and message
        const seen = new Set<string>();
        return diagnostics
            .filter(diagnostic => {
                const messageText = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
                const key = `${diagnostic.start}-${messageText}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a, b) => (a.start || 0) - (b.start || 0));
    }

    getDiagnosticMessage(diagnostic: ts.Diagnostic): string {
        if (diagnostic.file && diagnostic.start !== undefined) {
            const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
            const messageText = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            return `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${messageText}`;
        }
        return ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    }
}
