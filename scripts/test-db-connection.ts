import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testConnection() {
    // Log environment variables (without password)
    console.log('Database Configuration:', {
        host: process.env['POSTGRES_HOST'],
        port: process.env['POSTGRES_PORT'],
        database: process.env['POSTGRES_DB'],
        user: process.env['POSTGRES_USER'],
        // Don't log password
    });

    const pool = new Pool({
        host: process.env['POSTGRES_HOST'],
        port: parseInt(process.env['POSTGRES_PORT'] || '5432'),
        database: process.env['POSTGRES_DB'],
        user: process.env['POSTGRES_USER'],
        password: process.env['POSTGRES_PASSWORD']
    });

    try {
        console.log('Attempting to connect to PostgreSQL...');
        
        // Try to connect
        const client = await pool.connect();
        console.log('Successfully connected to PostgreSQL!');

        // Test query
        const result = await client.query('SELECT version()');
        console.log('PostgreSQL Version:', result.rows[0].version);

        // Release client
        client.release();

        // Test database existence
        const dbResult = await pool.query(`
            SELECT datname 
            FROM pg_database 
            WHERE datname = $1
        `, [process.env['POSTGRES_DB']]);

        if (dbResult.rows.length === 0) {
            console.log(`Database '${process.env['POSTGRES_DB']}' does not exist!`);
        } else {
            console.log(`Database '${process.env['POSTGRES_DB']}' exists`);
        }

    } catch (err: any) {
        console.error('Failed to connect to PostgreSQL:');
        console.error('Error details:', {
            name: err?.name,
            message: err?.message,
            code: err?.code,
            detail: err?.detail,
            hint: err?.hint,
            position: err?.position,
            where: err?.where,
            file: err?.file,
            line: err?.line,
            routine: err?.routine
        });

        // Provide troubleshooting tips based on error
        if (err?.code === 'ECONNREFUSED') {
            console.log('\nTroubleshooting tips:');
            console.log('1. Make sure PostgreSQL is running');
            console.log('2. Check if the host and port are correct');
            console.log('3. Verify PostgreSQL is accepting connections');
            console.log('4. Check if PostgreSQL is installed');
            console.log('5. Verify firewall settings');
        } else if (err?.code === '28P01') {
            console.log('\nTroubleshooting tips:');
            console.log('1. Verify your username and password are correct');
            console.log('2. Check if the user has proper permissions');
            console.log('3. Verify the user exists in PostgreSQL');
        } else if (err?.code === '3D000') {
            console.log('\nTroubleshooting tips:');
            console.log('1. Database does not exist - need to create it first');
            console.log('2. Check if database name is correct');
            console.log('3. Verify user has access to the database');
            console.log(`4. Try creating database: CREATE DATABASE ${process.env['POSTGRES_DB']}`);
        }
    } finally {
        await pool.end();
    }
}

// Add script to package.json
console.log('\nAdd this to your package.json scripts:');
console.log('"db:test-connection": "ts-node scripts/test-db-connection.ts"');

// Run the test
testConnection().catch(console.error);
