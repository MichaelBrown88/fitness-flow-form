import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { Search, User, Settings, LayoutDashboard, X } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/services/firebase';

interface ClientHit {
  id: string;
  name: string;
}

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [debouncedInput, setDebouncedInput] = useState('');
  const [clients, setClients] = useState<ClientHit[]>([]);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedInput(input), 250);
    return () => clearTimeout(timerRef.current);
  }, [input]);

  useEffect(() => {
    if (!debouncedInput.trim() || !user || !profile?.organizationId) {
      setClients([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setSearching(true);
      try {
        const ref = collection(db, 'organizations', profile.organizationId!, 'clientSummaries');
        const q = query(ref, where('coachUid', '==', user.uid), limit(20));
        const snap = await getDocs(q);
        const term = debouncedInput.toLowerCase();
        const hits: ClientHit[] = [];
        snap.forEach((doc) => {
          const name = (doc.data().clientName as string) ?? '';
          if (name.toLowerCase().includes(term)) {
            hits.push({ id: doc.id, name });
          }
        });
        if (!cancelled) setClients(hits);
      } catch {
        if (!cancelled) setClients([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => { cancelled = true; };
  }, [debouncedInput, user, profile?.organizationId]);

  const go = useCallback((path: string) => {
    setOpen(false);
    setInput('');
    navigate(path);
  }, [navigate]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="relative mx-auto mt-[15vh] w-full max-w-lg px-4">
        <Command
          className="rounded-xl border border-border bg-background shadow-2xl overflow-hidden"
          shouldFilter={false}
        >
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              value={input}
              onValueChange={setInput}
              placeholder="Search clients, pages…"
              className="flex-1 h-12 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground-secondary">
              <X className="h-4 w-4" />
            </button>
          </div>

          <Command.List className="max-h-72 overflow-y-auto p-2">
            {searching && (
              <Command.Loading>
                <p className="px-3 py-4 text-xs text-muted-foreground text-center">Searching…</p>
              </Command.Loading>
            )}

            <Command.Empty className="px-3 py-6 text-center text-xs text-muted-foreground">
              No results found.
            </Command.Empty>

            {clients.length > 0 && (
              <Command.Group heading="Clients">
                {clients.map((c) => (
                  <Command.Item
                    key={c.id}
                    value={c.name}
                    onSelect={() => go(`/client/${encodeURIComponent(c.name)}`)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-foreground-secondary rounded-lg cursor-pointer data-[selected=true]:bg-muted"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    {c.name}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group heading="Pages">
              <Command.Item
                onSelect={() => go(ROUTES.DASHBOARD)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-foreground-secondary rounded-lg cursor-pointer data-[selected=true]:bg-muted"
              >
                <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                Dashboard
              </Command.Item>
              <Command.Item
                onSelect={() => go(ROUTES.SETTINGS)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-foreground-secondary rounded-lg cursor-pointer data-[selected=true]:bg-muted"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                Settings
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">↑↓</kbd> navigate</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">⏎</kbd> select</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">esc</kbd> close</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
