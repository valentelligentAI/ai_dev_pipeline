import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { getPool, closePool, DatabaseConfig } from './config';

export class DatabaseClient {
    private static instance: DatabaseClient;
    private pool: Pool;

    private constructor(config: Partial<DatabaseConfig> = {}) {
        this.pool = getPool(config);
    }

    public static getInstance(config: Partial<DatabaseConfig> = {}): DatabaseClient {
        if (!DatabaseClient.instance) {
            DatabaseClient.instance = new DatabaseClient(config);
        }
        return DatabaseClient.instance;
    }

    /**
     * Initialize the database schema
     */
    public async initializeSchema(): Promise<void> {
        try {
            const schemaPath = path.join(__dirname, 'schema.sql');
            const schema = await fs.promises.readFile(schemaPath, 'utf8');
            await this.pool.query(schema);
        } catch (error) {
            console.error('Failed to initialize database schema:', error);
            throw error;
        }
    }

    /**
     * Save a diagnostic context to the database
     */
    public async saveDiagnosticContext(context: {
        filePath: string;
        cursor?: Record<string, unknown>;
        projectStructure: Record<string, unknown>;
        environmentInfo: Record<string, unknown>;
        systemContext: Record<string, unknown>;
        capabilities: Record<string, unknown>;
    }): Promise<number> {
        const query = `
            INSERT INTO diagnostic_contexts 
            (file_path, cursor, project_structure, environment_info, system_context, capabilities)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `;
        const values = [
            context.filePath,
            context.cursor || null,
            context.projectStructure,
            context.environmentInfo,
            context.systemContext,
            context.capabilities
        ];

        try {
            const result = await this.pool.query(query, values);
            return result.rows[0].id;
        } catch (error) {
            console.error('Failed to save diagnostic context:', error);
            throw error;
        }
    }

    /**
     * Save an analysis result to the database
     */
    public async saveAnalysisResult(result: {
        contextId: number;
        strategyId?: number;
        confidence: number;
        findings: Record<string, unknown>;
        nextSteps?: Record<string, unknown>;
        metadata?: Record<string, unknown>;
    }): Promise<number> {
        const query = `
            INSERT INTO analysis_results 
            (context_id, strategy_id, confidence, findings, next_steps, metadata)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `;
        const values = [
            result.contextId,
            result.strategyId || null,
            result.confidence,
            result.findings,
            result.nextSteps || null,
            result.metadata || null
        ];

        try {
            const result = await this.pool.query(query, values);
            return result.rows[0].id;
        } catch (error) {
            console.error('Failed to save analysis result:', error);
            throw error;
        }
    }

    /**
     * Log a context event
     */
    public async logContextEvent(event: {
        contextId: number;
        type: 'sync' | 'validation' | 'error';
        status: 'success' | 'failure';
        details?: string;
    }): Promise<void> {
        const query = `
            INSERT INTO context_events 
            (context_id, type, status, details)
            VALUES ($1, $2, $3, $4)
        `;
        const values = [
            event.contextId,
            event.type,
            event.status,
            event.details || null
        ];

        try {
            await this.pool.query(query, values);
        } catch (error) {
            console.error('Failed to log context event:', error);
            throw error;
        }
    }

    /**
     * Get the latest diagnostic context for a file
     */
    public async getLatestDiagnosticContext(filePath: string): Promise<Record<string, unknown> | null> {
        const query = `
            SELECT *
            FROM diagnostic_contexts
            WHERE file_path = $1
            ORDER BY created_at DESC
            LIMIT 1
        `;

        try {
            const result = await this.pool.query(query, [filePath]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Failed to get latest diagnostic context:', error);
            throw error;
        }
    }

    /**
     * Get analysis results for a context
     */
    public async getAnalysisResults(contextId: number): Promise<Record<string, unknown>[]> {
        const query = `
            SELECT ar.*, ast.name as strategy_name
            FROM analysis_results ar
            LEFT JOIN analysis_strategies ast ON ar.strategy_id = ast.id
            WHERE ar.context_id = $1
            ORDER BY ar.created_at DESC
        `;

        try {
            const result = await this.pool.query(query, [contextId]);
            return result.rows;
        } catch (error) {
            console.error('Failed to get analysis results:', error);
            throw error;
        }
    }

    /**
     * Close the database connection
     */
    public async close(): Promise<void> {
        await closePool();
    }
}
