/**
 * WebhooksManager
 *
 * CRUD UI for an org's outbound webhook endpoints.
 * Each webhook has: URL, secret, events to subscribe to, active toggle.
 */

import { useState, useEffect, useMemo } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, limit, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ORG_WEBHOOKS_QUERY_LIMIT } from '@/constants/firestoreQueryLimits';
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

  const webhooksRef = useMemo(
    () => collection(getDb(), `organizations/${organizationId}/webhooks`),
    [organizationId],
  );

  useEffect(() => {
    getDocs(query(webhooksRef, limit(ORG_WEBHOOKS_QUERY_LIMIT)))
      .then(snap => {
        setWebhooks(snap.docs.map(d => ({ id: d.id, ...d.data() }) as WebhookConfig));
      })
      .catch(err => logger.error('[Webhooks] Load failed:', err))
      .finally(() => setLoading(false));
  }, [webhooksRef]);

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
      await deleteDoc(doc(getDb(), `organizations/${organizationId}/webhooks/${id}`));
      setWebhooks(prev => prev.filter(w => w.id !== id));
      toast({ title: 'Webhook removed' });
    } catch (err) {
      logger.error('[Webhooks] Delete failed:', err);
      toast({ title: 'Failed to remove webhook', variant: 'destructive' });
    }
  };

  const handleToggleActive = async (webhook: WebhookConfig) => {
    try {
      await updateDoc(doc(getDb(), `organizations/${organizationId}/webhooks/${webhook.id}`), {
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
    return <div className="h-20 animate-pulse bg-muted rounded-xl" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Webhook className="h-4 w-4 text-primary" />
            Outbound Webhooks
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
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
        <div className="rounded-xl border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No webhooks configured yet.
        </div>
      )}

      {webhooks.map(webhook => (
        <div key={webhook.id} className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{webhook.url}</p>
              <div className="flex items-center gap-1.5 mt-1">
                {webhook.events.map(e => (
                  <span key={e} className="text-[10px] font-bold bg-primary/5 text-primary px-2 py-0.5 rounded-full">{e}</span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => handleToggleActive(webhook)} className="text-muted-foreground hover:text-foreground-secondary">
                {webhook.active
                  ? <ToggleRight className="h-5 w-5 text-primary" />
                  : <ToggleLeft className="h-5 w-5" />}
              </button>
              <button onClick={() => handleDelete(webhook.id)} className="text-muted-foreground hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[10px] bg-muted/50 rounded-lg px-3 py-1.5 text-muted-foreground truncate font-mono">
              {webhook.secret}
            </code>
            <button onClick={() => copySecret(webhook.secret)} className="text-muted-foreground hover:text-primary">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}

      {showForm && (
        <div className="rounded-xl border-2 border-primary/20 bg-brand-light p-4 space-y-4">
          <p className="text-xs font-bold text-foreground-secondary">New Endpoint</p>
          <Input
            placeholder="https://your-server.com/webhook"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            className="rounded-xl"
          />
          <div>
            <p className="text-[10px] font-bold text-muted-foreground mb-2 uppercase tracking-wide">Subscribe to events</p>
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
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground-secondary border-border hover:border-primary/30'
                    }`}
                  >
                    {evt.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[10px] bg-background rounded-lg px-3 py-1.5 text-muted-foreground truncate font-mono">
              Secret: {newSecret}
            </code>
            <button onClick={() => copySecret(newSecret)} className="text-muted-foreground hover:text-primary">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-xl font-bold text-xs" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="rounded-xl font-bold text-xs bg-primary text-primary-foreground"
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
