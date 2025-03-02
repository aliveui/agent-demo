"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { Message, AgentType, Todo } from "@/lib/types";
import { Toaster } from "@workspace/ui/components/sonner";
import { toast } from "sonner";
import { TodoList } from "@/components/todos/TodoList";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [todoFilter, setTodoFilter] = useState<"all" | "completed" | "pending">(
    "all"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Always use Vercel agent
  const agentType: AgentType = "vercel";

  // Filter todos based on selected filter
  const filteredTodos = todos.filter((todo) => {
    if (todoFilter === "completed") return todo.completed;
    if (todoFilter === "pending") return !todo.completed;
    return true;
  });

  // Fetch todos when messages are affected
  useEffect(() => {
    const fetchTodos = async () => {
      try {
        // Get affected todoIds from messages
        const todoIds = messages
          .flatMap((msg) => msg.metadata?.todoIds || [])
          .filter((id) => id);

        // Build URL with query params
        const url = new URL("/api/todos", window.location.origin);
        url.searchParams.set("agentType", agentType);
        if (todoIds.length > 0) {
          url.searchParams.set("todoIds", todoIds.join(","));
        }

        // Fetch todos
        const response = await fetch(url);
        const data = await response.json();

        if (data.success && data.todos) {
          setTodos(data.todos);
        } else if (!data.success) {
          console.error("Failed to fetch todos:", data.error);
        }
      } catch (err) {
        console.error("Error fetching todos:", err);
      }
    };

    fetchTodos();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Send to API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          agentType: agentType,
          messages: messages, // Pass all previous messages for context
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to get response");
      }

      // Add messages
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          content,
          timestamp: new Date(),
        },
        data.message,
      ]);

      // Show success message if a tool was used
      if (data.message.metadata?.toolCalls?.length) {
        toast.success("Action completed successfully");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    try {
      const response = await fetch("/api/todos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, completed }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to update todo");
      }

      // Update local state
      setTodos((prev) =>
        prev.map((todo) => (todo.id === id ? { ...todo, completed } : todo))
      );

      toast.success(`Todo marked as ${completed ? "completed" : "incomplete"}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update todo";
      toast.error(errorMessage);
    }
  };

  return (
    <main className="container mx-auto p-4">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Vercel AI-Powered Todo Application</CardTitle>
          <CardDescription>
            A smart todo application using Vercel AI SDK to help you manage
            tasks through natural language. Simply chat with the AI assistant to
            create, modify, and organize your tasks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This application demonstrates how AI agents can enhance productivity
            by understanding your intentions through natural conversation. Try
            commands like "Add a task to call mom", "Show my completed tasks",
            or "Mark the first task as done" to see it in action.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <TodoList
            todos={filteredTodos}
            onFilterChange={setTodoFilter}
            onToggleComplete={handleToggleComplete}
          />
        </div>
        <div>
          <ChatContainer
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            error={error}
            todos={todos}
          />
        </div>
      </div>

      <Toaster />
    </main>
  );
}
