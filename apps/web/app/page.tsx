"use client";

import { useState, useEffect } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
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
  const [activeAgent, setActiveAgent] = useState<AgentType>("vercel");
  const [messages, setMessages] = useState<Message[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [todoFilter, setTodoFilter] = useState<"all" | "completed" | "pending">(
    "all"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter todos based on selected filter
  const filteredTodos = todos.filter((todo) => {
    if (todoFilter === "completed") return todo.completed;
    if (todoFilter === "pending") return !todo.completed;
    return true;
  });

  // Fetch todos when agent changes or todos are affected
  useEffect(() => {
    const fetchTodos = async () => {
      try {
        // Get affected todoIds from messages
        const todoIds = messages
          .flatMap((msg) => msg.metadata?.todoIds || [])
          .filter((id) => id);

        // Build URL with query params
        const url = new URL("/api/todos", window.location.origin);
        url.searchParams.set("agentType", activeAgent);
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
  }, [messages, activeAgent]);

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
          agentType: activeAgent,
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
          <CardTitle>Agentic AI Technology Comparison</CardTitle>
          <CardDescription>
            Compare different AI agent implementations through a todo
            application
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs
        value={activeAgent}
        onValueChange={(value) => setActiveAgent(value as AgentType)}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vercel">Vercel AI</TabsTrigger>
          <TabsTrigger value="langchain">LangChain</TabsTrigger>
          <TabsTrigger value="mastra">Mastra</TabsTrigger>
          <TabsTrigger value="kaiban">Kaiban</TabsTrigger>
        </TabsList>

        {["vercel", "langchain", "mastra", "kaiban"].map((agent) => (
          <TabsContent key={agent} value={agent} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
          </TabsContent>
        ))}
      </Tabs>

      <Toaster />
    </main>
  );
}
