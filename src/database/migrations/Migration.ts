import { Pool } from 'pg';

export interface MigrationMeta {
    id: string;
    name: string;
    description: string;
    version: string;
    dependencies?: string[];
}

export abstract class Migration {
    abstract readonly meta: MigrationMeta;

    abstract up(pool: Pool): Promise<void>;
    abstract down(pool: Pool): Promise<void>;

    async validate(pool: Pool): Promise<boolean> {
        try {
            // Check if migration table exists
            const tableExists = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public'
                    AND table_name = 'migrations'
                );
            `);

            if (!tableExists.rows[0].exists) {
                await pool.query(`
                    CREATE TABLE migrations (
                        id VARCHAR(255) PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        version VARCHAR(50) NOT NULL,
                        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        checksum VARCHAR(255) NOT NULL,
                        metadata JSONB
                    );

                    CREATE INDEX idx_migrations_version ON migrations(version);
                    CREATE INDEX idx_migrations_applied_at ON migrations(applied_at);
                `);
            }

            // Check if migration was already applied
            const result = await pool.query(
                'SELECT id FROM migrations WHERE id = $1',
                [this.meta.id]
            );

            return result.rows.length === 0;
        } catch (error) {
            console.error('Migration validation failed:', error);
            return false;
        }
    }

    protected async executeBatch(pool: Pool, queries: string[]): Promise<void> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            for (const query of queries) {
                await client.query(query);
            }
            
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async recordMigration(pool: Pool, checksum: string): Promise<void> {
        await pool.query(
            `INSERT INTO migrations (id, name, version, checksum, metadata)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                this.meta.id,
                this.meta.name,
                this.meta.version,
                checksum,
                {
                    description: this.meta.description,
                    dependencies: this.meta.dependencies || []
                }
            ]
        );
    }

    async removeMigrationRecord(pool: Pool): Promise<void> {
        await pool.query(
            'DELETE FROM migrations WHERE id = $1',
            [this.meta.id]
        );
    }
}
