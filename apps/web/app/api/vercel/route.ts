import { NextResponse } from "next/server";
import { TodoAgent } from "@agentic-demos/agents-vercel";
import { InMemoryTodoStore } from "@agentic-demos/agents-vercel";
import { toolStore } from "@/lib/tool-store";
import { v4 as uuidv4 } from "uuid";

// Initialize store and agent outside of the handler
const store = new InMemoryTodoStore();

// Create a function to get or create the agent
let agent: TodoAgent | null = null;
const getAgent = () => {
  if (!agent) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    agent = new TodoAgent(store, process.env.OPENAI_API_KEY, (event) => {
      toolStore.emitToolAction(event);
    });
  }
  return agent;
};

// Wrap tool functions to emit events
const wrapToolFunction = (tool: any) => {
  const originalFunc = tool.func;
  tool.func = async (...args: any[]) => {
    const toolAction = {
      id: uuidv4(),
      tool: tool.name,
      input: args,
      timestamp: new Date(),
      status: "pending" as const,
      output: null,
    };

    toolStore.emitToolAction(toolAction);

    try {
      const output = await originalFunc.apply(tool, args);
      toolStore.emitToolAction({
        ...toolAction,
        output,
        status: "success" as const,
      });
      return output;
    } catch (error) {
      toolStore.emitToolAction({
        ...toolAction,
        output: error,
        status: "error" as const,
      });
      throw error;
    }
  };
  return tool;
};

export async function POST(req: Request) {
  try {
    // Get the agent instance
    const currentAgent = getAgent();

    // Process the message
    const { message } = await req.json();
    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const response = await currentAgent.processMessage(message);
    return NextResponse.json({ response });
  } catch (error) {
    console.error("Error processing message:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process message";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
