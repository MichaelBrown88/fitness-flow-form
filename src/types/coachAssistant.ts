export type CoachAssistantInteractionMode = 'data' | 'assist';

/** Inline thinking row before streamed assistant text appears. */
export type CoachAssistantThinkingPhase = 'fetching' | 'generating';

/** Shown while the model is still streaming — never displays raw tokens. */
export type CoachAssistantStreamPreview = {
  active: boolean;
};

export type CoachAssistantMessageProvenance = 'data_only' | 'data_plus_llm';

/** Rich chart / cards from model JSON `visual` field */
export type AssistantChartVisual =
  | {
      type: 'radar_chart' | 'bar_chart' | 'line_chart';
      title: string;
      data: {
        labels: string[];
        datasets: Array<{ label: string; data: number[] }>;
      };
    }
  | {
      type: 'stat_cards';
      title: string;
      data: { cards: Array<{ label: string; value: string | number; sub: string }> };
    }
  | {
      type: 'data_table';
      title: string;
      data: {
        columns: string[];
        rows: Array<Array<string | number>>;
      };
    };

/**
 * Action button: explicit navigation or assessment prefill (no auto-redirect).
 */
export type CoachAssistantActionButton =
  | {
      kind: 'navigate';
      label: string;
      to: string;
      variant: 'primary' | 'secondary';
    }
  | {
      kind: 'start_assessment';
      label: string;
      clientName: string;
      variant: 'primary' | 'secondary';
    };

/** Older threads in localStorage may still have plain label+to actions. */
export type CoachAssistantLegacyLinkAction = { label: string; to: string };

export type CoachAssistantActionUnion = CoachAssistantActionButton | CoachAssistantLegacyLinkAction;

export type CoachAssistantBlock =
  | { type: 'text'; content: string }
  | { type: 'actions'; actions: CoachAssistantActionUnion[] }
  | { type: 'visual'; visual: AssistantChartVisual };

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
