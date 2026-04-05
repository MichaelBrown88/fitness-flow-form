import { createContext, useContext } from 'react';
import type { useCoachAssistant } from '@/hooks/useCoachAssistant';

export type CoachAssistantContextValue = ReturnType<typeof useCoachAssistant>;

const CoachAssistantContext = createContext<CoachAssistantContextValue | null>(null);

export function CoachAssistantProvider({
  value,
  children,
}: {
  value: CoachAssistantContextValue;
  children: React.ReactNode;
}) {
  return <CoachAssistantContext.Provider value={value}>{children}</CoachAssistantContext.Provider>;
}

export function useCoachAssistantContext(): CoachAssistantContextValue {
  const v = useContext(CoachAssistantContext);
  if (!v) {
    throw new Error('useCoachAssistantContext must be used within CoachAssistantProvider');
  }
  return v;
}

/** Safe for optional UI (e.g. layout chrome) outside assistant page. */
export function useCoachAssistantContextOptional(): CoachAssistantContextValue | null {
  return useContext(CoachAssistantContext);
}
