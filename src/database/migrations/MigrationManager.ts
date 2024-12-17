import { Pool } from 'pg';
import { Migration } from './Migration';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';

export class MigrationManager {
    private migrations: Migration[] = [];
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    async loadMigrations(): Promise<void> {
        const migrationsDir = path.join(__dirname, 'versions');
        
        try {
            const files = await fs.readdir(migrationsDir);
            const migrationFiles = files.filter(f => f.endsWith('.ts') || f.endsWith('.js'));

            for (const file of migrationFiles) {
                const migrationModule = await import(path.join(migrationsDir, file));
                const MigrationClass = migrationModule.default;
                const migration = new MigrationClass();
                this.migrations.push(migration);
            }

            // Sort migrations by version
            this.migrations.sort((a, b) => 
                this.compareVersions(a.meta.version, b.meta.version)
            );
        } catch (error) {
            console.error('Failed to load migrations:', error);
            throw error;
        }
    }

    async applyMigrations(): Promise<void> {
        for (const migration of this.migrations) {
            try {
                const canApply = await migration.validate(this.pool);
                if (canApply) {
                    console.log(`Applying migration: ${migration.meta.name} (${migration.meta.version})`);
                    
                    // Generate checksum for migration
                    const checksum = this.generateChecksum(migration);
                    
                    // Apply migration
                    await migration.up(this.pool);
                    
                    // Record successful migration
                    await migration.recordMigration(this.pool, checksum);
                    
                    console.log(`Successfully applied migration: ${migration.meta.name}`);
                }
            } catch (error) {
                console.error(`Failed to apply migration ${migration.meta.name}:`, error);
                throw error;
            }
        }
    }

    async rollbackMigration(version: string): Promise<void> {
        const migration = this.migrations.find(m => m.meta.version === version);
        if (!migration) {
            throw new Error(`Migration version ${version} not found`);
        }

        try {
            console.log(`Rolling back migration: ${migration.meta.name} (${version})`);
            
            await migration.down(this.pool);
            await migration.removeMigrationRecord(this.pool);
            
            console.log(`Successfully rolled back migration: ${migration.meta.name}`);
        } catch (error) {
            console.error(`Failed to rollback migration ${version}:`, error);
            throw error;
        }
    }

    async getCurrentVersion(): Promise<string | null> {
        try {
            const result = await this.pool.query(`
                SELECT version 
                FROM migrations 
                ORDER BY applied_at DESC 
                LIMIT 1
            `);
            
            return result.rows[0]?.version || null;
        } catch (error) {
            console.error('Failed to get current version:', error);
            return null;
        }
    }

    async getMigrationHistory(): Promise<Array<{
        id: string;
        name: string;
        version: string;
        applied_at: Date;
        checksum: string;
    }>> {
        try {
            const result = await this.pool.query(`
                SELECT id, name, version, applied_at, checksum
                FROM migrations
                ORDER BY applied_at DESC
            `);
            
            return result.rows;
        } catch (error) {
            console.error('Failed to get migration history:', error);
            return [];
        }
    }

    private generateChecksum(migration: Migration): string {
        const content = JSON.stringify({
            id: migration.meta.id,
            name: migration.meta.name,
            version: migration.meta.version,
            description: migration.meta.description
        });

        return crypto
            .createHash('sha256')
            .update(content)
            .digest('hex');
    }

    private compareVersions(a: string, b: string): number {
        const partsA = a.split('.').map(Number);
        const partsB = b.split('.').map(Number);
        
        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
            const numA = partsA[i] || 0;
            const numB = partsB[i] || 0;
            if (numA !== numB) {
                return numA - numB;
            }
        }
        
        return 0;
    }
}
