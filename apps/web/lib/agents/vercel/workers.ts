import OpenAI from "openai";
import { Message, AgentType } from "@/lib/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface WorkerConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  systemPrompt: string;
  functions: any[];
}

const baseWorkerConfig = {
  model: "gpt-4o-mini",
  temperature: 0.7,
  max_tokens: 1000,
};

export const workers: Record<string, WorkerConfig> = {
  create: {
    ...baseWorkerConfig,
    systemPrompt: `You are a todo creation specialist.
Focus on creating well-structured todos with appropriate metadata.
Ensure all required fields are provided and validate input data.
Consider priority levels and labels for better organization.`,
    functions: [
      {
        name: "createTodo",
        description: "Create a new todo item",
        parameters: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "The content of the todo",
            },
            priority: {
              type: "integer",
              description: "Priority level (0-5, where 5 is highest)",
              minimum: 0,
              maximum: 5,
            },
            labels: {
              type: "array",
              items: { type: "string" },
              description: "Labels/tags for the todo",
            },
            complexity: {
              type: "number",
              description: "Estimated complexity (0-1)",
              minimum: 0,
              maximum: 1,
            },
          },
          required: ["content"],
        },
      },
    ],
  },

  update: {
    ...baseWorkerConfig,
    systemPrompt: `You are a todo update specialist.
Focus on modifying existing todos while maintaining data integrity.
Handle partial updates and validate changed fields.
Ensure updates don't introduce inconsistencies.`,
    functions: [
      {
        name: "updateTodo",
        description: "Update an existing todo",
        parameters: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The ID of the todo to update",
            },
            content: {
              type: "string",
              description: "New content for the todo",
            },
            completed: {
              type: "boolean",
              description: "Whether the todo is completed",
            },
            priority: {
              type: "integer",
              description: "New priority level (0-5)",
            },
            labels: {
              type: "array",
              items: { type: "string" },
              description: "New labels for the todo",
            },
          },
          required: ["id"],
        },
      },
    ],
  },

  complete: {
    ...baseWorkerConfig,
    systemPrompt: `You are a todo completion specialist.
Focus on managing todo completion status accurately.
Handle completion state transitions and related updates.
Ensure proper feedback for completion actions.`,
    functions: [
      {
        name: "completeTodo",
        description: "Mark a todo as complete or incomplete",
        parameters: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The ID of the todo to update",
            },
            completed: {
              type: "boolean",
              description:
                "Whether to mark the todo as completed (true) or incomplete (false)",
            },
          },
          required: ["id", "completed"],
        },
      },
    ],
  },

  delete: {
    ...baseWorkerConfig,
    systemPrompt: `You are a todo deletion specialist.
Focus on safely removing todos while maintaining referential integrity.
Verify deletion permissions and handle cascading effects.
Provide clear feedback about deletion results.`,
    functions: [
      {
        name: "deleteTodo",
        description: "Delete a todo",
        parameters: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The ID of the todo to delete",
            },
          },
          required: ["id"],
        },
      },
    ],
  },

  list: {
    ...baseWorkerConfig,
    systemPrompt: `You are a todo listing specialist.
Focus on retrieving and filtering todos effectively.
Handle various filter combinations and sorting options.
Present results in a clear, organized manner.`,
    functions: [
      {
        name: "listTodos",
        description: "List todos with optional filters",
        parameters: {
          type: "object",
          properties: {
            completed: {
              type: "boolean",
              description: "Filter by completion status",
            },
            priority: {
              type: "integer",
              description: "Filter by priority level",
            },
            labels: {
              type: "array",
              items: { type: "string" },
              description: "Filter by labels",
            },
          },
        },
      },
    ],
  },
};

export async function executeOperation(
  operation: string,
  context: any,
  message: string,
  chatContext: Message[] = []
) {
  console.log("Executing operation:", { operation, context, message });
  console.log("Chat context:", chatContext.length, "messages");

  const worker = workers[operation];
  if (!worker) {
    console.error("Invalid operation type:", operation);
    return {
      success: false,
      error: `No worker found for operation: ${operation}`,
    };
  }

  try {
    console.log("Using worker:", {
      operation,
      systemPrompt: worker.systemPrompt.split("\n")[0], // Log first line of prompt
      availableFunctions: worker.functions.map((f) => f.name),
    });

    const completion = await openai.chat.completions.create({
      model: worker.model,
      temperature: worker.temperature,
      max_tokens: worker.max_tokens,
      messages: [
        { role: "system", content: worker.systemPrompt },
        ...chatContext.map((msg) => ({
          role: msg.role === "data" ? "user" : msg.role,
          content: msg.content,
        })),
        {
          role: "user",
          content: `${message}\n\nContext: ${JSON.stringify(context, null, 2)}`,
        },
      ],
      functions: worker.functions,
      function_call: { name: worker.functions[0].name }, // Force using the worker's function
    });

    const response = completion.choices[0]?.message;
    if (!response) {
      console.error("No response from worker");
      return {
        success: false,
        error: "Worker did not generate a response",
      };
    }

    if (!response.function_call) {
      console.error("No function call in worker response:", response);
      return {
        success: false,
        error: "Worker did not generate an action",
      };
    }

    try {
      const args = JSON.parse(response.function_call.arguments);
      console.log("Worker generated action:", {
        name: response.function_call.name,
        args: args,
      });

      return {
        success: true,
        action: {
          name: response.function_call.name,
          arguments: args,
        },
        explanation: response.content,
      };
    } catch (parseError) {
      console.error("Error parsing worker response:", parseError);
      return {
        success: false,
        error: "Failed to parse worker action",
      };
    }
  } catch (error) {
    console.error("Error in worker execution:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? `Worker execution failed: ${error.message}`
          : "Unknown worker error",
    };
  }
}
