export type ChatMessage = {
  id: number;
  clientId?: string;
  role: "user" | "assistant";
  content: string;
  bubbleIndex: number;
  groupId: string;
  isProactive?: boolean;
  createdAt: string;
};
