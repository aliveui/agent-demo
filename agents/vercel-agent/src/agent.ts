import { OpenAI } from "openai";
import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  AgentExecutor,
  initializeAgentExecutorWithOptions,
} from "langchain/agents";
import { DynamicTool } from "langchain/tools";
import type { Todo, TodoAction, TodoStore } from "./types";
import { v4 as uuidv4 } from "uuid";

export type ToolEventHandler = (event: {
  id: string;
  tool: string;
  input: any[];
  timestamp: Date;
  status: "pending" | "success" | "error";
  output: any;
}) => void;

export class TodoAgent {
  private store: TodoStore;
  private agent!: AgentExecutor;
  private toolEventHandler?: ToolEventHandler;

  constructor(
    store: TodoStore,
    apiKey: string,
    toolEventHandler?: ToolEventHandler
  ) {
    this.store = store;
    this.toolEventHandler = toolEventHandler;

    const model = new ChatOpenAI({
      modelName: "gpt-4-turbo-preview",
      temperature: 0.7,
      openAIApiKey: apiKey,
    });

    const wrapToolFunction = (
      name: string,
      func: (...args: any[]) => Promise<any>
    ) => {
      return async (...args: any[]) => {
        if (!this.toolEventHandler) return func(...args);

        const toolAction = {
          id: uuidv4(),
          tool: name,
          input: args,
          timestamp: new Date(),
          status: "pending" as const,
          output: null,
        };

        this.toolEventHandler(toolAction);

        try {
          const output = await func(...args);
          this.toolEventHandler({
            ...toolAction,
            output,
            status: "success" as const,
          });
          return output;
        } catch (error) {
          this.toolEventHandler({
            ...toolAction,
            output: error,
            status: "error" as const,
          });
          throw error;
        }
      };
    };

    const tools = [
      new DynamicTool({
        name: "listTodos",
        description: "List all todos",
        func: wrapToolFunction("listTodos", async () => {
          const todos = await this.store.listTodos();
          return JSON.stringify(todos);
        }),
      }),
      new DynamicTool({
        name: "getTodo",
        description: "Get a specific todo by ID",
        func: wrapToolFunction("getTodo", async (id: string) => {
          const todo = await this.store.getTodo(id);
          return JSON.stringify(todo);
        }),
      }),
      new DynamicTool({
        name: "createTodo",
        description:
          "Create a new todo with title, optional description, priority (low/medium/high), optional dueDate, and optional category",
        func: wrapToolFunction("createTodo", async (input: string) => {
          const params = JSON.parse(input);
          const todo = await this.store.addTodo({
            title: params.title,
            description: params.description,
            priority: params.priority || "medium",
            dueDate: params.dueDate,
            category: params.category,
            completed: false,
          });
          return JSON.stringify(todo);
        }),
      }),
      new DynamicTool({
        name: "updateTodo",
        description: "Update a todo by ID with new values",
        func: wrapToolFunction("updateTodo", async (input: string) => {
          const { id, updates } = JSON.parse(input);
          const todo = await this.store.updateTodo(id, updates);
          return JSON.stringify(todo);
        }),
      }),
      new DynamicTool({
        name: "deleteTodo",
        description: "Delete a todo by ID",
        func: wrapToolFunction("deleteTodo", async (id: string) => {
          await this.store.deleteTodo(id);
          return JSON.stringify({ success: true });
        }),
      }),
    ];

    // Initialize the agent with system message
    const systemMessage = `You are a helpful todo list manager. When listing todos, always return them in a clear format. For the listTodos command, return the raw JSON array without any additional text. For other commands, provide a brief confirmation of the action taken.`;

    this.initializeAgent(tools, model, systemMessage);
  }

  private async initializeAgent(
    tools: DynamicTool[],
    model: ChatOpenAI,
    systemMessage: string
  ) {
    this.agent = await initializeAgentExecutorWithOptions(tools, model, {
      agentType: "chat-conversational-react-description",
      verbose: true,
      agentArgs: {
        systemMessage,
      },
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
