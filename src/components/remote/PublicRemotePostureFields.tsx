import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { ASSESSMENT_COPY } from '@/constants/assessmentCopy';
import type { RemotePostureView } from '@/lib/types/remoteAssessment';
import {
  getRemotePostureUploadSlot,
  uploadBlobToSignedUrl,
} from '@/services/remoteAssessmentClient';
import { Loader2 } from 'lucide-react';

const VIEWS: RemotePostureView[] = ['front', 'side-left', 'back', 'side-right'];

type PublicRemotePostureFieldsProps = {
  token: string;
  value: Partial<Record<RemotePostureView, string>>;
  onChange: (next: Partial<Record<RemotePostureView, string>>) => void;
};

export function PublicRemotePostureFields({ token, value, onChange }: PublicRemotePostureFieldsProps) {
  const [busyView, setBusyView] = useState<RemotePostureView | null>(null);

  const onPick = async (view: RemotePostureView, file: File | null) => {
    if (!file) {
      const next = { ...value };
      delete next[view];
      onChange(next);
      return;
    }
    const contentType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    if (contentType !== 'image/jpeg' && contentType !== 'image/png') return;
    setBusyView(view);
    try {
      const { uploadUrl, storagePath } = await getRemotePostureUploadSlot(token, view, contentType);
      await uploadBlobToSignedUrl(uploadUrl, file, contentType);
      onChange({ ...value, [view]: storagePath });
    } finally {
      setBusyView(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{ASSESSMENT_COPY.REMOTE_POSTURE_INTRO}</p>
      {VIEWS.map((view) => (
        <div key={view} className="space-y-2">
          <Label>{ASSESSMENT_COPY.REMOTE_POSTURE_VIEW_LABEL(view)}</Label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/jpeg,image/png"
              className="text-sm text-muted-foreground file:mr-2 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-2"
              disabled={busyView !== null}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                void onPick(view, f);
                e.target.value = '';
              }}
            />
            {busyView === view ? <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden /> : null}
            {value[view] ? (
              <span className="text-xs text-score-green-fg font-medium">Uploaded</span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
