export type CoachAssistantInteractionMode = 'data' | 'assist';

export type CoachAssistantMessageProvenance = 'data_only' | 'data_plus_llm';

export type CoachAssistantAction = { label: string; to: string };

export type CoachAssistantBlock =
  | { type: 'text'; content: string }
  | { type: 'actions'; actions: CoachAssistantAction[] };

export type CoachAssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  createdAt: number;
  blocks: CoachAssistantBlock[];
  provenance?: CoachAssistantMessageProvenance;
};

export type CoachAssistantThread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: CoachAssistantMessage[];
};
