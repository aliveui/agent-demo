import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";

interface ToolAction {
  id: string;
  tool: string;
  input: any;
  output: any;
  timestamp: string;
  status: "pending" | "success" | "error";
}

interface ToolStats {
  totalCalls: number;
  successRate: number;
  averageResponseTime: number;
  toolUsage: Record<string, number>;
  errorRate: number;
  lastExecutionTime: string;
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

  // Calculate statistics
  const stats: ToolStats = useMemo(() => {
    if (tools.length === 0) {
      return {
        totalCalls: 0,
        successRate: 0,
        averageResponseTime: 0,
        toolUsage: {},
        errorRate: 0,
        lastExecutionTime: "-",
      };
    }

    const successfulCalls = tools.filter((t) => t.status === "success").length;
    const errorCalls = tools.filter((t) => t.status === "error").length;

    // Calculate tool usage
    const toolUsage = tools.reduce(
      (acc, tool) => {
        acc[tool.tool] = (acc[tool.tool] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Calculate average response time
    let totalResponseTime = 0;
    let validTimePairs = 0;
    for (let i = 1; i < tools.length; i++) {
      const current = tools[i]?.timestamp;
      const prev = tools[i - 1]?.timestamp;
      if (current && prev) {
        const currentTime = new Date(current).getTime();
        const prevTime = new Date(prev).getTime();
        if (currentTime - prevTime < 30000) {
          // Only count if less than 30s apart
          totalResponseTime += currentTime - prevTime;
          validTimePairs++;
        }
      }
    }

    const lastTimestamp = tools[tools.length - 1]?.timestamp;

    return {
      totalCalls: tools.length,
      successRate: (successfulCalls / tools.length) * 100,
      averageResponseTime:
        validTimePairs > 0 ? totalResponseTime / validTimePairs : 0,
      toolUsage,
      errorRate: (errorCalls / tools.length) * 100,
      lastExecutionTime: lastTimestamp
        ? new Date(lastTimestamp).toLocaleString()
        : "-",
    };
  }, [tools]);

  return (
    <Card className="h-[800px] flex flex-col">
      <CardHeader>
        <CardTitle>Agent Execution Analysis</CardTitle>
        <CardDescription>
          Real-time monitoring and evaluation metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
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
>>>>>>> parent of 8824be1 (agent 1)
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.successRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Error Rate: {stats.errorRate.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Response Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(stats.averageResponseTime / 1000).toFixed(2)}s
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last Execution: {stats.lastExecutionTime}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-sm">
                  Tool Usage Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats.toolUsage).map(([tool, count]) => (
                    <div key={tool} className="flex items-center gap-2">
                      <div className="w-24 text-sm font-medium">{tool}</div>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${(count / stats.totalCalls) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="w-12 text-sm text-right">
                        {((count / stats.totalCalls) * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div>Total Executions: {stats.totalCalls}</div>
                  <div>
                    Successful Calls:{" "}
                    {tools.filter((t) => t.status === "success").length}
                  </div>
                  <div>
                    Failed Calls:{" "}
                    {tools.filter((t) => t.status === "error").length}
                  </div>
                  <div>
                    Pending Calls:{" "}
                    {tools.filter((t) => t.status === "pending").length}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="log" className="h-full">
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {tools.map((action) => (
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
                          {new Date(action.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
