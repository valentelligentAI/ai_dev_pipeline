-- Core tables for AI-assisted diagnostic analysis

-- Diagnostic contexts table
CREATE TABLE IF NOT EXISTS diagnostic_contexts (
    id SERIAL PRIMARY KEY,
    file_path TEXT NOT NULL,
    cursor JSONB, -- Stores line/column and selection details
    project_structure JSONB NOT NULL, -- Dependencies, devDependencies, sourceFiles
    environment_info JSONB NOT NULL, -- Runtime, OS, memory
    system_context JSONB NOT NULL, -- System-specific information
    capabilities JSONB NOT NULL, -- User/system capabilities
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Analysis strategies table
CREATE TABLE IF NOT EXISTS analysis_strategies (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    priority INTEGER NOT NULL DEFAULT 0,
    version TEXT NOT NULL,
    metadata JSONB, -- Stores custom applicability or usage info
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Analysis results table
CREATE TABLE IF NOT EXISTS analysis_results (
    id SERIAL PRIMARY KEY,
    context_id INTEGER REFERENCES diagnostic_contexts(id) ON DELETE CASCADE,
    strategy_id INTEGER REFERENCES analysis_strategies(id),
    confidence NUMERIC(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
    findings JSONB NOT NULL, -- Stores detailed analysis output
    next_steps JSONB, -- Suggested solutions
    metadata JSONB, -- Additional analysis metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Context events table for tracking synchronization and validation events
CREATE TABLE IF NOT EXISTS context_events (
    id SERIAL PRIMARY KEY,
    context_id INTEGER REFERENCES diagnostic_contexts(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('sync', 'validation', 'error')),
    status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for improved query performance
CREATE INDEX IF NOT EXISTS idx_diagnostic_contexts_file_path ON diagnostic_contexts(file_path);
CREATE INDEX IF NOT EXISTS idx_analysis_results_context_id ON analysis_results(context_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_strategy_id ON analysis_results(strategy_id);
CREATE INDEX IF NOT EXISTS idx_context_events_context_id ON context_events(context_id);
CREATE INDEX IF NOT EXISTS idx_analysis_strategies_active ON analysis_strategies(active);

-- Update function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updating updated_at columns
CREATE TRIGGER update_diagnostic_contexts_updated_at
    BEFORE UPDATE ON diagnostic_contexts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_strategies_updated_at
    BEFORE UPDATE ON analysis_strategies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
