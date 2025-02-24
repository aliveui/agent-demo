-- Drop existing tables if they exist
DROP TABLE IF EXISTS agent_interactions;
DROP TABLE IF EXISTS agent_metrics;
DROP TABLE IF EXISTS todos;

-- Create todos table
CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  agent_type TEXT NOT NULL, -- vercel | langchain | mastra | kaiban
  created_by TEXT NOT NULL, -- user | agent
  metadata JSONB,
  priority INTEGER DEFAULT 0,
  labels TEXT[],
  complexity FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create agent_metrics table
CREATE TABLE IF NOT EXISTS agent_metrics (
  id TEXT PRIMARY KEY,
  agent_type TEXT NOT NULL,
  response_time FLOAT NOT NULL,
  success_rate FLOAT NOT NULL,
  interaction_count INTEGER NOT NULL,
  todo_success INTEGER NOT NULL,
  todo_failed INTEGER NOT NULL,
  memory_usage FLOAT,
  token_usage INTEGER,
  cost_per_operation FLOAT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create agent_interactions table
CREATE TABLE IF NOT EXISTS agent_interactions (
  id TEXT PRIMARY KEY,
  agent_type TEXT NOT NULL,
  user_input TEXT NOT NULL,
  agent_output TEXT NOT NULL,
  duration FLOAT NOT NULL,
  success BOOLEAN NOT NULL,
  todo_ids TEXT[],
  planning_steps JSONB,
  tools_used JSONB,
  error_recovery JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_todos_agent_type ON todos(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_type ON agent_metrics(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_type ON agent_interactions(agent_type); 