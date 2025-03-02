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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

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

  // API key management
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState<string>("");
  const [apiKeyInput, setApiKeyInput] = useState<string>("");

  // Check if API key exists in localStorage on component mount
  useEffect(() => {
    const storedApiKey = localStorage.getItem("openai_api_key");
    if (storedApiKey) {
      setApiKey(storedApiKey);
    } else {
      setApiKeyModalOpen(true);
    }
  }, []);

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem("openai_api_key", apiKeyInput);
      setApiKey(apiKeyInput);
      setApiKeyModalOpen(false);
      toast.success("API key saved successfully");
    } else {
      toast.error("Please enter a valid API key");
    }
  };

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
    // Check if API key is available
    if (!apiKey) {
      setApiKeyModalOpen(true);
      toast.error("OpenAI API key is required");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Send to API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OpenAI-Key": apiKey,
        },
        body: JSON.stringify({
          message: content,
          agentType: agentType,
          messages: messages, // Pass all previous messages for context
        }),
      });

      const data = await response.json();

      if (!data.success) {
        // If API key is invalid, prompt for a new one
        if (
          data.error?.toLowerCase().includes("api key") ||
          data.error?.toLowerCase().includes("authentication")
        ) {
          localStorage.removeItem("openai_api_key");
          setApiKey("");
          setApiKeyModalOpen(true);
          throw new Error(
            "Invalid API key. Please provide a valid OpenAI API key."
          );
        }
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
    // Check if API key is available
    if (!apiKey) {
      setApiKeyModalOpen(true);
      toast.error("OpenAI API key is required");
      return;
    }

    try {
      const response = await fetch("/api/todos", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-OpenAI-Key": apiKey,
        },
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

      {/* API Key Modal */}
      <Dialog open={apiKeyModalOpen} onOpenChange={setApiKeyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter your OpenAI API Key</DialogTitle>
            <DialogDescription>
              This application requires an OpenAI API key to function. Your key
              will be stored locally in your browser and is never sent to our
              servers.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="api-key">OpenAI API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="sk-..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Don't have an API key? Get one from{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  OpenAI's website
                </a>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveApiKey}>Save API Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </main>
  );
}
