type ToolAction = {
  id: string;
  tool: string;
  input: any;
  output: any;
  timestamp: Date;
  status: "pending" | "success" | "error";
};

class ToolStore {
  private static instance: ToolStore;
  private controllers: Set<ReadableStreamDefaultController>;

  private constructor() {
    this.controllers = new Set();
  }

  public static getInstance(): ToolStore {
    if (!ToolStore.instance) {
      ToolStore.instance = new ToolStore();
    }
    return ToolStore.instance;
  }

  public addController(controller: ReadableStreamDefaultController) {
    this.controllers.add(controller);
  }

  public removeController(controller: ReadableStreamDefaultController) {
    this.controllers.delete(controller);
  }

  public emitToolAction(action: ToolAction) {
    const message = `data: ${JSON.stringify(action)}\n\n`;
    this.controllers.forEach((controller) => {
      try {
        controller.enqueue(message);
      } catch (error) {
        console.error("Error sending message to client:", error);
        this.removeController(controller);
      }
    });
  }
}

export const toolStore = ToolStore.getInstance();
