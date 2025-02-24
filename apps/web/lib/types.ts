import { Message as AIMessage } from "ai";

export type AgentType = "vercel" | "langchain" | "mastra" | "kaiban";

export interface Message extends AIMessage {
  timestamp: Date;
  metadata?: {
    toolCalls?: ToolCall[];
    todoIds?: string[];
    error?: string;
    plan?: {
      operation: string;
      complexity: string;
      requiredTools: string[];
      context?: Record<string, any>;
      intent?: string;
    };
    evaluation?: {
      qualityScore: number;
      requiresAction: boolean;
      isConversational: boolean;
      contextRetention: number;
      specificIssues: string[];
      improvementSuggestions: string[];
      suggestedResponse?: string;
    };
  };
}

export interface ToolCall {
  id: string;
  type: "function";
  name: string;
  arguments: string;
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
  priority: number;
  labels: string[];
  complexity: number;
  agentType: AgentType;
  createdBy: string;
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
