"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export default function TestPage() {
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [todoResult, setTodoResult] = useState<any>(null);
  const [content, setContent] = useState("");

  // Test database connection
  const testDb = async () => {
    const res = await fetch("/api/todos");
    const data = await res.json();
    setDbStatus(data);
  };

  // Create a test todo
  const createTestTodo = async () => {
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        agentType: "vercel",
        createdBy: "user",
      }),
    });
    const data = await res.json();
    setTodoResult(data);
    if (data.success) setContent("");
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Database Connection Test</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={testDb}>Test Connection</Button>
          {dbStatus && (
            <pre className="mt-4 p-4 bg-gray-100 rounded">
              {JSON.stringify(dbStatus, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create Test Todo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter todo content"
            />
            <Button onClick={createTestTodo}>Create Todo</Button>
          </div>
          {todoResult && (
            <pre className="mt-4 p-4 bg-gray-100 rounded">
              {JSON.stringify(todoResult, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
