/**
 * Share card page — renders a single pillar score card at social media dimensions.
 * No app chrome. Designed to be screenshotted by Puppeteer or opened by clients.
 *
 * Routes:
 *   /share/:token/:pillar/card   → 1080×1080 square
 *   /share/:token/:pillar/story  → 1080×1920 story
 *
 * The :pillar param is one of: bodyComp | cardio | strength | movementQuality | lifestyle
 * The :format param is: card | story
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getPublicReportByToken } from '@/services/publicReports';
import { computeScores } from '@/lib/scoring';
import { buildPillarCards } from '@/lib/share/pillarCardData';
import { PillarScoreCard } from '@/components/share/PillarScoreCard';
import { PillarStoryCard } from '@/components/share/PillarStoryCard';
import { logger } from '@/lib/utils/logger';
import type { PillarCardData } from '@/lib/share/pillarCardData';

export default function ShareCardPage() {
  const { token, pillar, format } = useParams<{
    token: string;
    pillar: string;
    format: 'card' | 'story';
  }>();

  const [cardData, setCardData] = useState<PillarCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !pillar) {
      setError('Invalid share link.');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const report = await getPublicReportByToken(token);
        if (!report) {
          setError('This report is no longer available.');
          setLoading(false);
          return;
        }

        const scores = computeScores(report.formData);
        const previousScores = report.previousFormData
          ? computeScores(report.previousFormData)
          : null;

        const snapshotCount = report.snapshotSummaries?.length ?? 1;
        const snapshotTypes = report.snapshotSummaries?.map((s) => s.type) ?? [];

        // Load org branding
        let coachLogoUrl: string | null = null;
        let coachName: string | null = null;
        if (report.organizationId) {
          try {
            const { getOrgSettings } = await import('@/services/organizations');
            const org = await getOrgSettings(report.organizationId);
            if (org.customBrandingEnabled) {
              coachLogoUrl = org.logoUrl ?? null;
              coachName = org.name ?? null;
            }
          } catch {
            // Non-fatal — render without branding
          }
        }

        const cards = buildPillarCards({
          scores,
          previousScores,
          clientName: report.clientName,
          snapshotCount,
          snapshotTypes,
          coachLogoUrl,
          coachName,
        });

        const match = cards.find((c) => c.pillarId === pillar);
        if (!match) {
          setError('No card available for this pillar.');
          setLoading(false);
          return;
        }

        setCardData(match);
      } catch (e) {
        logger.error('[ShareCardPage] failed to load', e);
        setError('Something went wrong.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token, pillar]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#0f172a',
        }}
      >
        <Loader2 style={{ color: '#fff', width: 32, height: 32 }} />
      </div>
    );
  }

  if (error || !cardData) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#0f172a',
          color: 'rgba(255,255,255,0.5)',
          fontSize: 16,
        }}
      >
        {error ?? 'Card not available.'}
      </div>
    );
  }

  if (format === 'story') {
    return (
      <div style={{ margin: 0, padding: 0, lineHeight: 0 }}>
        <PillarStoryCard data={cardData} />
      </div>
    );
  }

  return (
    <div style={{ margin: 0, padding: 0, lineHeight: 0 }}>
      <PillarScoreCard data={cardData} />
    </div>
  );
}
