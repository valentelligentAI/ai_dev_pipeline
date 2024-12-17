import { Migration, MigrationMeta } from '../Migration';
import { Pool } from 'pg';

export default class StrategyManagementMigration extends Migration {
    readonly meta: MigrationMeta = {
        id: '001_strategy_management',
        name: 'Strategy Management and Feedback',
        description: 'Adds tables for strategy versioning, activation/deactivation, and feedback tracking',
        version: '1.0.0'
    };

    async up(pool: Pool): Promise<void> {
        const queries = [
            // Strategy versions table
            `CREATE TABLE strategy_versions (
                id SERIAL PRIMARY KEY,
                strategy_id INTEGER REFERENCES analysis_strategies(id),
                version TEXT NOT NULL,
                implementation JSONB NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                metadata JSONB,
                UNIQUE(strategy_id, version)
            )`,

            // Strategy activation history
            `CREATE TABLE strategy_activations (
                id SERIAL PRIMARY KEY,
                strategy_id INTEGER REFERENCES analysis_strategies(id),
                version_id INTEGER REFERENCES strategy_versions(id),
                status TEXT NOT NULL CHECK (status IN ('activated', 'deactivated')),
                reason TEXT,
                activated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                activated_by TEXT,
                metadata JSONB
            )`,

            // Strategy feedback table
            `CREATE TABLE strategy_feedback (
                id SERIAL PRIMARY KEY,
                strategy_id INTEGER REFERENCES analysis_strategies(id),
                version_id INTEGER REFERENCES strategy_versions(id),
                result_id INTEGER REFERENCES analysis_results(id),
                feedback_type TEXT NOT NULL CHECK (feedback_type IN ('success', 'failure', 'improvement')),
                feedback_data JSONB NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                user_context JSONB,
                metadata JSONB
            )`,

            // Strategy performance metrics
            `CREATE TABLE strategy_metrics (
                id SERIAL PRIMARY KEY,
                strategy_id INTEGER REFERENCES analysis_strategies(id),
                version_id INTEGER REFERENCES strategy_versions(id),
                metric_type TEXT NOT NULL,
                metric_value NUMERIC NOT NULL,
                measured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                context JSONB,
                metadata JSONB
            )`,

            // Add indexes
            `CREATE INDEX idx_strategy_versions_strategy_id ON strategy_versions(strategy_id)`,
            `CREATE INDEX idx_strategy_versions_version ON strategy_versions(version)`,
            `CREATE INDEX idx_strategy_activations_strategy_id ON strategy_activations(strategy_id)`,
            `CREATE INDEX idx_strategy_activations_version_id ON strategy_activations(version_id)`,
            `CREATE INDEX idx_strategy_feedback_strategy_id ON strategy_feedback(strategy_id)`,
            `CREATE INDEX idx_strategy_feedback_version_id ON strategy_feedback(version_id)`,
            `CREATE INDEX idx_strategy_feedback_result_id ON strategy_feedback(result_id)`,
            `CREATE INDEX idx_strategy_metrics_strategy_id ON strategy_metrics(strategy_id)`,
            `CREATE INDEX idx_strategy_metrics_version_id ON strategy_metrics(version_id)`,
            `CREATE INDEX idx_strategy_metrics_metric_type ON strategy_metrics(metric_type)`,

            // Add trigger for strategy version activation
            `CREATE OR REPLACE FUNCTION update_strategy_activation()
            RETURNS TRIGGER AS $$
            BEGIN
                INSERT INTO strategy_activations (
                    strategy_id,
                    version_id,
                    status,
                    reason,
                    activated_by,
                    metadata
                ) VALUES (
                    NEW.strategy_id,
                    NEW.id,
                    'activated',
                    'Initial version activation',
                    current_user,
                    jsonb_build_object('automatic', true)
                );
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;`,

            `CREATE TRIGGER strategy_version_activation
            AFTER INSERT ON strategy_versions
            FOR EACH ROW
            EXECUTE FUNCTION update_strategy_activation();`
        ];

        await this.executeBatch(pool, queries);
    }

    async down(pool: Pool): Promise<void> {
        const queries = [
            // Drop triggers first
            `DROP TRIGGER IF EXISTS strategy_version_activation ON strategy_versions`,
            `DROP FUNCTION IF EXISTS update_strategy_activation()`,

            // Drop tables in reverse order of creation
            `DROP TABLE IF EXISTS strategy_metrics`,
            `DROP TABLE IF EXISTS strategy_feedback`,
            `DROP TABLE IF EXISTS strategy_activations`,
            `DROP TABLE IF EXISTS strategy_versions`
        ];

        await this.executeBatch(pool, queries);
    }
}
