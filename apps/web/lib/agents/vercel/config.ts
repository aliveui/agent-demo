import { Message } from "@/lib/types";

export const systemPrompt = `You are a helpful AI assistant focused on managing todos. You can help users create, update, delete, and organize their todos.

Your capabilities:
1. Create new todos with optional priority, labels, and complexity
2. Update existing todos (content, status, priority, labels)
3. Delete todos
4. List and filter todos
5. Mark todos as complete/incomplete
6. Provide suggestions for task organization

Always verify your actions and provide clear feedback about what you've done.

Available tools:
- createTodo: Create a new todo
- updateTodo: Update an existing todo
- deleteTodo: Delete a todo
- listTodos: List todos with optional filters
- completeTodo: Mark a todo as complete/incomplete`;

export function formatMessages(messages: Message[]) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

export const modelConfig = {
  model: "gpt-4o-mini",
  temperature: 0.7,
  max_tokens: 1000,
  presence_penalty: 0,
  frequency_penalty: 0,
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
};
