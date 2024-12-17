#!/usr/bin/env node
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load both .env and .env.test files
dotenv.config(); // Load main .env first
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

async function setupTestDatabase(): Promise<void> {
    console.log('Setting up test database environment...');

    // Use credentials from main .env file for admin connection
    const adminPool = new Pool({
        host: process.env['POSTGRES_HOST'] || 'localhost',
        port: parseInt(process.env['POSTGRES_PORT'] || '5432'),
        database: 'postgres',
        user: process.env['POSTGRES_USER'] || 'postgres',
        password: process.env['POSTGRES_PASSWORD']
    });

    try {
        console.log('Creating test database and user...');
        
        // Create test user if not exists
        await adminPool.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'test_user') THEN
                    CREATE USER test_user WITH PASSWORD 'test_password';
                END IF;
            END $$;
        `);

        // Drop test database if exists and recreate it
        await adminPool.query(`
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity 
            WHERE datname = 'ai_pipeline_test';
        `);
        
        await adminPool.query(`DROP DATABASE IF EXISTS ai_pipeline_test`);
        await adminPool.query(`CREATE DATABASE ai_pipeline_test OWNER test_user`);

        console.log('Test database environment setup completed successfully!');

    } catch (error) {
        console.error('Failed to set up test database:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    } finally {
        await adminPool.end();
    }
}

// Run setup if this script is executed directly
if (require.main === module) {
    setupTestDatabase().catch(error => {
        console.error('Setup failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    });
}

export { setupTestDatabase };
