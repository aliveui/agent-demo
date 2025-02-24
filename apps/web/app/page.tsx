"use client";

import { useState } from "react";
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
import { Message, AgentType } from "@/lib/types";
import { Toaster } from "@workspace/ui/components/sonner";
import { toast } from "sonner";

export default function Home() {
  const [activeAgent, setActiveAgent] = useState<AgentType>("vercel");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendMessage = async (content: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Add user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Send to API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, agentType: activeAgent }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to get response");
      }

      // Add assistant message
      setMessages((prev) => [...prev, data.message]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
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
              <div className="space-y-4">
                {/* Todo list will go here */}
                <Card>
                  <CardHeader>
                    <CardTitle>Todos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Todo list coming soon...
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div>
                <ChatContainer
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  error={error}
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
