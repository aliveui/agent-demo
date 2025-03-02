import { NextResponse } from "next/server";
import { Message } from "@/lib/types";
import { planOperation } from "@/lib/agents/vercel/orchestrator";
import { executeOperation } from "@/lib/agents/vercel/workers";
import { evaluateResponse } from "@/lib/agents/vercel/evaluator";
import {
  validateOperation,
  executeValidatedOperation,
  verifyOperationSuccess,
} from "@/lib/agents/vercel/router";
import { createTodo, updateTodo, deleteTodo, listTodos } from "@/lib/db";
import { trackInteraction } from "@/lib/metrics";

export async function POST(req: Request) {
  try {
    // Get API key from headers or environment variable
    const apiKey =
      req.headers.get("X-OpenAI-Key") || process.env.OPENAI_API_KEY;

    // Validate API key
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "OpenAI API key is required. Please provide it in the request headers or set it in the environment variables.",
        },
        { status: 401 }
      );
    }

    const startTime = Date.now();
    const { message, agentType, messages = [] } = await req.json();

    // Create user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
      timestamp: new Date(),
      metadata: {
        activeAgent: agentType,
      },
    };

    // Add user message to context
    const chatContext = [...messages, userMessage];

    // Configure OpenAI client with provided API key
    if (apiKey) {
      process.env.OPENAI_API_KEY = apiKey;
    }

    // Step 1: Plan the operation using orchestrator
    const operationPlan = await planOperation(message, chatContext);
    if (!operationPlan.success) {
      throw new Error(operationPlan.error);
    }

    console.log("Operation plan:", {
      intent: operationPlan.intent,
      operation: operationPlan.plan.operation,
      complexity: operationPlan.plan.complexity,
      tools: operationPlan.plan.requiredTools,
      matchedTask: operationPlan.matchedTask,
    });

    // Step 2: Execute the operation using appropriate worker
    const execution = await executeOperation(
      operationPlan.plan.operation,
      operationPlan.plan.context,
      message,
      chatContext
    );
    if (!execution.success || !execution.action) {
      throw new Error(execution.error || "No action generated");
    }

    // Update the section that executes a validated operation
    if (execution) {
      try {
        // Create context object from various sources
        const operationContext = {
          content: operationPlan.plan.context?.content,
          matchedTask: operationPlan.matchedTask,
          matchedContent: operationPlan.plan.context?.matchedContent,
        };

        // Step 3: Validate the operation before execution
        const validation = await validateOperation(
          operationPlan.plan.operation || "create",
          execution.action.name,
          execution.action.arguments,
          operationContext,
          agentType
        );

        // If validation fails, include the error in response
        if (!validation.isValid) {
          console.error("Operation validation failed:", validation.error);

          // Add validation error to explanation
          let enhancedExplanation = execution.explanation || "";
          if (
            validation.error &&
            !enhancedExplanation.includes(validation.error)
          ) {
            enhancedExplanation += `\n\nNote: There was an issue with the operation: ${validation.error}`;
          }

          // Calculate total response time
          const responseTime = Date.now() - startTime;

          // Create assistant message with validation error
          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: enhancedExplanation,
            timestamp: new Date(),
            metadata: {
              activeAgent: agentType,
              toolCalls: [
                {
                  id: crypto.randomUUID(),
                  type: "function",
                  name: execution.action.name,
                  arguments: JSON.stringify(execution.action.arguments),
                  error: validation.error,
                  validation: validation.validationDetails,
                },
              ],
              todoIds: [],
              error: validation.error,
              matchedTask: operationPlan.matchedTask,
              plan: {
                ...operationPlan.plan,
                intent: operationPlan.intent,
              },
            },
          };

          // Track failed interaction
          await trackInteraction(agentType, message, assistantMessage, {
            responseTime,
            success: false,
            todoSuccessCount: 0,
            todoFailCount: 1,
            tokenUsage: undefined,
          });

          return NextResponse.json({
            success: true,
            message: assistantMessage,
          });
        }

        // Use corrected action if available from validation
        const actionToExecute = validation.correctedAction || execution.action;

        // Step 4: Execute the validated database operation
        const operationResult = await executeValidatedOperation(
          actionToExecute,
          agentType
        );

        // Step 5: Verify the operation was successful
        const verification = await verifyOperationSuccess(
          actionToExecute,
          operationResult,
          agentType
        );

        let todoIds = operationResult.todoIds || [];
        let error = verification.verified ? undefined : verification.error;
        let matchedContent: string | undefined;
        let todoSuccess = verification.verified ? 1 : 0;
        let todoFailed = verification.verified ? 0 : 1;

        // If we have a matched todo by content, use it in the response
        if (
          operationPlan.plan.context?.matchedTodo &&
          (actionToExecute.name === "completeTodo" ||
            actionToExecute.name === "updateTodo")
        ) {
          matchedContent = operationPlan.plan.context.matchedTodo.content;
        }

        // Step 6: Evaluate and optimize the response
        const responseEvaluation = await evaluateResponse(
          message,
          execution.explanation ?? "",
          chatContext
        );

        // Add operation details to the explanation
        let enhancedExplanation = responseEvaluation.success
          ? responseEvaluation.finalResponse
          : (execution.explanation ?? "");

        // If there was an error but the AI didn't mention it, make sure it's included
        if (error && !enhancedExplanation.includes(error)) {
          enhancedExplanation += `\n\nNote: There was an issue with the operation: ${error}`;
        }

        // Calculate total response time
        const responseTime = Date.now() - startTime;

        // Create assistant message
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: enhancedExplanation,
          timestamp: new Date(),
          metadata: {
            activeAgent: agentType,
            toolCalls: [
              {
                id: crypto.randomUUID(),
                type: "function",
                name: actionToExecute.name,
                arguments: JSON.stringify(actionToExecute.arguments),
                error: error,
                validation: validation.validationDetails,
                verification: verification.verificationDetails,
              },
            ],
            todoIds,
            error,
            matchedTask: operationPlan.matchedTask,
            matchedContent,
            plan: {
              ...operationPlan.plan,
              intent: operationPlan.intent,
            },
            evaluation: responseEvaluation.success
              ? responseEvaluation.evaluation
              : undefined,
          },
        };

        // Track this interaction
        await trackInteraction(agentType, message, assistantMessage, {
          responseTime,
          success: !error,
          todoSuccessCount: todoSuccess,
          todoFailCount: todoFailed,
          // We don't have token usage data yet
          tokenUsage: undefined,
        });

        return NextResponse.json({
          success: true,
          message: assistantMessage,
        });
      } catch (error) {
        console.error("Error in chat endpoint execution:", error);

        // Create error message
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `I'm sorry, but I encountered an error while trying to process your request: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: new Date(),
          metadata: {
            activeAgent: agentType,
            toolCalls: [],
            error: error instanceof Error ? error.message : "Unknown error",
            matchedTask: operationPlan.matchedTask,
            plan: {
              ...operationPlan.plan,
              intent: operationPlan.intent,
            },
          },
        };

        // Track failed interaction
        await trackInteraction(agentType, message, assistantMessage, {
          responseTime: Date.now() - startTime,
          success: false,
          todoSuccessCount: 0,
          todoFailCount: 1,
          tokenUsage: undefined,
        });

        return NextResponse.json({
          success: true,
          message: assistantMessage,
        });
      }
    }
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "An error occurred",
      },
      { status: 500 }
    );
  }
}
