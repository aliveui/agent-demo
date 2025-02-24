import {
  createTodo,
  updateTodo,
  deleteTodo,
  listTodos,
  getTodoById,
  findTodoByContent,
  findTodoByContentEnhanced,
} from "@/lib/db";
import { AgentType } from "@/lib/types";

/**
 * Validates an operation before execution
 */
export async function validateOperation(
  operation: string,
  actionName: string,
  args: any,
  context: any,
  agentType: AgentType
): Promise<{
  isValid: boolean;
  correctedAction?: { name: string; arguments: any };
  error?: string;
  validationDetails?: any;
}> {
  console.log("Validating operation:", { operation, actionName, args });

  // Basic validation - verify the operation and action match
  const validActionMap: Record<string, string[]> = {
    create: ["createTodo"],
    update: ["updateTodo"],
    complete: ["completeTodo"],
    delete: ["deleteTodo"],
    list: ["listTodos"],
  };

  const validActions = validActionMap[operation] || [];
  if (!validActions.includes(actionName)) {
    return {
      isValid: false,
      error: `Invalid action type for operation: Expected ${validActions.join(", ")}, got ${actionName}`,
      validationDetails: {
        expectedActions: validActions,
        actualAction: actionName,
      },
    };
  }

  // Validate required arguments
  const requiredArgsMap: Record<string, string[]> = {
    createTodo: ["content"],
    updateTodo: ["id"],
    completeTodo: ["id", "completed"],
    deleteTodo: ["id"],
    listTodos: [], // No required args
  };

  const requiredArgs = requiredArgsMap[actionName] || [];
  const missingArgs = requiredArgs.filter((arg) => args[arg] === undefined);

  if (missingArgs.length > 0) {
    return {
      isValid: false,
      error: `Missing required arguments: ${missingArgs.join(", ")}`,
      validationDetails: { required: requiredArgs, missing: missingArgs },
    };
  }

  // Validate priority if provided
  if (args.priority !== undefined && (args.priority < 0 || args.priority > 5)) {
    return {
      isValid: false,
      error: `Invalid priority value: ${args.priority}. Must be between 0 and 5`,
      validationDetails: {
        field: "priority",
        value: args.priority,
        allowedRange: "0-5",
      },
    };
  }

  // Special validations for ID-based operations
  if (["updateTodo", "completeTodo", "deleteTodo"].includes(actionName)) {
    // First try getting todo by ID
    try {
      // Ensure args.id is a string
      if (typeof args.id === "string") {
        const todoByIdResult = await getTodoById(args.id);
        if (todoByIdResult.success && todoByIdResult.todo) {
          return {
            isValid: true,
            validationDetails: {
              action: actionName,
              operation,
              validationPassed: true,
              todoFound: true,
              method: "direct_id",
            },
          };
        }
      }
    } catch (e) {
      console.log("Error finding todo by ID, will try content matching", e);
    }

    // If we get here, ID lookup failed - try enhanced content matching
    // Collect all possible content sources
    const contentSources = [];

    if (context?.content) contentSources.push(context.content);
    if (context?.matchedTask) contentSources.push(context.matchedTask);
    if (context?.matchedContent) contentSources.push(context.matchedContent);
    if (args?.content) contentSources.push(args.content);

    // Try to match by content using our enhanced matcher
    for (const content of contentSources) {
      if (typeof content === "string" && content.trim() !== "") {
        try {
          console.log(`Trying enhanced content matching for: "${content}"`);
          // Use the enhanced matching function that tries both word-level and semantic matching
          const matchResult = await findTodoByContentEnhanced(
            content,
            agentType
          );

          if (
            matchResult.success &&
            matchResult.todos &&
            matchResult.todos.length > 0
          ) {
            const matchedTodo = matchResult.todos[0];
            const matchMethod = matchResult.matchMethod || "word";
            const matchScore = matchResult.bestScore
              ? ` (score: ${matchResult.bestScore.toFixed(2)})`
              : "";

            console.log(
              `Found todo by ${matchMethod} matching: "${matchedTodo.content}" (ID: ${matchedTodo.id})${matchScore}`
            );

            // Create a corrected action
            const correctedArgs = { ...args, id: matchedTodo.id };

            return {
              isValid: true,
              correctedAction: {
                name: actionName,
                arguments: correctedArgs,
              },
              validationDetails: {
                action: actionName,
                operation,
                validationPassed: true,
                todoFound: true,
                method: `${matchMethod}_match`,
                originalId: args.id,
                matchedId: matchedTodo.id,
                matchedContent: matchedTodo.content,
                matchedTerms: matchResult.matchedTerms,
                matchScore: matchResult.bestScore,
              },
            };
          }
        } catch (e) {
          console.log("Error during content matching for:", content, e);
        }
      }
    }

    // If we get here, both ID and content matching failed
    return {
      isValid: false,
      error: `Todo not found using ID "${args.id}" or by content matching. Cannot perform ${actionName}`,
      validationDetails: {
        todoFound: false,
        triedDirectId: true,
        triedContentMatch: contentSources.length > 0,
      },
    };
  }

  // For updateTodo, ensure there's at least one field to update
  if (actionName === "updateTodo" && Object.keys(args).length <= 1) {
    return {
      isValid: false,
      error:
        "No fields to update. At least one of content, completed, priority, or labels must be provided",
      validationDetails: {
        providedFields: Object.keys(args),
      },
    };
  }

  // All validation passed
  return {
    isValid: true,
    validationDetails: {
      action: actionName,
      operation,
      validationPassed: true,
    },
  };
}

/**
 * Execute a validated operation
 */
export async function executeValidatedOperation(
  action: { name: string; arguments: any },
  agentType: AgentType
): Promise<{
  success: boolean;
  todoIds: string[];
  error?: string;
  data?: any;
}> {
  console.log("Executing validated operation:", action);

  const args = action.arguments;
  let todoIds: string[] = [];
  let error: string | undefined;
  let data: any = undefined;

  try {
    switch (action.name) {
      case "createTodo": {
        const result = await createTodo({
          content: args.content,
          agentType,
          createdBy: "agent",
          priority: args.priority,
          labels: args.labels,
          complexity: args.complexity,
        });
        if (result.success && result.todo) {
          todoIds.push(result.todo.id);
          data = result.todo;
        } else {
          error = "Failed to create todo";
        }
        break;
      }
      case "updateTodo": {
        const result = await updateTodo({
          id: args.id,
          content: args.content,
          completed: args.completed,
          priority: args.priority,
          labels: args.labels,
          complexity: args.complexity,
        });
        if (result.success && result.todo) {
          todoIds.push(result.todo.id);
          data = result.todo;
        } else {
          error = "Failed to update todo";
        }
        break;
      }
      case "completeTodo": {
        const result = await updateTodo({
          id: args.id,
          completed: args.completed,
        });
        if (result.success && result.todo) {
          todoIds.push(result.todo.id);
          data = result.todo;
        } else {
          error = "Failed to update todo completion status";
        }
        break;
      }
      case "deleteTodo": {
        const result = await deleteTodo(args.id);
        if (result.success) {
          todoIds.push(args.id);
          data = { id: args.id, deleted: true };
        } else {
          error = "Failed to delete todo";
        }
        break;
      }
      case "listTodos": {
        const result = await listTodos({
          agentType,
          completed: args.completed,
          priority: args.priority,
          labels: args.labels,
        });
        if (result.success && result.todos) {
          todoIds = result.todos.map((todo) => todo.id);
          data = result.todos;
        } else {
          error = "Failed to list todos";
        }
        break;
      }
      default:
        error = `Unknown action: ${action.name}`;
    }

    return {
      success: !error,
      todoIds,
      error,
      data,
    };
  } catch (err) {
    console.error("Error executing operation:", err);
    return {
      success: false,
      todoIds: [],
      error: err instanceof Error ? err.message : "Operation execution failed",
    };
  }
}

/**
 * Verify that an operation was successful
 */
export async function verifyOperationSuccess(
  action: { name: string; arguments: any },
  result: { success: boolean; todoIds: string[]; error?: string; data?: any },
  agentType: AgentType
): Promise<{
  verified: boolean;
  error?: string;
  verificationDetails?: any;
}> {
  console.log("Verifying operation success:", {
    action: action.name,
    success: result.success,
    todoIds: result.todoIds,
  });

  if (!result.success) {
    return {
      verified: false,
      error: result.error || "Operation failed",
      verificationDetails: {
        action: action.name,
        result: "failed",
        reason: result.error,
      },
    };
  }

  // For actions that should affect a todo, verify the todo exists/was modified
  switch (action.name) {
    case "createTodo": {
      if (result.todoIds.length === 0) {
        return {
          verified: false,
          error: "No todo was created",
          verificationDetails: {
            action: action.name,
            result: "no_todo_created",
          },
        };
      }

      // Verify the todo was created correctly
      try {
        const todoId = result.todoIds[0];
        if (typeof todoId === "string") {
          const todoCheck = await getTodoById(todoId);
          if (!todoCheck.success || !todoCheck.todo) {
            return {
              verified: false,
              error: "Created todo could not be retrieved",
              verificationDetails: {
                action: action.name,
                result: "todo_not_found",
              },
            };
          }

          // Verify content matches
          if (todoCheck.todo.content !== action.arguments.content) {
            return {
              verified: false,
              error: "Created todo content doesn't match requested content",
              verificationDetails: {
                action: action.name,
                expected: action.arguments.content,
                actual: todoCheck.todo.content,
              },
            };
          }
        }
      } catch (e) {
        return {
          verified: false,
          error: "Error verifying created todo",
          verificationDetails: {
            action: action.name,
            result: "verification_error",
          },
        };
      }
      break;
    }

    case "updateTodo":
    case "completeTodo": {
      if (result.todoIds.length === 0) {
        return {
          verified: false,
          error: "No todo was updated",
          verificationDetails: {
            action: action.name,
            result: "no_todo_updated",
          },
        };
      }

      // Verify the todo was updated correctly
      try {
        const todoId = result.todoIds[0];
        if (typeof todoId === "string") {
          const todoCheck = await getTodoById(todoId);
          if (!todoCheck.success || !todoCheck.todo) {
            return {
              verified: false,
              error: "Updated todo could not be retrieved",
              verificationDetails: {
                action: action.name,
                result: "todo_not_found",
              },
            };
          }

          // For completeTodo, verify completion status
          if (
            action.name === "completeTodo" &&
            todoCheck.todo.completed !== action.arguments.completed
          ) {
            return {
              verified: false,
              error: "Todo completion status doesn't match requested status",
              verificationDetails: {
                action: action.name,
                expected: action.arguments.completed,
                actual: todoCheck.todo.completed,
              },
            };
          }
        }
      } catch (e) {
        return {
          verified: false,
          error: "Error verifying updated todo",
          verificationDetails: {
            action: action.name,
            result: "verification_error",
          },
        };
      }
      break;
    }

    case "deleteTodo": {
      // For deletion, verify the todo no longer exists
      try {
        // Make sure argument id is a string
        if (typeof action.arguments.id === "string") {
          const todoCheck = await getTodoById(action.arguments.id);
          if (todoCheck.success && todoCheck.todo) {
            return {
              verified: false,
              error: "Todo was not deleted",
              verificationDetails: {
                action: action.name,
                result: "todo_still_exists",
              },
            };
          }
        }
      } catch (e) {
        // If we get an error trying to find the todo, it might be because
        // it was successfully deleted - this is actually good!
        console.log(
          "Todo lookup after delete failed, probably successfully deleted"
        );
      }
      break;
    }

    case "listTodos": {
      // For list, just check that we got a result
      if (!result.data || !Array.isArray(result.data)) {
        return {
          verified: false,
          error: "No todos were retrieved",
          verificationDetails: {
            action: action.name,
            result: "no_todos_listed",
          },
        };
      }
      break;
    }
  }

  // All verification passed
  return {
    verified: true,
    verificationDetails: {
      action: action.name,
      result: "success",
      todoIds: result.todoIds,
    },
  };
}
