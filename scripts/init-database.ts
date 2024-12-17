import { DatabaseClient } from '../src/database/client';
import { getPool, testConnection } from '../src/database/config';
import { MigrationManager } from '../src/database/migrations/MigrationManager';
import { DatabaseError } from '../src/database/errors';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export async function resetDatabase(): Promise<void> {
    console.log('Resetting database...');
    const pool = getPool();
    
    try {
        // Drop all tables
        await pool.query(`
            DROP SCHEMA public CASCADE;
            CREATE SCHEMA public;
            GRANT ALL ON SCHEMA public TO public;
        `);
        console.log('Database reset complete.');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Failed to reset database:', message);
        throw new DatabaseError(
            'Reset failed',
            'RESET_ERROR',
            'error'
        );
    }
}

export async function initializeDatabase(): Promise<void> {
    console.log('Testing database connection...');
    
    try {
        // Test connection first
        const connected = await testConnection();
        if (!connected) {
            throw new DatabaseError(
                'Failed to connect to PostgreSQL. Please check your connection settings.',
                'CONNECTION_ERROR',
                'error'
            );
        }

        console.log('Initializing database...');
        
        // Initialize database client
        const dbClient = DatabaseClient.getInstance();
        const pool = getPool();
        
        try {
            // Initialize schema
            console.log('Creating base schema...');
            await dbClient.initializeSchema();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Failed to initialize schema:', message);
            throw new DatabaseError(
                'Schema initialization failed',
                'SCHEMA_ERROR',
                'error'
            );
        }
        
        try {
            // Run migrations
            console.log('Running migrations...');
            const migrationManager = new MigrationManager(pool);
            await migrationManager.loadMigrations();
            await migrationManager.applyMigrations();

            // Show current version
            const currentVersion = await migrationManager.getCurrentVersion();
            console.log(`Database initialized at version: ${currentVersion}`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Failed to run migrations:', message);
            throw new DatabaseError(
                'Migration failed',
                'MIGRATION_ERROR',
                'error'
            );
        }

        // Create default analysis strategies
        console.log('Creating default analysis strategies...');
        await pool.query(`
            INSERT INTO analysis_strategies (name, description, priority, version, metadata)
            VALUES 
                ('type-error-analysis', 'Analyzes TypeScript type errors', 1, '1.0.0', '{"applicability": ["typescript", "javascript"]}'),
                ('dependency-analysis', 'Analyzes project dependencies', 2, '1.0.0', '{"applicability": ["npm", "yarn", "pnpm"]}'),
                ('code-quality-analysis', 'Analyzes code quality and patterns', 3, '1.0.0', '{"applicability": ["all"]}')
            ON CONFLICT (name) DO NOTHING
        `);

        // Initialize performance thresholds if not exists
        console.log('Initializing performance thresholds...');
        await pool.query(`
            INSERT INTO performance_thresholds (metric_name, warning_threshold, critical_threshold, aggregation_period)
            VALUES 
                ('query_execution_time', 1000, 5000, '1 hour'::interval),
                ('rows_processed', 10000, 50000, '1 hour'::interval),
                ('memory_usage', 1000000, 5000000, '1 hour'::interval)
            ON CONFLICT (metric_name) DO NOTHING
        `);

        console.log('Database initialization completed successfully!');
        
        // Close connections
        await dbClient.close();
        
    } catch (error) {
        if (error instanceof DatabaseError) {
            throw error;
        }
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Failed to initialize database:', message);
        throw new DatabaseError(
            'Database initialization failed',
            'INIT_ERROR',
            'error'
        );
    }
}

// Run as script
if (require.main === module) {
    const args = process.argv.slice(2);
    const isReset = args.includes('--reset');

    if (isReset) {
        resetDatabase()
            .then(() => initializeDatabase())
            .catch(error => {
                const message = error instanceof Error ? error.message : 'Unknown error occurred';
                console.error('Database initialization failed:', message);
                process.exit(1);
            });
    } else {
        initializeDatabase().catch(error => {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error('Database initialization failed:', message);
            process.exit(1);
        });
    }
}
