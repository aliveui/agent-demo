export type AgentType = "vercel" | "langchain" | "mastra" | "kaiban";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    toolCalls?: ToolCall[];
    todoIds?: string[];
    error?: string;
  };
}

export interface ToolCall {
  id: string;
  type: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
  error?: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  activeAgent: AgentType;
}

export interface Todo {
  id: string;
  content: string;
  completed: boolean;
  agentType: AgentType;
  createdBy: "user" | "agent";
  metadata?: Record<string, any>;
  priority: number;
  labels: string[];
  complexity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentMetrics {
  id: string;
  agentType: AgentType;
  responseTime: number;
  successRate: number;
  interactionCount: number;
  todoSuccess: number;
  todoFailed: number;
  memoryUsage?: number;
  tokenUsage?: number;
  costPerOperation?: number;
  timestamp: Date;
}

export interface AgentInteraction {
  id: string;
  agentType: AgentType;
  userInput: string;
  agentOutput: string;
  duration: number;
  success: boolean;
  todoIds: string[];
  planningSteps?: Record<string, any>;
  toolsUsed?: ToolCall[];
  errorRecovery?: Record<string, any>;
  timestamp: Date;
}
