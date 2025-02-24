import OpenAI from "openai";
import { Message, AgentType } from "@/lib/types";
import { findTodoByContent } from "@/lib/db";

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

When users refer to todos by description rather than ID:
- Extract the task description from their message ("I've walked the dogs" -> "walk the dogs")
- For completion tasks, include the extracted task in the context
- For updates, include both the task description and the updates
- For delete tasks, extract the description of the task to be deleted

Pay special attention to delete operations:
- If a user says "delete the last task", look at the most recently created task
- If a user says "delete the task about X", extract "X" as the content to search for
- If a user says "remove all completed tasks", plan a delete operation for completed tasks
- Handle references like "get rid of that task" by looking at the conversation history

Remember the chat history when processing requests:
- Use previous messages to understand which task is being referenced
- If the user refers to "it" or "that task", check the most recently mentioned task
- If a user says "delete it", look for the most recently discussed task in the conversation

Consider:
- Data validation requirements
- State management implications
- User feedback needs
- Error handling scenarios

Example operations:
- "create a new todo" -> create operation, createTodo tool
- "mark todo as done" -> complete operation, completeTodo tool
- "I've walked the dogs" -> complete operation, completeTodo tool with "walk the dogs" as context
- "update priority" -> update operation, updateTodo tool
- "delete todo" -> delete operation, deleteTodo tool
- "show all todos" -> list operation, listTodos tool
- "delete the grocery shopping task" -> delete operation, deleteTodo tool with "grocery shopping" as content to search
- "get rid of it" -> delete operation for the most recently mentioned task

Provide clear, actionable plans that workers can execute efficiently.`;

/**
 * Extract recent context from chat history
 */
function extractRecentContext(chatContext: Message[]) {
  if (chatContext.length <= 1) return null;

  // Get the most recent messages (limit to last 5)
  const recentMessages = chatContext.slice(-5);

  // Extract todo IDs mentioned in recent messages
  const recentTodoIds = recentMessages
    .flatMap((msg) => msg.metadata?.todoIds || [])
    .filter((id) => id);

  // Extract matched content or tasks mentioned
  const recentTaskDescriptions = recentMessages
    .map((msg) => msg.metadata?.matchedTask || msg.metadata?.matchedContent)
    .filter((task) => !!task);

  // Find most recently completed or updated todo
  const recentlyModifiedTodos = recentMessages
    .filter((msg) => {
      const toolCalls = msg.metadata?.toolCalls || [];
      return toolCalls.some(
        (tool) =>
          tool.name === "completeTodo" ||
          tool.name === "updateTodo" ||
          tool.name === "createTodo"
      );
    })
    .flatMap((msg) => msg.metadata?.todoIds || [])
    .filter((id) => id);

  return {
    recentTodoIds: recentTodoIds.length > 0 ? recentTodoIds : null,
    mostRecentTodoId:
      recentTodoIds.length > 0 ? recentTodoIds[recentTodoIds.length - 1] : null,
    recentTaskDescriptions:
      recentTaskDescriptions.length > 0 ? recentTaskDescriptions : null,
    recentlyModifiedTodos:
      recentlyModifiedTodos.length > 0 ? recentlyModifiedTodos : null,
  };
}

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
            "Extract the user's intent and any relevant context from their message and chat history. Focus on todo-related actions and details. If the user implies they've completed a task, extract the task description.",
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

    // Extract potential task descriptions for content matching
    const taskExtraction = await openai.chat.completions.create({
      model: orchestratorConfig.model,
      temperature: 0.3,
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content: `Extract any task descriptions from the user's message that might match a todo item.
For example:
- "I've finished walking the dogs" -> "walk the dogs" or "walking the dogs"
- "Just finished grocery shopping" -> "grocery shopping" or "buy groceries"
- "Updated the project plan" -> "update project plan"
Output only the extracted task in simplified form. If no task is mentioned, respond with "NO_TASK_MENTIONED".`,
        },
        { role: "user", content: message },
      ],
    });

    const extractedTask = taskExtraction.choices[0]?.message?.content?.trim();
    console.log("Extracted potential task:", extractedTask);

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
        {
          role: "assistant",
          content: `Extracted intent: ${userIntent}\n${
            extractedTask && extractedTask !== "NO_TASK_MENTIONED"
              ? `Potential task reference: ${extractedTask}`
              : ""
          }`,
        },
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

      // If we're updating/completing/deleting a todo by content reference, try to find matching todos
      if (
        (plan.operation === "complete" ||
          plan.operation === "update" ||
          plan.operation === "delete") &&
        plan.context?.content &&
        !plan.context.todoId &&
        extractedTask &&
        extractedTask !== "NO_TASK_MENTIONED"
      ) {
        // Get active agent type from chat context
        // Default to "vercel" if we can't determine the agent type
        let agentType: AgentType = "vercel";

        // Try to extract agent type from message metadata
        const messagesWithAgentType = chatContext.filter(
          (m) => m.metadata && "activeAgent" in (m.metadata as any)
        );

        if (messagesWithAgentType.length > 0) {
          const latestWithAgentType =
            messagesWithAgentType[messagesWithAgentType.length - 1];
          if (latestWithAgentType && latestWithAgentType.metadata) {
            agentType =
              (latestWithAgentType.metadata as any).activeAgent || "vercel";
          }
        }

        // Try to find a todo that matches the extracted content
        const contentToSearch = plan.context.content || extractedTask;
        console.log("Searching for todo by content:", contentToSearch);

        const contentSearch = await findTodoByContent(
          contentToSearch,
          agentType
        );

        if (
          contentSearch.success &&
          contentSearch.todos &&
          contentSearch.todos.length > 0
        ) {
          // Add the todoId to the plan context
          plan.context.todoId = contentSearch.todos[0].id;
          plan.context.matchedTodo = contentSearch.todos[0];
          console.log("Matched todo by content:", contentSearch.todos[0]);
        } else if (plan.operation === "delete" && chatContext.length > 1) {
          // For delete operations with no direct content match, try to find the most recently discussed todo
          console.log(
            "No direct content match for delete. Looking for recently mentioned todos..."
          );

          // Extract recent context from chat history
          const recentContext = extractRecentContext(chatContext);

          if (recentContext && recentContext.mostRecentTodoId) {
            // Use the most recent todo ID
            plan.context.todoId = recentContext.mostRecentTodoId;
            console.log(
              "Using most recently mentioned todo:",
              recentContext.mostRecentTodoId
            );

            // If we have recent task descriptions, add them to the context for better responses
            if (recentContext.recentTaskDescriptions) {
              plan.context.recentTaskDescriptions =
                recentContext.recentTaskDescriptions;
            }
          }
        }
      }

      return {
        success: true,
        plan,
        intent: userIntent,
        matchedTask:
          extractedTask !== "NO_TASK_MENTIONED" ? extractedTask : undefined,
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
