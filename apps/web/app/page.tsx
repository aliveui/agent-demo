"use client";
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
import TodoList from "@/components/todo/todo-list";
import AgentChat from "@/components/agent/agent-chat";
import ToolOutput from "@/components/agent/tool-output";
import { Toaster } from "@workspace/ui/components/sonner";

export default function Home() {
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

      <Tabs defaultValue="vercel" className="space-y-4">
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
                <TodoList agentType={agent} />
                <AgentChat agentType={agent} />
              </div>
              <div>
                <ToolOutput agentType={agent} />
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Toaster />
    </main>
  );
}
