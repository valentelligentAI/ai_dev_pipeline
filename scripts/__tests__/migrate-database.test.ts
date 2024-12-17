import { getPool } from '../../src/database/config';
import { MigrationManager } from '../../src/database/migrations/MigrationManager';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { Pool } from 'pg';

const runMigrationScript = async (rollbackVersion?: string) => {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(process.cwd(), 'scripts', 'migrate-database.ts');
        let command = `node ${scriptPath}`;
        if (rollbackVersion) {
            command += ` --rollback=${rollbackVersion}`;
        }
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                reject(error);
                return;
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
            }
            resolve(stdout);
        });
    });
};

describe('Database Migrations', () => {
    let pool: Pool;
    let migrationManager: MigrationManager;

    beforeAll(async () => {
        pool = getPool();
        migrationManager = new MigrationManager(pool);
    });

    afterAll(async () => {
        await pool.end();
    });

    beforeEach(async () => {
        // Ensure database is in a clean state before each test
        await migrationManager.loadMigrations();
        await migrationManager.rollbackMigration('0');
    });

    it('should load migrations successfully', async () => {
        expect(migrationManager['migrations'].length).toBe(2);
        expect(migrationManager['migrations'][0].meta.name).toBe('Strategy Management and Feedback');
        expect(migrationManager['migrations'][1].meta.name).toBe('Query Optimization');
    });

    it('should apply pending migrations successfully', async () => {
        const initialVersion = await migrationManager.getCurrentVersion();
        expect(initialVersion).toBe('0');

        await runMigrationScript();

        const currentVersion = await migrationManager.getCurrentVersion();
        expect(currentVersion).toBe('2');

        const history = await migrationManager.getMigrationHistory();
        let historyLength = 0;
        let firstMigrationName = '';
        let secondMigrationName = '';
        if (history) {
            historyLength = history.length;
            if (history.length > 0) {
                firstMigrationName = history[0].name;
            }
            if (history.length > 1) {
                secondMigrationName = history[1].name;
            }
        }
        expect(historyLength).toBe(2);
        expect(firstMigrationName).toBe('001_strategy_management');
        expect(secondMigrationName).toBe('002_query_optimization');
    });

    it('should rollback migrations successfully', async () => {
        await runMigrationScript();
        let currentVersion = await migrationManager.getCurrentVersion();
        expect(currentVersion).toBe('2');

        await runMigrationScript('1');
        currentVersion = await migrationManager.getCurrentVersion();
        expect(currentVersion).toBe('1');

        const history = await migrationManager.getMigrationHistory();
        let historyLength = 0;
        let firstMigrationName = '';
        if (history) {
            historyLength = history.length;
            if (history.length > 0) {
                firstMigrationName = history[0].name;
            }
        }
        expect(historyLength).toBe(1);
        expect(firstMigrationName).toBe('001_strategy_management');
    });

    it('should handle errors during migration', async () => {
        // Simulate an error by modifying a migration file
        const invalidMigrationPath = path.join(process.cwd(), 'src', 'database', 'migrations', 'versions', '002_query_optimization.ts');
        const originalContent = await fs.promises.readFile(invalidMigrationPath, 'utf-8');
        await fs.promises.writeFile(invalidMigrationPath, 'invalid code');

        await expect(runMigrationScript()).rejects.toThrow();

        // Restore the original content
        await fs.promises.writeFile(invalidMigrationPath, originalContent);
    });

    it('should handle errors during rollback', async () => {
        await runMigrationScript();
        // Simulate an error by modifying a migration file
        const invalidMigrationPath = path.join(process.cwd(), 'src', 'database', 'migrations', 'versions', '001_strategy_management.ts');
        const originalContent = await fs.promises.readFile(invalidMigrationPath, 'utf-8');
        await fs.promises.writeFile(invalidMigrationPath, 'invalid code');

        await expect(runMigrationScript('0')).rejects.toThrow();

        // Restore the original content
        await fs.promises.writeFile(invalidMigrationPath, originalContent);
    });
});
