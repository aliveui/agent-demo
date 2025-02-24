import { Todo } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { TodoPreview } from "./TodoPreview";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

interface TodoListProps {
  todos: Todo[];
  onFilterChange?: (filter: "all" | "completed" | "pending") => void;
  onToggleComplete?: (id: string, completed: boolean) => void;
}

export function TodoList({
  todos,
  onFilterChange,
  onToggleComplete,
}: TodoListProps) {
  const completedTodos = todos.filter((todo) => todo.completed);
  const pendingTodos = todos.filter((todo) => !todo.completed);

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle>Todos</CardTitle>
          <Select
            defaultValue="all"
            onValueChange={(value) =>
              onFilterChange?.(value as "all" | "completed" | "pending")
            }
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 text-sm text-muted-foreground">
          <span>{todos.length} total</span>
          <span>•</span>
          <span>{completedTodos.length} completed</span>
          <span>•</span>
          <span>{pendingTodos.length} pending</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {todos.map((todo) => (
              <TodoPreview
                key={todo.id}
                todo={todo}
                onToggleComplete={onToggleComplete}
              />
            ))}
            {todos.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No todos yet. Start by asking the agent to create one!
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
