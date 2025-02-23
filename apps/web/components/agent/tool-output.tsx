"use client";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

interface ToolAction {
  id: string;
  tool: string;
  input: any;
  output: any;
  timestamp: Date;
  status: "pending" | "success" | "error";
}

interface ToolOutputProps {
  agentType: string;
}

export default function ToolOutput({ agentType }: ToolOutputProps) {
  // This will be replaced with actual tool tracking logic
  const mockTools: ToolAction[] = [
    {
      id: "1",
      tool: "createTodo",
      input: { text: "Buy groceries" },
      output: { success: true, id: "123" },
      timestamp: new Date(),
      status: "success",
    },
    {
      id: "2",
      tool: "updateTodo",
      input: { id: "123", completed: true },
      output: { success: true },
      timestamp: new Date(),
      status: "success",
    },
  ];

  return (
    <Card className="h-[800px] flex flex-col">
      <CardHeader>
        <CardTitle>Tool Execution Log</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
<<<<<<< HEAD
<<<<<<< HEAD
        <Tabs defaultValue="metrics" className="h-full">
          <TabsList>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="log">Execution Log</TabsTrigger>
          </TabsList>

          <TabsContent value="metrics" className="h-full">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Success Rate</CardTitle>
=======
        <ScrollArea className="h-full pr-4">
          <div className="space-y-4">
            {mockTools.map((action) => (
=======
        <ScrollArea className="h-full pr-4">
          <div className="space-y-4">
            {tools.map((action) => (
>>>>>>> parent of 183877d (chat to todo)
              <Card key={action.id} className="bg-muted">
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      {action.tool}
                    </CardTitle>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        action.status === "success"
                          ? "bg-green-100 text-green-800"
                          : action.status === "error"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {action.status}
                    </span>
                  </div>
<<<<<<< HEAD
>>>>>>> parent of 8824be1 (agent 1)
=======
>>>>>>> parent of 183877d (chat to todo)
                </CardHeader>
                <CardContent className="py-2">
                  <div className="space-y-2">
                    <div>
                      <h4 className="text-sm font-medium">Input:</h4>
                      <pre className="text-xs bg-background p-2 rounded">
                        {JSON.stringify(action.input, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Output:</h4>
                      <pre className="text-xs bg-background p-2 rounded">
                        {JSON.stringify(action.output, null, 2)}
                      </pre>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {action.timestamp.toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
