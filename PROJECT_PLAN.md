# AI Agent Comparison Project Plan

## Overview

A comparative analysis platform for different AI agent implementations through a unified todo application interface. Each agent implementation will use the same database and OpenAI API key to ensure fair comparison.

## Design Principles

1. **Simplicity First**: Start with the simplest solution and increase complexity only when needed
2. **Transparency**: Make agent planning and decision-making steps visible
3. **Well-Documented Tools**: Carefully craft the agent-computer interface (ACI)
4. **Ground Truth**: Ensure agents can verify their progress
5. **Human Oversight**: Include checkpoints for human feedback

## Technical Stack

### Core Dependencies

- **Framework**: Next.js 14 (App Router)
- **Database**: Neon PostgreSQL with @vercel/postgres
- **AI Provider**: OpenAI (shared API key across implementations)
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js
- **State Management**: React Context + Zustand

### Development Environment

- Node.js v18.17 or higher
- pnpm v8.0 or higher
- VS Code with recommended extensions
- Git v2.30 or higher

### Agent Implementations

1. Vercel AI SDK
2. LangChain
3. Mastra
4. Kaiban

## Database Schema

```sql
-- Simple SQL schema without ORM complexity
CREATE TABLE todos (
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

CREATE TABLE agent_metrics (
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

CREATE TABLE agent_interactions (
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

-- Indexes for better performance
CREATE INDEX idx_todos_agent_type ON todos(agent_type);
CREATE INDEX idx_agent_metrics_type ON agent_metrics(agent_type);
CREATE INDEX idx_agent_interactions_type ON agent_interactions(agent_type);
```

### Database Usage Example

```typescript
// lib/db.ts
import { sql } from "@vercel/postgres";

export async function createTodo(todo: {
  content: string;
  agentType: string;
  createdBy: string;
}) {
  const id = crypto.randomUUID();
  await sql`
    INSERT INTO todos (id, content, agent_type, created_by)
    VALUES (${id}, ${todo.content}, ${todo.agentType}, ${todo.createdBy})
  `;
  return id;
}

export async function getTodosByAgent(agentType: string) {
  const { rows } = await sql`
    SELECT * FROM todos 
    WHERE agent_type = ${agentType}
    ORDER BY created_at DESC
  `;
  return rows;
}

export async function trackAgentMetrics(metrics: {
  agentType: string;
  responseTime: number;
  successRate: number;
  // ... other metrics
}) {
  await sql`
    INSERT INTO agent_metrics (
      id, agent_type, response_time, success_rate, 
      interaction_count, todo_success, todo_failed
    )
    VALUES (
      ${crypto.randomUUID()}, ${metrics.agentType}, 
      ${metrics.responseTime}, ${metrics.successRate},
      1, 0, 0
    )
  `;
}
```

## Component Structure

### Shared Components (shadcn/ui)

- Tabs
- Card
- Input
- Button
- Dialog
- Toast
- Form components

### Custom Components

```typescript
// Component hierarchy
- Layout
  ├── AgentTabs
  │   ├── TodoSection
  │   │   ├── TodoList
  │   │   │   └── TodoItem
  │   │   └── TodoMetrics
  │   └── AgentSection
  │       ├── AgentChat
  │       │   ├── ChatInput
  │       │   └── ChatMessages
  │       ├── PlanningVisualizer
  │       ├── ToolUsageTracker
  │       ├── DecisionTreeView
  │       └── AgentMetrics
  └── ComparisonDashboard
      ├── PerformanceGraphs
      ├── TokenUsageMeters
      ├── MemoryUtilization
      └── CostAnalysis
```

## Metrics Tracking

### Performance Metrics

- Response Time (ms)
- Success Rate (%)
- Interaction Count
- Todo Completion Rate
- Context Retention Score
- Token Usage

### Comparison Points

1. Task Completion Accuracy
2. Natural Language Understanding
3. Context Management
4. Error Handling
5. Response Quality
6. Resource Usage

## Implementation Phases

### Phase 1: Foundation

- [x] Project setup with Next.js
- [x] shadcn/ui integration
- [x] Neon DB connection
- [x] Basic layout implementation

### Phase 2: Core Features

- [ ] Todo CRUD operations
- [ ] Basic agent chat interface
- [ ] Metrics collection system
- [ ] Real-time updates

### Phase 3: Agent Integration

- [ ] Vercel AI implementation
- [ ] LangChain implementation
- [ ] Mastra implementation
- [ ] Kaiban implementation

### Phase 4: Comparison Features

- [ ] Metrics dashboard
- [ ] Performance comparisons
- [ ] Export functionality
- [ ] Analysis tools

## Environment Configuration

```env
# Base Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Shared AI Configuration
OPENAI_API_KEY=sk-...  # Shared across all agents

# Database Configuration
POSTGRES_URL=postgres://...  # Neon DB connection
POSTGRES_PRISMA_URL=postgres://...  # Prisma connection

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret

# Agent-Specific (if needed)
VERCEL_AI_API_KEY=
LANGCHAIN_API_KEY=
MASTRA_API_KEY=
KAIBAN_API_KEY=
```

## Development Guidelines

### Code Organization

- Use feature-based folder structure
- Implement shared hooks for common functionality
- Maintain consistent error handling
- Use TypeScript strictly

### State Management

- Use React Context for global state
- Implement optimistic updates
- Handle real-time synchronization
- Maintain agent state isolation

### Testing Strategy

- Unit tests for utilities
- Integration tests for agent interactions
- E2E tests for critical flows
- Performance benchmarking

### Security Considerations

- Secure API key handling
- Rate limiting
- Input validation
- Error boundaries

## Deployment Strategy

- Vercel for hosting
- Neon DB for database
- Environment variable management
- Monitoring setup

## Success Criteria

1. All agents successfully complete basic todo operations
2. Metrics collection is accurate and meaningful
3. UI is responsive and intuitive
4. Real-time updates work consistently
5. Performance impact is minimal
6. Clear comparison data is available

## Next Steps

1. Implement basic todo functionality
2. Add agent chat interface
3. Integrate first agent (Vercel AI)
4. Set up metrics collection
5. Implement remaining agents
6. Build comparison dashboard
