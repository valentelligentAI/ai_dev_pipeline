import { Migration, MigrationMeta } from '../Migration';
import { Pool } from 'pg';

export default class QueryOptimizationMigration extends Migration {
    readonly meta: MigrationMeta = {
        id: '002_query_optimization',
        name: 'Query Optimization and Performance Tracking',
        description: 'Adds tables and functions for query optimization and performance monitoring',
        version: '1.0.1',
        dependencies: ['001_strategy_management']
    };

    async up(pool: Pool): Promise<void> {
        const queries = [
            // Query performance tracking
            `CREATE TABLE query_performance (
                id SERIAL PRIMARY KEY,
                query_hash TEXT NOT NULL,
                query_text TEXT NOT NULL,
                execution_time NUMERIC NOT NULL,
                rows_affected INTEGER,
                query_plan JSONB,
                context_id INTEGER REFERENCES diagnostic_contexts(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                metadata JSONB
            )`,

            // Query optimization suggestions
            `CREATE TABLE query_optimizations (
                id SERIAL PRIMARY KEY,
                query_hash TEXT NOT NULL,
                suggestion_type TEXT NOT NULL,
                suggestion TEXT NOT NULL,
                impact_estimate JSONB,
                implemented BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                implemented_at TIMESTAMP WITH TIME ZONE,
                metadata JSONB
            )`,

            // Performance thresholds
            `CREATE TABLE performance_thresholds (
                id SERIAL PRIMARY KEY,
                metric_name TEXT NOT NULL,
                warning_threshold NUMERIC NOT NULL,
                critical_threshold NUMERIC NOT NULL,
                aggregation_period INTERVAL NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                metadata JSONB,
                UNIQUE(metric_name)
            )`,

            // Performance alerts
            `CREATE TABLE performance_alerts (
                id SERIAL PRIMARY KEY,
                threshold_id INTEGER REFERENCES performance_thresholds(id),
                alert_level TEXT NOT NULL CHECK (alert_level IN ('warning', 'critical')),
                metric_value NUMERIC NOT NULL,
                context JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP WITH TIME ZONE,
                resolution TEXT,
                metadata JSONB
            )`,

            // Add indexes for query performance tracking
            `CREATE INDEX idx_query_performance_hash ON query_performance(query_hash)`,
            `CREATE INDEX idx_query_performance_context ON query_performance(context_id)`,
            `CREATE INDEX idx_query_performance_time ON query_performance(execution_time)`,
            `CREATE INDEX idx_query_optimizations_hash ON query_optimizations(query_hash)`,
            `CREATE INDEX idx_performance_alerts_threshold ON performance_alerts(threshold_id)`,
            `CREATE INDEX idx_performance_alerts_level ON performance_alerts(alert_level)`,

            // Function to track query performance
            `CREATE OR REPLACE FUNCTION track_query_performance(
                p_query_text TEXT,
                p_execution_time NUMERIC,
                p_rows_affected INTEGER,
                p_query_plan JSONB,
                p_context_id INTEGER DEFAULT NULL
            ) RETURNS void AS $$
            DECLARE
                v_query_hash TEXT;
            BEGIN
                -- Generate hash of the query text
                v_query_hash := encode(digest(p_query_text, 'sha256'), 'hex');
                
                -- Insert performance record
                INSERT INTO query_performance (
                    query_hash,
                    query_text,
                    execution_time,
                    rows_affected,
                    query_plan,
                    context_id
                ) VALUES (
                    v_query_hash,
                    p_query_text,
                    p_execution_time,
                    p_rows_affected,
                    p_query_plan,
                    p_context_id
                );

                -- Check thresholds and create alerts if needed
                INSERT INTO performance_alerts (
                    threshold_id,
                    alert_level,
                    metric_value,
                    context
                )
                SELECT 
                    pt.id,
                    CASE 
                        WHEN p_execution_time >= pt.critical_threshold THEN 'critical'
                        WHEN p_execution_time >= pt.warning_threshold THEN 'warning'
                    END,
                    p_execution_time,
                    jsonb_build_object(
                        'query_hash', v_query_hash,
                        'rows_affected', p_rows_affected
                    )
                FROM performance_thresholds pt
                WHERE pt.metric_name = 'query_execution_time'
                AND (p_execution_time >= pt.warning_threshold OR p_execution_time >= pt.critical_threshold);
            END;
            $$ LANGUAGE plpgsql;`,

            // Insert default performance thresholds
            `INSERT INTO performance_thresholds (
                metric_name,
                warning_threshold,
                critical_threshold,
                aggregation_period
            ) VALUES 
            ('query_execution_time', 1000, 5000, '1 hour'::interval),
            ('rows_processed', 10000, 50000, '1 hour'::interval),
            ('memory_usage', 1000000, 5000000, '1 hour'::interval)
            ON CONFLICT (metric_name) DO NOTHING`
        ];

        await this.executeBatch(pool, queries);
    }

    async down(pool: Pool): Promise<void> {
        const queries = [
            // Drop function
            `DROP FUNCTION IF EXISTS track_query_performance(TEXT, NUMERIC, INTEGER, JSONB, INTEGER)`,

            // Drop tables in reverse order
            `DROP TABLE IF EXISTS performance_alerts`,
            `DROP TABLE IF EXISTS performance_thresholds`,
            `DROP TABLE IF EXISTS query_optimizations`,
            `DROP TABLE IF EXISTS query_performance`
        ];

        await this.executeBatch(pool, queries);
    }
}
