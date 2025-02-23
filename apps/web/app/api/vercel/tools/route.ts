import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { toolStore } from "@/lib/tool-store";

export const runtime = "edge";

export async function GET() {
  const responseHeaders = new Headers();
  responseHeaders.set("Content-Type", "text/event-stream");
  responseHeaders.set("Cache-Control", "no-cache");
  responseHeaders.set("Connection", "keep-alive");

  const stream = new ReadableStream({
    start(controller) {
      // Add controller to tool store
      toolStore.addController(controller);

      // Keep the connection alive with a heartbeat
      const heartbeat = setInterval(() => {
        controller.enqueue(": heartbeat\n\n");
      }, 30000);

      // Clean up on close
      return () => {
        clearInterval(heartbeat);
        toolStore.removeController(controller);
      };
    },
  });

  return new NextResponse(stream, {
    headers: responseHeaders,
  });
}
