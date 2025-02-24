import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { AgentType } from "@/lib/types";

interface AgentMetric {
  agent_type: AgentType;
  avg_response_time: number;
  avg_success_rate: number;
  total_interactions: number;
  total_todo_success: number;
  total_todo_failed: number;
  avg_memory_usage: number | null;
  avg_token_usage: number | null;
}

export function MetricsDashboard() {
  const [metrics, setMetrics] = useState<AgentMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "comparison">(
    "overview"
  );

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/metrics");
        const data = await response.json();

        if (data.success && data.metrics) {
          setMetrics(data.metrics);
        } else {
          setError(data.error || "Failed to fetch metrics");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 0.85) return "text-green-600";
    if (rate >= 0.7) return "text-yellow-600";
    return "text-red-600";
  };

  const getResponseTimeColor = (time: number) => {
    if (time <= 1000) return "text-green-600";
    if (time <= 3000) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Agent Performance Metrics</CardTitle>
        <CardDescription>
          Compare the performance of different AI agent implementations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as any)}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {isLoading ? (
              <div className="flex justify-center py-8">Loading metrics...</div>
            ) : error ? (
              <div className="text-red-500 py-4">{error}</div>
            ) : metrics.length === 0 ? (
              <div className="text-center py-8">
                No metrics available yet. Try using the agents more.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metrics.map((metric) => (
                  <Card key={metric.agent_type} className="overflow-hidden">
                    <CardHeader className="bg-gray-50 dark:bg-gray-800">
                      <CardTitle className="capitalize">
                        {metric.agent_type} Agent
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Success Rate:</span>
                          <span
                            className={getSuccessRateColor(
                              metric.avg_success_rate
                            )}
                          >
                            {(metric.avg_success_rate * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">
                            Avg Response Time:
                          </span>
                          <span
                            className={getResponseTimeColor(
                              metric.avg_response_time
                            )}
                          >
                            {metric.avg_response_time.toFixed(0)} ms
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">
                            Total Interactions:
                          </span>
                          <span>{metric.total_interactions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">
                            Todo Success/Failed:
                          </span>
                          <span>
                            {metric.total_todo_success} /{" "}
                            {metric.total_todo_failed}
                          </span>
                        </div>
                        {metric.avg_token_usage && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              Avg Token Usage:
                            </span>
                            <span>{metric.avg_token_usage}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="comparison">
            {isLoading ? (
              <div className="flex justify-center py-8">Loading metrics...</div>
            ) : error ? (
              <div className="text-red-500 py-4">{error}</div>
            ) : metrics.length < 2 ? (
              <div className="text-center py-8">
                Need at least two agents with metrics to show comparison.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                      <tr>
                        <th scope="col" className="px-6 py-3">
                          Agent
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Success Rate
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Avg Response
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Interactions
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Todo Success
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Todo Failures
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.map((metric) => (
                        <tr
                          key={metric.agent_type}
                          className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                        >
                          <th
                            scope="row"
                            className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white capitalize"
                          >
                            {metric.agent_type}
                          </th>
                          <td
                            className={`px-6 py-4 ${getSuccessRateColor(metric.avg_success_rate)}`}
                          >
                            {(metric.avg_success_rate * 100).toFixed(1)}%
                          </td>
                          <td
                            className={`px-6 py-4 ${getResponseTimeColor(metric.avg_response_time)}`}
                          >
                            {metric.avg_response_time.toFixed(0)} ms
                          </td>
                          <td className="px-6 py-4">
                            {metric.total_interactions}
                          </td>
                          <td className="px-6 py-4">
                            {metric.total_todo_success}
                          </td>
                          <td className="px-6 py-4">
                            {metric.total_todo_failed}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Future: Add charts/graphs for comparison */}
                <div className="text-center text-gray-500 py-2">
                  Visual charts comparison coming soon
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
