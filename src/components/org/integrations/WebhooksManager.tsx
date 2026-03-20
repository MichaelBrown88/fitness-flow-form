/**
 * WebhooksManager
 *
 * CRUD UI for an org's outbound webhook endpoints.
 * Each webhook has: URL, secret, events to subscribe to, active toggle.
 */

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Webhook, Plus, Trash2, ToggleLeft, ToggleRight, Copy } from 'lucide-react';
import { logger } from '@/lib/utils/logger';

const WEBHOOK_EVENTS = [
  { id: 'assessment.completed', label: 'Assessment Completed' },
  { id: 'client.score_changed', label: 'Client Score Changed' },
  { id: 'client.phase_completed', label: 'Client Phase Completed' },
] as const;

type WebhookEvent = typeof WEBHOOK_EVENTS[number]['id'];

interface WebhookConfig {
  id: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  active: boolean;
}

interface WebhooksManagerProps {
  organizationId: string;
}

function randomSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function WebhooksManager({ organizationId }: WebhooksManagerProps) {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newSecret] = useState(randomSecret);
  const [newEvents, setNewEvents] = useState<WebhookEvent[]>(['assessment.completed']);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const db = getDb();
  const webhooksRef = collection(db, `organizations/${organizationId}/webhooks`);

  useEffect(() => {
    getDocs(webhooksRef)
      .then(snap => {
        setWebhooks(snap.docs.map(d => ({ id: d.id, ...d.data() }) as WebhookConfig));
      })
      .catch(err => logger.error('[Webhooks] Load failed:', err))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const handleAdd = async () => {
    if (!newUrl.startsWith('https://')) {
      toast({ title: 'URL must start with https://', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const docRef = await addDoc(webhooksRef, {
        url: newUrl,
        secret: newSecret,
        events: newEvents,
        active: true,
        createdAt: serverTimestamp(),
      });
      setWebhooks(prev => [...prev, { id: docRef.id, url: newUrl, secret: newSecret, events: newEvents, active: true }]);
      setNewUrl('');
      setShowForm(false);
      toast({ title: 'Webhook added' });
    } catch (err) {
      logger.error('[Webhooks] Add failed:', err);
      toast({ title: 'Failed to add webhook', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, `organizations/${organizationId}/webhooks/${id}`));
      setWebhooks(prev => prev.filter(w => w.id !== id));
      toast({ title: 'Webhook removed' });
    } catch (err) {
      logger.error('[Webhooks] Delete failed:', err);
      toast({ title: 'Failed to remove webhook', variant: 'destructive' });
    }
  };

  const handleToggleActive = async (webhook: WebhookConfig) => {
    try {
      await updateDoc(doc(db, `organizations/${organizationId}/webhooks/${webhook.id}`), {
        active: !webhook.active,
      });
      setWebhooks(prev => prev.map(w => w.id === webhook.id ? { ...w, active: !w.active } : w));
    } catch (err) {
      logger.error('[Webhooks] Toggle failed:', err);
    }
  };

  const copySecret = (secret: string) => {
    navigator.clipboard.writeText(secret).then(() => {
      toast({ title: 'Secret copied to clipboard' });
    });
  };

  if (loading) {
    return <div className="h-20 animate-pulse bg-slate-100 rounded-xl" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Webhook className="h-4 w-4 text-primary" />
            Outbound Webhooks
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Receive real-time events in your own systems. All requests are HMAC-SHA256 signed.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl gap-1.5 font-bold text-xs"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Endpoint
        </Button>
      </div>

      {webhooks.length === 0 && !showForm && (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
          No webhooks configured yet.
        </div>
      )}

      {webhooks.map(webhook => (
        <div key={webhook.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{webhook.url}</p>
              <div className="flex items-center gap-1.5 mt-1">
                {webhook.events.map(e => (
                  <span key={e} className="text-[10px] font-bold bg-primary/5 text-primary px-2 py-0.5 rounded-full">{e}</span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => handleToggleActive(webhook)} className="text-slate-400 hover:text-slate-700">
                {webhook.active
                  ? <ToggleRight className="h-5 w-5 text-primary" />
                  : <ToggleLeft className="h-5 w-5" />}
              </button>
              <button onClick={() => handleDelete(webhook.id)} className="text-slate-300 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[10px] bg-slate-50 rounded-lg px-3 py-1.5 text-slate-500 truncate font-mono">
              {webhook.secret}
            </code>
            <button onClick={() => copySecret(webhook.secret)} className="text-slate-400 hover:text-primary">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}

      {showForm && (
        <div className="rounded-xl border-2 border-primary/20 bg-brand-light p-4 space-y-4">
          <p className="text-xs font-bold text-slate-700">New Endpoint</p>
          <Input
            placeholder="https://your-server.com/webhook"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            className="rounded-xl"
          />
          <div>
            <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wide">Subscribe to events</p>
            <div className="flex flex-wrap gap-2">
              {WEBHOOK_EVENTS.map(evt => {
                const selected = newEvents.includes(evt.id);
                return (
                  <button
                    key={evt.id}
                    type="button"
                    onClick={() => setNewEvents(prev =>
                      selected ? prev.filter(e => e !== evt.id) : [...prev, evt.id]
                    )}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${
                      selected
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-primary/30'
                    }`}
                  >
                    {evt.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[10px] bg-white rounded-lg px-3 py-1.5 text-slate-500 truncate font-mono">
              Secret: {newSecret}
            </code>
            <button onClick={() => copySecret(newSecret)} className="text-slate-400 hover:text-primary">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-xl font-bold text-xs" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="rounded-xl font-bold text-xs bg-primary text-white"
              onClick={handleAdd}
              disabled={saving || !newUrl || newEvents.length === 0}
            >
              {saving ? 'Adding…' : 'Add Endpoint'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
