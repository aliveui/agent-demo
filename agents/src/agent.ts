import { OpenAI } from "openai";
import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  AgentExecutor,
  initializeAgentExecutorWithOptions,
} from "langchain/agents";
import { DynamicTool } from "langchain/tools";
import type { Todo, TodoAction, TodoStore } from "./types";

export class TodoAgent {
  private store: TodoStore;
  private agent!: AgentExecutor;

  constructor(store: TodoStore, apiKey: string) {
    this.store = store;

    const model = new ChatOpenAI({
      modelName: "gpt-4-turbo-preview",
      temperature: 0.7,
      openAIApiKey: apiKey,
    });

    const tools = [
      new DynamicTool({
        name: "listTodos",
        description: "List all todos",
        func: async () => {
          const todos = await this.store.listTodos();
          return JSON.stringify(todos);
        },
      }),
      new DynamicTool({
        name: "getTodo",
        description: "Get a specific todo by ID",
        func: async (id: string) => {
          const todo = await this.store.getTodo(id);
          return JSON.stringify(todo);
        },
      }),
      new DynamicTool({
        name: "createTodo",
        description:
          "Create a new todo with title, optional description, priority (low/medium/high), optional dueDate, and optional category",
        func: async (input: string) => {
          const params = JSON.parse(input);
          const todo = await this.store.addTodo({
            title: params.title,
            description: params.description,
            priority: params.priority,
            dueDate: params.dueDate,
            category: params.category,
            completed: false,
          });
          return JSON.stringify(todo);
        },
      }),
      new DynamicTool({
        name: "updateTodo",
        description: "Update a todo by ID with new values",
        func: async (input: string) => {
          const { id, updates } = JSON.parse(input);
          const todo = await this.store.updateTodo(id, updates);
          return JSON.stringify(todo);
        },
      }),
      new DynamicTool({
        name: "deleteTodo",
        description: "Delete a todo by ID",
        func: async (id: string) => {
          await this.store.deleteTodo(id);
          return JSON.stringify({ success: true });
        },
      }),
    ];

    // Initialize the agent
    this.initializeAgent(tools, model);
  }

  private async initializeAgent(tools: DynamicTool[], model: ChatOpenAI) {
    this.agent = await initializeAgentExecutorWithOptions(tools, model, {
      agentType: "chat-conversational-react-description",
      verbose: true,
    });
  }

  async processMessage(message: string) {
    try {
      if (!this.agent) {
        throw new Error("Agent not initialized");
      }
      const response = await this.agent.call({ input: message });
      return response.output;
    } catch (error) {
      console.error("Error processing message:", error);
      throw error;
    }
  }

  async handleAction(action: TodoAction) {
    switch (action.type) {
      case "CREATE":
        return await this.store.addTodo(action.payload);
      case "UPDATE":
        return await this.store.updateTodo(action.payload.id, action.payload);
      case "DELETE":
        await this.store.deleteTodo(action.payload.id);
        return { success: true };
      case "COMPLETE":
        return await this.store.updateTodo(action.payload.id, {
          completed: true,
        });
      case "UNCOMPLETE":
        return await this.store.updateTodo(action.payload.id, {
          completed: false,
        });
      default:
        throw new Error("Invalid action type");
    }
  }
}
