import { useEffect, useState, useCallback } from 'react';
import { Loader2, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getShareTokensForAssessment,
  revokeShareToken,
  type ShareTokenInfo,
} from '@/services/share';
import { CONFIG } from '@/config';
import { logger } from '@/lib/utils/logger';

interface SharedLinksManagerProps {
  coachUid: string;
  assessmentId: string;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const SharedLinksManager = ({ coachUid, assessmentId }: SharedLinksManagerProps) => {
  const [tokens, setTokens] = useState<ShareTokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingToken, setRevokingToken] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getShareTokensForAssessment(coachUid, assessmentId);
      setTokens(result);
    } catch (err) {
      logger.error('[SharedLinksManager] Failed to fetch tokens', err);
    } finally {
      setLoading(false);
    }
  }, [coachUid, assessmentId]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const handleRevoke = useCallback(async (token: string) => {
    try {
      setRevokingToken(token);
      await revokeShareToken(token);
      setTokens((prev) =>
        prev.map((t) => (t.token === token ? { ...t, revoked: true } : t)),
      );
    } catch (err) {
      logger.error('[SharedLinksManager] Failed to revoke token', err);
    } finally {
      setRevokingToken(null);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-slate-500">
        No shared links for this assessment.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-slate-900">Shared Links</h3>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {tokens.map((t) => (
          <li
            key={t.token}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-slate-700">
                  {t.clientName}
                </span>
                {t.revoked && (
                  <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-600">
                    Revoked
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Created {formatDate(t.createdAt)}
                {t.lastAccessed && ` · Last viewed ${formatDate(t.lastAccessed)}`}
              </p>
            </div>

            <div className="flex items-center gap-1">
              {!t.revoked && (
                <>
                  <a
                    href={`${CONFIG.APP.HOST}/r/${t.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Open shared link"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                    disabled={revokingToken === t.token}
                    onClick={() => handleRevoke(t.token)}
                    aria-label="Revoke shared link"
                  >
                    {revokingToken === t.token ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SharedLinksManager;
