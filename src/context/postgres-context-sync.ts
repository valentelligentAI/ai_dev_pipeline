import { Pool, PoolClient } from 'pg';
import { ContextSynchronizer } from './context-sync';
import { AIContext, ProjectContext, SystemContext, Capabilities } from './types';

export class PostgresContextSynchronizer extends ContextSynchronizer {
    private pool: Pool;

    constructor(
        contextPath: string,
        pool: Pool
    ) {
        super(contextPath);
        this.pool = pool;
    }

    override async loadAIContext(): Promise<AIContext> {
        const context = await super.loadAIContext();
        await this.syncWithDatabase(context);
        return context;
    }

    override async synchronizeContext(): Promise<void> {
        const context = await this.loadAIContext();
        await this.saveToDatabase(context);
    }

    private async syncWithDatabase(context: AIContext): Promise<void> {
        let client: PoolClient | null = null;
        try {
            client = await this.pool.connect();
            const result = await client.query(
                'SELECT * FROM ai_context ORDER BY created_at DESC LIMIT 1'
            );

            if (result.rows.length > 0) {
                this.mergeContextData(context, result.rows[0]);
            }
        } catch (error) {
            console.error('Failed to sync with database:', error);
            throw new Error('Database synchronization failed');
        } finally {
            if (client) {
                client.release();
            }
        }
    }

    private async saveToDatabase(context: AIContext): Promise<void> {
        let client: PoolClient | null = null;
        try {
            client = await this.pool.connect();
            await client.query('BEGIN');

            await client.query(
                `INSERT INTO ai_context (
                    project_name,
                    project_version,
                    project_description,
                    project_repository,
                    system_os,
                    system_arch,
                    system_env,
                    system_processor_count,
                    system_powershell,
                    system_directory,
                    system_env_vars,
                    system_username,
                    system_computer_name,
                    system_working_dir,
                    capabilities_database,
                    capabilities_filesystem,
                    capabilities_networking
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
                [
                    context.project.name,
                    context.project.version,
                    context.project.description,
                    context.project.repository,
                    context.system.OS,
                    context.system.Architecture,
                    context.system.Environment,
                    context.system.ProcessorCount,
                    context.system.PowerShell,
                    context.system.SystemDirectory,
                    JSON.stringify(context.system.EnvironmentVariables),
                    context.system.UserName,
                    context.system.ComputerName,
                    context.system.WorkingDirectory,
                    context.capabilities.database,
                    context.capabilities.fileSystem,
                    context.capabilities.networking
                ]
            );

            await client.query('COMMIT');
        } catch (error) {
            if (client) {
                await client.query('ROLLBACK');
            }
            console.error('Failed to save context to database:', error);
            throw new Error('Failed to save context to database');
        } finally {
            if (client) {
                client.release();
            }
        }
    }

    private mergeContextData(context: AIContext, dbData: Record<string, unknown>): void {
        // Merge project data
        const project: ProjectContext = {
            name: dbData['project_name'] as string,
            version: dbData['project_version'] as string,
            description: dbData['project_description'] as string,
            repository: dbData['project_repository'] as string
        };

        // Merge system data
        const system: SystemContext = {
            OS: dbData['system_os'] as string,
            Architecture: dbData['system_arch'] as string,
            Environment: dbData['system_env'] as string,
            ProcessorCount: dbData['system_processor_count'] as number,
            PowerShell: dbData['system_powershell'] as string,
            SystemDirectory: dbData['system_directory'] as string,
            EnvironmentVariables: JSON.parse(dbData['system_env_vars'] as string),
            UserName: dbData['system_username'] as string,
            ComputerName: dbData['system_computer_name'] as string,
            WorkingDirectory: dbData['system_working_dir'] as string
        };

        // Merge capabilities
        const capabilities: Capabilities = {
            database: dbData['capabilities_database'] as boolean,
            fileSystem: dbData['capabilities_filesystem'] as boolean,
            networking: dbData['capabilities_networking'] as boolean
        };

        context.project = project;
        context.system = system;
        context.capabilities = capabilities;
    }
}
