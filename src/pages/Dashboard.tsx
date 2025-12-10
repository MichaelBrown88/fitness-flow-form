import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { listCoachAssessments, type CoachAssessmentSummary } from '@/services/coachAssessments';

const Dashboard = () => {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<CoachAssessmentSummary[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) {
      return;
    }
    (async () => {
      try {
        setLoadingData(true);
        const data = await listCoachAssessments(user.uid, 100);
        setItems(data);
      } finally {
        setLoadingData(false);
      }
    })();
  }, [user]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => item.clientName.toLowerCase().includes(term));
  }, [items, search]);

  const totalAssessments = items.length;
  const lastAssessment = items[0];

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Checking coach session…
      </div>
    );
  }

  return (
    <AppShell
      title="Coach dashboard"
      subtitle="See your recent assessments and quickly pull up any client."
      actions={
        <Button asChild className="bg-slate-900 text-white hover:bg-slate-800">
          <Link to="/assessment">+ New assessment</Link>
        </Button>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total assessments
            </div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {loadingData ? '—' : totalAssessments}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Last assessment
            </div>
            <div className="mt-2 text-sm text-slate-700">
              {loadingData
                ? 'Loading…'
                : lastAssessment
                ? `${lastAssessment.clientName} · ${
                    lastAssessment.createdAt
                      ? lastAssessment.createdAt.toDate().toLocaleDateString()
                      : 'no date'
                  }`
                : 'No assessments yet'}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Average overall score
            </div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">
              {loadingData || !items.length
                ? '—'
                : Math.round(
                    items.reduce((sum, item) => sum + (item.overallScore || 0), 0) /
                      items.length,
                  )}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Recent assessments
            </h2>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search by client name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-56 text-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Client
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Overall
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Goals
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingData ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-sm text-slate-500"
                    >
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-sm text-slate-500"
                    >
                      {search
                        ? 'No assessments match that name.'
                        : 'No assessments saved yet. Run an assessment to see it here.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-sm text-slate-900">
                        {item.clientName}
                      </td>
                      <td className="px-4 py-2 text-sm text-slate-600">
                        {item.createdAt
                          ? item.createdAt.toDate().toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-4 py-2 text-sm text-slate-800">
                        {item.overallScore || '—'}
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-600">
                        {item.goals && item.goals.length
                          ? item.goals.join(', ')
                          : '—'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/coach/assessments/${item.id}`}>
                            Open
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
};

export default Dashboard;


