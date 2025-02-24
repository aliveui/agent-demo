import { NextResponse } from "next/server";
import { getAgentMetrics } from "@/lib/metrics";

export async function GET() {
  try {
    const result = await getAgentMetrics();

    if (!result.success) {
      throw new Error(
        typeof result.error === "string"
          ? result.error
          : "Failed to retrieve metrics"
      );
    }

    return NextResponse.json({
      success: true,
      metrics: result.metrics,
    });
  } catch (error) {
    console.error("Error retrieving metrics:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
