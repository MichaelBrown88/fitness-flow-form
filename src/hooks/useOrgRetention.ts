/**
 * useOrgRetention Hook
 * 
 * Analyzes client retention and churn risk for organization admins.
 * Identifies clients who haven't been assessed recently and are at risk of churning.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, getDocs, Timestamp } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { ORGANIZATION } from '@/lib/database/paths';
import { logger } from '@/lib/utils/logger';

/** Client with retention metrics */
export interface ClientRetentionData {
  id: string;
  name: string;
  email?: string;
  assignedCoachName?: string;
  assignedCoachUid?: string;
  lastAssessmentDate: Date | null;
  lastInBodyDate: Date | null;
  lastPostureDate: Date | null;
  daysSinceAssessment: number;
  churnRisk: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'inactive' | 'paused';
}

/** Summary of retention metrics */
export interface RetentionSummary {
  totalClients: number;
  activeClients: number;
  atRiskClients: number;
  criticalClients: number;
  averageDaysSinceAssessment: number;
  clientsNeedingAttention: number; // > 30 days
  clientsAtRiskOfChurn: number; // > 60 days
}

/** Coach with their retention metrics */
export interface CoachRetentionMetrics {
  uid: string;
  displayName: string;
  totalClients: number;
  atRiskClients: number;
  averageDaysSinceAssessment: number;
}

export interface UseOrgRetentionResult {
  loading: boolean;
  error: string | null;
  clients: ClientRetentionData[];
  summary: RetentionSummary;
  coachMetrics: CoachRetentionMetrics[];
  atRiskClients: ClientRetentionData[];
  criticalClients: ClientRetentionData[];
  refresh: () => Promise<void>;
}

/** Thresholds for churn risk (in days) */
const CHURN_THRESHOLDS = {
  low: 14,       // Under 2 weeks - healthy
  medium: 30,    // 2-4 weeks - needs attention
  high: 60,      // 4-8 weeks - at risk
  critical: 90,  // Over 8 weeks - critical risk
};

/**
 * Calculate churn risk level based on days since last assessment
 */
function calculateChurnRisk(daysSinceAssessment: number): ClientRetentionData['churnRisk'] {
  if (daysSinceAssessment <= CHURN_THRESHOLDS.low) return 'low';
  if (daysSinceAssessment <= CHURN_THRESHOLDS.medium) return 'medium';
  if (daysSinceAssessment <= CHURN_THRESHOLDS.high) return 'high';
  return 'critical';
}

/**
 * Calculate days since a given date
 */
function daysSince(date: Date | null): number {
  if (!date) return 999; // No assessment = very high risk
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Hook to analyze organization retention metrics
 */
export function useOrgRetention(
  organizationId: string | undefined,
  coaches: Array<{ uid: string; displayName: string }>
): UseOrgRetentionResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientRetentionData[]>([]);

  // Fetch all clients in the organization
  const fetchRetentionData = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const db = getDb();
      const clientsRef = collection(db, ORGANIZATION.clients.collection(organizationId));
      const clientsSnap = await getDocs(query(clientsRef));

      // Create a map of coach UIDs to names
      const coachMap = new Map(coaches.map(c => [c.uid, c.displayName]));

      const clientsData: ClientRetentionData[] = clientsSnap.docs.map(doc => {
        const data = doc.data();
        
        // Parse dates
        const lastAssessmentDate = data.lastAssessmentDate?.toDate?.() || null;
        const lastInBodyDate = data.lastInBodyDate?.toDate?.() || null;
        const lastPostureDate = data.lastPostureDate?.toDate?.() || null;
        
        // Calculate days since assessment
        const days = daysSince(lastAssessmentDate);
        
        return {
          id: doc.id,
          name: data.clientName || doc.id,
          email: data.email,
          assignedCoachUid: data.assignedCoachUid,
          assignedCoachName: data.assignedCoachUid ? coachMap.get(data.assignedCoachUid) : undefined,
          lastAssessmentDate,
          lastInBodyDate,
          lastPostureDate,
          daysSinceAssessment: days,
          churnRisk: calculateChurnRisk(days),
          status: data.status || 'active',
        };
      });

      // Filter out inactive/archived clients - only track active clients for retention
      // Legacy clients without a status field are treated as active
      const activeClientsData = clientsData.filter(
        c => c.status === 'active' || !c.status
      );

      // Sort by days since assessment (highest risk first)
      activeClientsData.sort((a, b) => b.daysSinceAssessment - a.daysSinceAssessment);
      
      setClients(activeClientsData);
    } catch (err) {
      logger.error('Error fetching retention data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load retention data');
    } finally {
      setLoading(false);
    }
  }, [organizationId, coaches]);

  // Load data on mount
  useEffect(() => {
    fetchRetentionData();
  }, [fetchRetentionData]);

  // Calculate summary metrics
  const summary = useMemo<RetentionSummary>(() => {
    const activeClients = clients.filter(c => c.status === 'active');
    const atRisk = clients.filter(c => c.churnRisk === 'high' || c.churnRisk === 'critical');
    const critical = clients.filter(c => c.churnRisk === 'critical');
    const needingAttention = clients.filter(c => c.daysSinceAssessment > 30);
    const atRiskOfChurn = clients.filter(c => c.daysSinceAssessment > 60);
    
    const totalDays = clients.reduce((sum, c) => sum + (c.daysSinceAssessment < 999 ? c.daysSinceAssessment : 0), 0);
    const clientsWithAssessments = clients.filter(c => c.daysSinceAssessment < 999);
    const avgDays = clientsWithAssessments.length > 0 
      ? Math.round(totalDays / clientsWithAssessments.length) 
      : 0;

    return {
      totalClients: clients.length,
      activeClients: activeClients.length,
      atRiskClients: atRisk.length,
      criticalClients: critical.length,
      averageDaysSinceAssessment: avgDays,
      clientsNeedingAttention: needingAttention.length,
      clientsAtRiskOfChurn: atRiskOfChurn.length,
    };
  }, [clients]);

  // Calculate per-coach metrics
  const coachMetrics = useMemo<CoachRetentionMetrics[]>(() => {
    const metrics = new Map<string, { clients: ClientRetentionData[] }>();
    
    // Group clients by coach
    clients.forEach(client => {
      if (client.assignedCoachUid) {
        const existing = metrics.get(client.assignedCoachUid);
        if (existing) {
          existing.clients.push(client);
        } else {
          metrics.set(client.assignedCoachUid, { clients: [client] });
        }
      }
    });

    // Calculate metrics for each coach
    return coaches.map(coach => {
      const coachData = metrics.get(coach.uid);
      const coachClients = coachData?.clients || [];
      const atRisk = coachClients.filter(c => c.churnRisk === 'high' || c.churnRisk === 'critical');
      
      const totalDays = coachClients.reduce((sum, c) => sum + (c.daysSinceAssessment < 999 ? c.daysSinceAssessment : 0), 0);
      const clientsWithAssessments = coachClients.filter(c => c.daysSinceAssessment < 999);
      const avgDays = clientsWithAssessments.length > 0 
        ? Math.round(totalDays / clientsWithAssessments.length) 
        : 0;

      return {
        uid: coach.uid,
        displayName: coach.displayName,
        totalClients: coachClients.length,
        atRiskClients: atRisk.length,
        averageDaysSinceAssessment: avgDays,
      };
    }).sort((a, b) => b.atRiskClients - a.atRiskClients);
  }, [clients, coaches]);

  // Filter at-risk and critical clients
  const atRiskClients = useMemo(() => 
    clients.filter(c => c.churnRisk === 'high'),
  [clients]);

  const criticalClients = useMemo(() => 
    clients.filter(c => c.churnRisk === 'critical'),
  [clients]);

  return {
    loading,
    error,
    clients,
    summary,
    coachMetrics,
    atRiskClients,
    criticalClients,
    refresh: fetchRetentionData,
  };
}
