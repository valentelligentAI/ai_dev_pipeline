import * as fs from 'fs/promises';
import { AIContext } from './types';

export class ContextSynchronizer {
    constructor(private readonly contextPath: string = './ai-context.json') {}

    async loadAIContext(): Promise<AIContext> {
        const data = await fs.readFile(this.contextPath, 'utf-8');
        const context = JSON.parse(data) as unknown;
        this.validateContext(context);
        return context as AIContext;
    }

    async synchronizeContext(): Promise<void> {
        await this.loadAIContext();
        // Additional synchronization logic here
    }

    private validateContext(context: unknown): asserts context is AIContext {
        if (!context || typeof context !== 'object') {
            throw new Error('Invalid context: must be an object');
        }

        if (!('system' in context) || !context.system || typeof context.system !== 'object') {
            throw new Error('Invalid context: missing system information');
        }

        const system = context.system as Record<string, unknown>;
        const requiredFields = ['OS', 'Architecture', 'Environment'];
        
        for (const field of requiredFields) {
            if (!(field in system) || typeof system[field] !== 'string') {
                throw new Error(`Invalid context: missing or invalid system.${field}`);
            }
        }
    }
}
