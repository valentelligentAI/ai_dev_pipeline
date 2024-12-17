import { getPool } from '../src/database/config';
import { MigrationManager } from '../src/database/migrations/MigrationManager';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function runMigrations(): Promise<void> {
    console.log('Starting database migrations...');
    
    const pool = getPool();
    const migrationManager = new MigrationManager(pool);

    try {
        // Load all migrations
        await migrationManager.loadMigrations();

        // Get current version
        const currentVersion = await migrationManager.getCurrentVersion();
        console.log('Current database version:', currentVersion || 'No migrations applied');

        // Apply pending migrations
        console.log('Applying pending migrations...');
        await migrationManager.applyMigrations();

        // Get new version
        const newVersion = await migrationManager.getCurrentVersion();
        console.log('New database version:', newVersion);

        // Show migration history
        console.log('\nMigration History:');
        const history = await migrationManager.getMigrationHistory();
        history.forEach(migration => {
            console.log(`- ${migration.name} (${migration.version}) applied at ${migration.applied_at}`);
        });

        console.log('\nMigrations completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Check for rollback flag
const args = process.argv.slice(2);
const rollbackVersion = args.find(arg => arg.startsWith('--rollback='))?.split('=')[1];

if (rollbackVersion) {
    console.log(`Rolling back to version ${rollbackVersion}...`);
    const pool = getPool();
    const migrationManager = new MigrationManager(pool);

    migrationManager.rollbackMigration(rollbackVersion)
        .then(() => {
            console.log('Rollback completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Rollback failed:', error);
            process.exit(1);
        })
        .finally(() => {
            pool.end();
        });
} else {
    runMigrations().catch(console.error);
}
