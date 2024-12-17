import { exec } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { promisify } from 'util';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function setupPostgres() {
    try {
        console.log('Setting up PostgreSQL...');

        // Check if psql is available
        try {
            const { stdout } = await execAsync('psql --version');
            console.log('PostgreSQL client (psql) is installed:', stdout.trim());
        } catch {
            console.error('PostgreSQL client (psql) is not installed.');
            console.log('\nPlease install PostgreSQL:');
            console.log('1. Download from: https://www.postgresql.org/download/windows/');
            console.log('2. Run the installer');
            console.log('3. Add PostgreSQL bin directory to PATH');
            process.exit(1);
        }

        // Check if PostgreSQL service is running
        try {
            const { stdout } = await execAsync('pg_isready');
            console.log('PostgreSQL server is running:', stdout.trim());
        } catch {
            console.error('PostgreSQL server is not running.');
            console.log('\nPlease start PostgreSQL service:');
            console.log('1. Open Services (services.msc)');
            console.log('2. Find "postgresql-x64-XX" service');
            console.log('3. Start the service');
            process.exit(1);
        }

        // Create database and user using psql
        const setupCommands = [
            // Create user if not exists
            `DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '${process.env['POSTGRES_USER']}') THEN
                    CREATE USER ${process.env['POSTGRES_USER']} WITH PASSWORD '${process.env['POSTGRES_PASSWORD']}';
                END IF;
            END $$;`,

            // Create database if not exists
            `SELECT 'CREATE DATABASE ${process.env['POSTGRES_DB']}'
            WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${process.env['POSTGRES_DB']}')\\gexec`,

            // Grant privileges
            `GRANT ALL PRIVILEGES ON DATABASE ${process.env['POSTGRES_DB']} TO ${process.env['POSTGRES_USER']};`,

            // Connect to the database and grant schema privileges
            `\\c ${process.env['POSTGRES_DB']}`,
            'GRANT ALL ON SCHEMA public TO public;',
            `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${process.env['POSTGRES_USER']};`,
            `GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${process.env['POSTGRES_USER']};`
        ].join('\n');

        // Write commands to a temporary file
        const setupScript = path.join(process.cwd(), 'setup-postgres.sql');
        await fs.writeFile(setupScript, setupCommands);

        // Execute the setup script
        console.log('Creating database and user...');
        const { stdout: setupOutput } = await execAsync(`psql -U postgres -f "${setupScript}"`);
        console.log('Setup output:', setupOutput);
        
        // Clean up
        await fs.unlink(setupScript);

        console.log('\nPostgreSQL setup completed successfully!');
        console.log(`Database '${process.env['POSTGRES_DB']}' and user '${process.env['POSTGRES_USER']}' are ready.`);
        
        // Test connection
        console.log('\nTesting connection...');
        const { stdout: testOutput } = await execAsync(
            `psql -U ${process.env['POSTGRES_USER']} -d ${process.env['POSTGRES_DB']} -c "SELECT 1;"`
        );
        console.log('Connection test successful:', testOutput.trim());

    } catch (error: any) {
        console.error('Setup failed:', error.message);
        if (error?.stderr) {
            console.error('Error details:', error.stderr);
        }
        process.exit(1);
    }
}

// Add instructions for running as postgres superuser
console.log('NOTE: This script should be run as the postgres superuser.');
console.log('If you get permission errors, try:');
console.log('1. Open Command Prompt as Administrator');
console.log('2. Run: runas /user:postgres "npm run db:setup-postgres"\n');

setupPostgres().catch(console.error);
