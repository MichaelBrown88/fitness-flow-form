import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ScanLine, Pencil, SkipForward } from 'lucide-react';
import { OcrReviewDialog } from '@/components/assessment/OcrReviewDialog';
import {
  getRemoteBodyCompUploadSlot,
  uploadBlobToSignedUrl,
  extractBodyCompOcrFromStorage,
} from '@/services/remoteAssessmentClient';
import type { FormData } from '@/contexts/FormContext';
import { logger } from '@/lib/utils/logger';

const BODY_COMP_MANUAL_FIELDS: { key: string; label: string; unit: string }[] = [
  { key: 'inbodyWeightKg', label: 'Weight', unit: 'kg' },
  { key: 'inbodyBodyFatPct', label: 'Body Fat %', unit: '%' },
  { key: 'skeletalMuscleMassKg', label: 'Skeletal Muscle Mass', unit: 'kg' },
  { key: 'bodyFatMassKg', label: 'Body Fat Mass', unit: 'kg' },
  { key: 'inbodyBmi', label: 'BMI', unit: '' },
  { key: 'visceralFatLevel', label: 'Visceral Fat Level', unit: '' },
  { key: 'totalBodyWaterL', label: 'Total Body Water', unit: 'L' },
  { key: 'waistHipRatio', label: 'Waist-Hip Ratio', unit: '' },
  { key: 'bmrKcal', label: 'Basal Metabolic Rate', unit: 'kcal' },
];

export type BodyCompStatus = 'pending' | 'skipped' | 'confirmed';

interface RemoteBodyCompStepProps {
  token: string;
  status: BodyCompStatus;
  fields: Record<string, string>;
  onStatusChange: (s: BodyCompStatus) => void;
  onFieldsChange: (f: Record<string, string>) => void;
}

export function RemoteBodyCompStep({
  token,
  status,
  fields,
  onStatusChange,
  onFieldsChange,
}: RemoteBodyCompStepProps) {
  const [mode, setMode] = useState<'gate' | 'scanning' | 'reviewing' | 'manual'>('gate');
  const [ocrReviewData, setOcrReviewData] = useState<Partial<FormData> | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (status === 'skipped') {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3">
        <p className="text-sm text-muted-foreground">
          No problem -- your coach will take your body composition measurements in studio.
        </p>
        <button
          type="button"
          className="text-xs text-primary underline"
          onClick={() => { onStatusChange('pending'); setMode('gate'); }}
        >
          Add body comp results instead
        </button>
      </div>
    );
  }

  if (status === 'confirmed') {
    const confirmedCount = Object.keys(fields).length;
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3">
        <p className="text-sm font-medium text-foreground">
          Body comp results added ({confirmedCount} values)
        </p>
        <button
          type="button"
          className="text-xs text-primary underline"
          onClick={() => { onStatusChange('pending'); setMode('gate'); onFieldsChange({}); }}
        >
          Re-enter
        </button>
      </div>
    );
  }

  // Gate screen
  if (mode === 'gate') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Do you have recent body composition results (InBody, DEXA, or similar)?
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          If you don't have results, or they're more than 3 months old, skip this -- your coach will measure you in studio.
        </p>
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 rounded-xl justify-start gap-3"
            onClick={() => { setMode('scanning'); setUploadError(null); }}
          >
            <ScanLine className="h-4 w-4 shrink-0" />
            Scan my results
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 rounded-xl justify-start gap-3"
            onClick={() => setMode('manual')}
          >
            <Pencil className="h-4 w-4 shrink-0" />
            Enter manually
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full h-11 rounded-xl text-muted-foreground justify-start gap-3"
            onClick={() => onStatusChange('skipped')}
          >
            <SkipForward className="h-4 w-4 shrink-0" />
            Skip -- we'll do it in studio
          </Button>
        </div>
      </div>
    );
  }

  // Scan mode
  if (mode === 'scanning') {
    const handleFilePick = async (file: File) => {
      const contentType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      setBusy(true);
      setUploadError(null);
      try {
        const { uploadUrl, storagePath } = await getRemoteBodyCompUploadSlot(token, contentType);
        await uploadBlobToSignedUrl(uploadUrl, file, contentType);
        const { fields: extracted } = await extractBodyCompOcrFromStorage(token, storagePath);
        setOcrReviewData(extracted as Partial<FormData>);
      } catch (err) {
        logger.error('[RemoteBodyComp] scan failed', err);
        setUploadError('Could not process image. Try again or enter values manually.');
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Take a photo of your InBody or body composition results printout.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFilePick(f);
            e.target.value = '';
          }}
        />
        <Button
          type="button"
          className="w-full h-12 rounded-xl"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          {busy ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
          ) : (
            <><ScanLine className="h-4 w-4 mr-2" />Take photo / Choose file</>
          )}
        </Button>
        {uploadError && (
          <p className="text-sm text-destructive">{uploadError}</p>
        )}
        <button
          type="button"
          className="text-xs text-muted-foreground underline"
          onClick={() => setMode('gate')}
        >
          Back
        </button>
        <OcrReviewDialog
          ocrReviewData={ocrReviewData}
          setOcrReviewData={setOcrReviewData}
          applyOcrData={() => {
            if (ocrReviewData) {
              const confirmed: Record<string, string> = {};
              for (const [k, v] of Object.entries(ocrReviewData)) {
                if (v !== undefined && v !== '') confirmed[k] = String(v);
              }
              onFieldsChange(confirmed);
              onStatusChange('confirmed');
            }
            setOcrReviewData(null);
          }}
        />
      </div>
    );
  }

  // Manual entry mode
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter your body composition values. Leave blank anything you don't have.
      </p>
      <div className="space-y-3">
        {BODY_COMP_MANUAL_FIELDS.map(({ key, label, unit }) => (
          <div key={key} className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              {label}{unit ? <span className="text-xs text-muted-foreground ml-1">({unit})</span> : null}
            </label>
            <Input
              type="number"
              inputMode="decimal"
              value={fields[key] ?? ''}
              onChange={(e) => onFieldsChange({ ...fields, [key]: e.target.value })}
              placeholder="--"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          className="flex-1 h-11 rounded-xl"
          disabled={Object.values(fields).every(v => !v)}
          onClick={() => onStatusChange('confirmed')}
        >
          Save values
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 px-4 rounded-xl"
          onClick={() => setMode('gate')}
        >
          Back
        </Button>
      </div>
      <button
        type="button"
        className="text-xs text-muted-foreground underline"
        onClick={() => onStatusChange('skipped')}
      >
        Skip instead
      </button>
    </div>
  );
}
