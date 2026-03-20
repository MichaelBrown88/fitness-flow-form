/**
 * CsvClientImport
 *
 * Accepts a CSV file with columns: name, email (minimum).
 * Previews the rows and creates client profiles on confirm.
 */

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { createOrUpdateClientProfile } from '@/services/clientProfiles';
import { logger } from '@/lib/utils/logger';

interface CsvRow {
  name: string;
  email: string;
  valid: boolean;
}

interface CsvClientImportProps {
  organizationId: string;
  coachUid: string;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const nameIdx = headers.findIndex(h => h.includes('name'));
  const emailIdx = headers.findIndex(h => h.includes('email'));

  if (nameIdx === -1) return [];

  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const name = cols[nameIdx] ?? '';
    const email = emailIdx !== -1 ? cols[emailIdx] ?? '' : '';
    const valid = name.length >= 2;
    return { name, email, valid };
  }).filter(r => r.name);
}

export function CsvClientImport({ organizationId, coachUid }: CsvClientImportProps) {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseCsv(text));
      setDone(false);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const valid = rows.filter(r => r.valid);
    if (!valid.length) return;
    setImporting(true);

    let created = 0;
    let failed = 0;

    for (const row of valid) {
      try {
        await createOrUpdateClientProfile(coachUid, row.name, { email: row.email }, organizationId);
        created++;
      } catch (err) {
        logger.error('[CsvImport] Failed to create client profile:', err);
        failed++;
      }
    }

    setImporting(false);
    setDone(true);
    setRows([]);

    if (created > 0) {
      toast({ title: `${created} client${created > 1 ? 's' : ''} imported successfully` });
    }
    if (failed > 0) {
      toast({ title: `${failed} failed to import`, variant: 'destructive' });
    }
  };

  const validCount = rows.filter(r => r.valid).length;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          CSV Client Import
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Upload a CSV with at minimum a <code className="font-mono">name</code> column. Optionally add <code className="font-mono">email</code>.
        </p>
      </div>

      <div
        onClick={() => fileRef.current?.click()}
        className="cursor-pointer border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-primary/30 hover:bg-brand-light transition-colors"
      >
        <Upload className="h-6 w-6 text-slate-400" />
        <p className="text-sm font-medium text-slate-500">Click to upload CSV</p>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFile} />
      </div>

      {done && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <p className="text-sm font-bold text-emerald-700">Import complete</p>
        </div>
      )}

      {rows.length > 0 && !done && (
        <div className="space-y-2">
          <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl border border-slate-100 p-3">
            {rows.map((row, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs py-1 px-2 rounded-lg ${row.valid ? 'text-slate-700' : 'text-red-400 bg-red-50'}`}>
                {row.valid
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  : <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                <span className="font-medium truncate">{row.name || '—'}</span>
                {row.email && <span className="text-slate-400 truncate">{row.email}</span>}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">{validCount} valid row{validCount !== 1 ? 's' : ''}</p>
            <Button
              size="sm"
              className="rounded-xl font-bold text-xs bg-primary text-white"
              onClick={handleImport}
              disabled={importing || validCount === 0}
            >
              {importing ? 'Importing…' : `Import ${validCount} client${validCount !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
