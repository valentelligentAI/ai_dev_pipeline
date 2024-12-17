import { Pool } from 'pg';
import { DatabaseConfig, getPool, closePool } from '../config';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

export const testConfig: DatabaseConfig = {
    host: process.env['POSTGRES_HOST'] || 'localhost',
    port: parseInt(process.env['POSTGRES_PORT'] || '5432'),
    database: process.env['POSTGRES_DB'] || 'ai_pipeline_test',
    user: process.env['POSTGRES_USER'] || 'test_user',
    password: process.env['POSTGRES_PASSWORD'] || 'test_password'
};

export async function setupTestDatabase(): Promise<void> {
    // First connect to default postgres database to create test database if needed
    const adminPool = new Pool({
        ...testConfig,
        database: 'postgres'
    });

    try {
        // Create test database if it doesn't exist
        await adminPool.query(`
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity 
            WHERE datname = $1;
        `, [testConfig.database]);

        await adminPool.query(`DROP DATABASE IF EXISTS ${testConfig.database}`);
        await adminPool.query(`CREATE DATABASE ${testConfig.database}`);
    } finally {
        await adminPool.end();
    }

    // Now connect to test database and set up schema
    const pool = getPool(testConfig);

    try {
        // Drop existing triggers and tables
        await pool.query(`
            DO $$ 
            BEGIN
                -- Drop all triggers
                DROP TRIGGER IF EXISTS update_diagnostic_contexts_updated_at ON diagnostic_contexts;
                DROP TRIGGER IF EXISTS update_analysis_results_updated_at ON analysis_results;
                DROP TRIGGER IF EXISTS update_analysis_strategies_updated_at ON analysis_strategies;
                DROP TRIGGER IF EXISTS update_context_events_updated_at ON context_events;
                
                -- Drop all tables
                DROP TABLE IF EXISTS context_events CASCADE;
                DROP TABLE IF EXISTS analysis_results CASCADE;
                DROP TABLE IF EXISTS analysis_strategies CASCADE;
                DROP TABLE IF EXISTS diagnostic_contexts CASCADE;
                DROP TABLE IF EXISTS performance_thresholds CASCADE;
            END $$;
        `);

        // Initialize schema
        const schemaPath = path.join(__dirname, '..', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schema);
    } finally {
        await closePool();
    }
}

export async function teardownTestDatabase(): Promise<void> {
    await closePool();

    const pool = new Pool({
        ...testConfig,
        database: 'postgres' // Connect to default database
    });

    try {
        // Terminate all connections and drop test database
        await pool.query(`
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = $1;
        `, [testConfig.database]);

        await pool.query(`DROP DATABASE IF EXISTS ${testConfig.database}`);
    } finally {
        await pool.end();
    }
}

export async function clearTestData(): Promise<void> {
    const pool = getPool(testConfig);
    try {
        // Clear all tables in reverse order of dependencies
        await pool.query('DELETE FROM context_events');
        await pool.query('DELETE FROM analysis_results');
        await pool.query('DELETE FROM analysis_strategies');
        await pool.query('DELETE FROM diagnostic_contexts');
    } finally {
        await closePool();
    }
}

export const mockDiagnosticContext = {
    filePath: '/test/path/file.ts',
    cursor: { line: 1, column: 1 },
    projectStructure: {
        hasGit: true,
        hasTsConfig: true,
        hasPackageJson: true
    },
    environmentInfo: {
        os: 'test-os',
        architecture: 'x64',
        processorCount: 4,
        powerShell: '5.1'
    },
    systemContext: {
        systemDirectory: '/test/system',
        environmentVariables: { PATH: '/test/path' },
        userName: 'test-user',
        computerName: 'test-computer',
        workingDirectory: '/test/work'
    },
    capabilities: {
        isAdmin: true,
        hasInternet: true,
        canWriteToUserProfile: true
    }
};

export const mockAnalysisStrategy = {
    name: 'test-strategy',
    description: 'Test strategy for unit tests',
    priority: 1,
    version: '1.0.0',
    metadata: { type: 'test' }
};

export const mockAnalysisResult = {
    confidence: 0.95,
    findings: {
        issues: ['test issue'],
        severity: 'medium'
    },
    nextSteps: {
        recommendations: ['test recommendation']
    },
    metadata: {
        duration: 100,
        timestamp: new Date().toISOString()
    }
};
