import OpenAI from "openai";
import { Message, AgentType } from "@/lib/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export const orchestratorConfig = {
  model: "gpt-4o-mini",
  temperature: 0.7,
  max_tokens: 1000,
  functions: [
    {
      name: "planTodoOperation",
      description: "Plan the execution of a todo operation",
      parameters: {
        type: "object",
        properties: {
          operation: {
            type: "string",
            enum: ["create", "update", "complete", "delete", "list"],
            description: "The type of operation to perform",
          },
          complexity: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Estimated complexity of the operation",
          },
          requiredTools: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "createTodo",
                "updateTodo",
                "completeTodo",
                "deleteTodo",
                "listTodos",
              ],
            },
            description: "Tools required for this operation",
          },
          context: {
            type: "object",
            properties: {
              todoId: { type: "string" },
              content: { type: "string" },
              priority: { type: "integer" },
              labels: { type: "array", items: { type: "string" } },
              completed: { type: "boolean" },
            },
          },
        },
        required: ["operation", "complexity", "requiredTools"],
      },
    },
  ],
};

export const orchestratorPrompt = `You are a senior todo management orchestrator.
Your role is to analyze user requests and plan the execution of todo operations.

For each request, you MUST:
1. Determine the type of operation needed (create/update/complete/delete/list)
2. Assess the complexity (low/medium/high)
3. Identify required tools from: createTodo, updateTodo, completeTodo, deleteTodo, listTodos
4. Extract relevant context (todoId, content, priority, labels, completed status)

ALWAYS use the planTodoOperation function to respond with your analysis.

Consider:
- Data validation requirements
- State management implications
- User feedback needs
- Error handling scenarios

Example operations:
- "create a new todo" -> create operation, createTodo tool
- "mark todo as done" -> complete operation, completeTodo tool
- "update priority" -> update operation, updateTodo tool
- "delete todo" -> delete operation, deleteTodo tool
- "show all todos" -> list operation, listTodos tool

Provide clear, actionable plans that workers can execute efficiently.`;

export async function planOperation(
  message: string,
  chatContext: Message[] = []
) {
  try {
    console.log("Planning operation for message:", message);
    console.log("Chat context:", chatContext.length, "messages");

    // First, get the user's intent and context
    const intentCompletion = await openai.chat.completions.create({
      model: orchestratorConfig.model,
      temperature: 0.7,
      max_tokens: 1000,
      messages: [
        {
          role: "system",
          content:
            "Extract the user's intent and any relevant context from their message and chat history. Focus on todo-related actions and details.",
        },
        ...chatContext.map((msg) => ({
          role: msg.role === "data" ? "user" : msg.role,
          content: msg.content,
        })),
        { role: "user", content: message },
      ],
    });

    const userIntent = intentCompletion.choices[0]?.message?.content;
    if (!userIntent) {
      console.error("No intent extracted from message");
      return {
        success: false,
        error: "Failed to understand user intent",
      };
    }
    console.log("Extracted user intent:", userIntent);

    // Then, plan the operation
    console.log("Generating operation plan...");
    const planCompletion = await openai.chat.completions.create({
      model: orchestratorConfig.model,
      temperature: orchestratorConfig.temperature,
      max_tokens: orchestratorConfig.max_tokens,
      messages: [
        { role: "system", content: orchestratorPrompt },
        ...chatContext.map((msg) => ({
          role: msg.role === "data" ? "user" : msg.role,
          content: msg.content,
        })),
        { role: "user", content: message },
        { role: "assistant", content: `Extracted intent: ${userIntent}` },
      ],
      functions: orchestratorConfig.functions,
      function_call: { name: "planTodoOperation" },
    });

    const response = planCompletion.choices[0]?.message;
    if (!response) {
      console.error("No response from planning completion");
      return {
        success: false,
        error: "No response from planner",
      };
    }

    if (!response.function_call) {
      console.error("No function call in response:", response);
      return {
        success: false,
        error: "Planner did not generate an operation plan",
      };
    }

    try {
      const plan = JSON.parse(response.function_call.arguments);
      console.log("Generated plan:", JSON.stringify(plan, null, 2));

      // Validate plan structure
      if (!plan.operation || !plan.complexity || !plan.requiredTools) {
        console.error("Invalid plan structure:", plan);
        return {
          success: false,
          error: "Invalid plan structure",
        };
      }

      return {
        success: true,
        plan,
        intent: userIntent,
      };
    } catch (parseError) {
      console.error("Error parsing plan:", parseError);
      return {
        success: false,
        error: "Failed to parse operation plan",
      };
    }
  } catch (error) {
    console.error("Error in operation planning:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? `Planning failed: ${error.message}`
          : "Unknown planning error",
    };
  }
}
