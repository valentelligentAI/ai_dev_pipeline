import { Pool, PoolConfig, PoolClient } from 'pg';

// Prevent multiple pool instances
let pool: Pool | null = null;

export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password?: string;
    max?: number;
    idleTimeoutMillis?: number;
    ssl?: boolean | { rejectUnauthorized: boolean };
}

export function createPoolConfig(): DatabaseConfig {
    return {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.NODE_ENV === 'test' ? 'ai_pipeline_test' : (process.env.POSTGRES_DB || 'ai_dev_pipeline'),
        user: process.env.NODE_ENV === 'test' ? 'test_user' : (process.env.POSTGRES_USER || 'postgres'),
        password: process.env.POSTGRES_PASSWORD || 'postgres',
        max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20'),
        idleTimeoutMillis: 30000,
        ssl: process.env.NODE_ENV === 'production' && process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false
    };
}

export function getPool(config?: Partial<DatabaseConfig>): Pool {
    if (!pool) {
        const poolConfig: PoolConfig = {
            ...createPoolConfig(),
            ...config
        };

        pool = new Pool(poolConfig);

        // Handle pool errors
        pool.on('error', (err: Error) => {
            console.error('Unexpected error on idle client:', err);
            console.error('Pool Config:', poolConfig);
            process.exit(-1);
        });

        // Handle client connection
        pool.on('connect', (client: PoolClient) => {
            console.log('New database client connected');
            client.on('error', (err: Error) => {
                console.error('Database client error:', err);
                console.error('Client Config:', client);
            });
        });
    }

    return pool;
}

export async function closePool(): Promise<void> {
    if (pool) {
        try {
            await pool.end();
            pool = null;
        } catch (error) {
            console.error('Error closing pool:', error);
            throw error;
        }
    }
}

export async function testConnection(): Promise<boolean> {
    try {
        const client = await getPool().connect();
        try {
            await client.query('SELECT 1');
            console.log('Successfully connected to PostgreSQL');
            return true;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Failed to connect to PostgreSQL:', error);
        if (error instanceof Error) {
            console.error('Error Message:', error.message);
            console.error('Error Stack:', error.stack);
        }
        return false;
    }
}

// Add utility function for connection string
export function getDatabaseUrl(): string {
    const config = createPoolConfig();
    return `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
}
