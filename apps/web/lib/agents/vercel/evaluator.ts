import OpenAI from "openai";
import { Message } from "@/lib/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export const evaluatorConfig = {
  model: "gpt-4o-mini",
  temperature: 0.7,
  max_tokens: 1000,
  functions: [
    {
      name: "evaluateResponse",
      description:
        "Evaluate the quality of a response and suggest improvements",
      parameters: {
        type: "object",
        properties: {
          qualityScore: {
            type: "number",
            minimum: 1,
            maximum: 10,
            description: "Overall quality score of the response",
          },
          requiresAction: {
            type: "boolean",
            description: "Whether the response requires a tool action",
          },
          isConversational: {
            type: "boolean",
            description: "Whether this is a conversational exchange",
          },
          contextRetention: {
            type: "number",
            minimum: 1,
            maximum: 10,
            description: "How well the response maintains conversation context",
          },
          specificIssues: {
            type: "array",
            items: { type: "string" },
            description: "List of specific issues identified",
          },
          improvementSuggestions: {
            type: "array",
            items: { type: "string" },
            description: "List of suggested improvements",
          },
          suggestedResponse: {
            type: "string",
            description: "An improved version of the response if needed",
          },
        },
        required: [
          "qualityScore",
          "requiresAction",
          "isConversational",
          "contextRetention",
          "specificIssues",
          "improvementSuggestions",
        ],
      },
    },
  ],
};

export const evaluatorPrompt = `You are a senior conversation and response evaluator.
Your role is to assess the quality of responses in a todo management system, considering both task-oriented and conversational aspects.

For each response, evaluate:
1. Overall quality and clarity
2. Whether it requires a tool action (todo operation)
3. Conversational appropriateness
4. Context retention from previous messages
5. Specific issues or areas for improvement
6. Suggestions for optimization

Consider:
- Natural language quality
- Task comprehension
- Context utilization
- User engagement
- Response completeness
- Error handling clarity

Provide actionable feedback that can be used to improve the response quality.`;

interface EvaluationResponse {
  success: boolean;
  finalResponse: string;
  evaluation?: {
    qualityScore: number;
    requiresAction: boolean;
    isConversational: boolean;
    contextRetention: number;
    specificIssues: string[];
    improvementSuggestions: string[];
    suggestedResponse?: string;
  };
  iterationsRequired: number;
  error?: string;
}

export async function evaluateResponse(
  originalMessage: string,
  response: string,
  chatContext: Message[] = [],
  maxIterations: number = 2
): Promise<EvaluationResponse> {
  try {
    let currentResponse = response;
    let iterations = 0;
    let finalEvaluation = null;

    while (iterations < maxIterations) {
      console.log(
        `Evaluating response (iteration ${iterations + 1}/${maxIterations}):`,
        {
          originalMessage,
          currentResponse,
        }
      );

      // Evaluate current response
      const evaluation = await openai.chat.completions.create({
        model: evaluatorConfig.model,
        temperature: 0.7,
        max_tokens: 1000,
        messages: [
          { role: "system", content: evaluatorPrompt },
          ...chatContext.map((msg) => ({
            role: msg.role === "data" ? "user" : msg.role,
            content: msg.content,
          })),
          { role: "user", content: originalMessage },
          { role: "assistant", content: currentResponse },
        ],
        functions: evaluatorConfig.functions,
        function_call: { name: "evaluateResponse" },
      });

      const result = evaluation.choices[0]?.message;
      if (!result?.function_call?.arguments) {
        throw new Error("No evaluation generated");
      }

      const evaluationResult = JSON.parse(result.function_call.arguments);
      console.log("Evaluation result:", evaluationResult);

      // Store the final evaluation
      finalEvaluation = evaluationResult;

      // Check if quality meets threshold
      if (
        evaluationResult.qualityScore >= 8 &&
        evaluationResult.contextRetention >= 7 &&
        evaluationResult.specificIssues.length === 0
      ) {
        console.log("Response meets quality threshold");
        break;
      }

      // If we have a suggested improvement and aren't at max iterations, try to improve
      if (
        evaluationResult.suggestedResponse &&
        iterations < maxIterations - 1
      ) {
        currentResponse = evaluationResult.suggestedResponse;
        iterations++;
      } else {
        break;
      }
    }

    return {
      success: true,
      finalResponse: currentResponse,
      evaluation: finalEvaluation,
      iterationsRequired: iterations,
    };
  } catch (error) {
    console.error("Error in response evaluation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Evaluation failed",
      finalResponse: response, // Return original response if evaluation fails
      iterationsRequired: 0,
    };
  }
}
