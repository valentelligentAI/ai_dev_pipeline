import { exec } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { promisify } from 'util';
import { Pool } from 'pg';

const execAsync = promisify(exec);

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function checkPostgresInstallation() {
    console.log('\n=== Checking PostgreSQL Installation ===');
    try {
        const { stdout } = await execAsync('psql --version');
        console.log('✅ PostgreSQL client installed:', stdout.trim());
    } catch {
        console.log('❌ PostgreSQL client not found');
        console.log('\nAction Required:');
        console.log('1. Download PostgreSQL from https://www.postgresql.org/download/windows/');
        console.log('2. Run the installer (make sure to check "Add to PATH")');
        console.log('3. Restart your computer');
        return false;
    }
    return true;
}

async function checkPostgresService() {
    console.log('\n=== Checking PostgreSQL Service ===');
    try {
        await execAsync('sc query postgresql-x64-15');
        console.log('✅ PostgreSQL service exists');
        
        const { stdout } = await execAsync('pg_isready');
        if (stdout.includes('accepting connections')) {
            console.log('✅ PostgreSQL service is running and accepting connections');
            return true;
        } else {
            console.log('❌ PostgreSQL service is not accepting connections');
            return false;
        }
    } catch {
        console.log('❌ PostgreSQL service not found or not running');
        console.log('\nAction Required:');
        console.log('1. Open Services (Win + R, type services.msc)');
        console.log('2. Find "postgresql-x64-XX"');
        console.log('3. Right-click and select "Start"');
        console.log('4. Set "Startup type" to "Automatic"');
        return false;
    }
}

async function checkEnvironmentVariables() {
    console.log('\n=== Checking Environment Variables ===');
    const required = ['POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD'];
    let allPresent = true;

    for (const variable of required) {
        if (process.env[variable]) {
            console.log(`✅ ${variable} is set`);
        } else {
            console.log(`❌ ${variable} is missing`);
            allPresent = false;
        }
    }

    if (!allPresent) {
        console.log('\nAction Required:');
        console.log('Update your .env file with the following variables:');
        console.log(`
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=ai_dev_pipeline
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
        `);
    }

    return allPresent;
}

async function testConnection() {
    console.log('\n=== Testing Database Connection ===');
    const pool = new Pool({
        host: process.env['POSTGRES_HOST'],
        port: parseInt(process.env['POSTGRES_PORT'] || '5432'),
        user: process.env['POSTGRES_USER'],
        password: process.env['POSTGRES_PASSWORD'],
        database: 'postgres' // Try to connect to default database first
    });

    try {
        const client = await pool.connect();
        console.log('✅ Successfully connected to PostgreSQL server');
        
        // Check if our database exists
        const dbResult = await client.query(`
            SELECT datname FROM pg_database 
            WHERE datname = $1
        `, [process.env['POSTGRES_DB']]);

        if (dbResult.rows.length > 0) {
            console.log(`✅ Database '${process.env['POSTGRES_DB']}' exists`);
        } else {
            console.log(`❌ Database '${process.env['POSTGRES_DB']}' does not exist`);
            console.log('\nAction Required:');
            console.log('Run: npm run db:setup-postgres');
        }

        // Check user permissions
        const userResult = await client.query(`
            SELECT usename, usesuper, usecreatedb 
            FROM pg_user 
            WHERE usename = $1
        `, [process.env['POSTGRES_USER']]);

        if (userResult.rows.length > 0) {
            console.log(`✅ User '${process.env['POSTGRES_USER']}' exists`);
            const user = userResult.rows[0];
            console.log(`   Superuser: ${user.usesuper ? 'Yes' : 'No'}`);
            console.log(`   Can create databases: ${user.usecreatedb ? 'Yes' : 'No'}`);
        } else {
            console.log(`❌ User '${process.env['POSTGRES_USER']}' does not exist`);
            console.log('\nAction Required:');
            console.log('Run: npm run db:setup-postgres');
        }

        client.release();
    } catch (error: any) {
        console.log('❌ Connection failed:', error.message);
        console.log('\nPossible solutions:');
        if (error.code === 'ECONNREFUSED') {
            console.log('1. Make sure PostgreSQL is running');
            console.log('2. Check if the port is correct (default: 5432)');
            console.log('3. Verify firewall settings');
        } else if (error.code === '28P01') {
            console.log('1. Check if username and password are correct');
            console.log('2. Update credentials in .env file');
        } else if (error.code === '3D000') {
            console.log('1. Database does not exist - run setup script');
            console.log('2. Check database name in .env file');
        }
        return false;
    } finally {
        await pool.end();
    }
    return true;
}

async function checkPostgresConfig() {
    console.log('\n=== Checking PostgreSQL Configuration ===');
    try {
        const { stdout: configFile } = await execAsync('psql -U postgres -c "SHOW config_file;"');
        console.log('PostgreSQL config file location:', configFile.trim());
        
        const { stdout: listenAddresses } = await execAsync('psql -U postgres -c "SHOW listen_addresses;"');
        console.log('Listen addresses:', listenAddresses.trim());
        
        const { stdout: port } = await execAsync('psql -U postgres -c "SHOW port;"');
        console.log('Port:', port.trim());
        
        const { stdout: maxConnections } = await execAsync('psql -U postgres -c "SHOW max_connections;"');
        console.log('Max connections:', maxConnections.trim());
    } catch {
        console.log('❌ Could not check PostgreSQL configuration');
        console.log('Make sure you have superuser access to PostgreSQL');
    }
}

async function main() {
    console.log('Starting PostgreSQL Troubleshooting...\n');

    const installOk = await checkPostgresInstallation();
    if (!installOk) return;

    const serviceOk = await checkPostgresService();
    if (!serviceOk) return;

    const envOk = await checkEnvironmentVariables();
    if (!envOk) return;

    const connectionOk = await testConnection();
    if (!connectionOk) return;

    await checkPostgresConfig();

    console.log('\n=== Troubleshooting Complete ===');
    console.log('If you still have issues:');
    console.log('1. Check PostgreSQL logs in: %PROGRAMDATA%\\PostgreSQL\\15\\data\\log');
    console.log('2. Verify Windows Firewall settings');
    console.log('3. Try restarting PostgreSQL service');
    console.log('4. Run setup script: npm run db:setup-postgres');
}

main().catch(console.error);
