import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { FormData } from '@/contexts/FormContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Scan, CheckCircle2 } from 'lucide-react';

const OCR_FIELD_LABELS: Record<string, string> = {
  inbodyScore: 'InBody Score',
  inbodyWeightKg: 'Weight',
  skeletalMuscleMassKg: 'Skeletal Muscle Mass',
  bodyFatMassKg: 'Body Fat Mass',
  inbodyBodyFatPct: 'Body Fat %',
  inbodyBmi: 'BMI',
  totalBodyWaterL: 'Total Body Water',
  waistHipRatio: 'Waist-Hip Ratio',
  visceralFatLevel: 'Visceral Fat Level',
  bmrKcal: 'Basal Metabolic Rate',
  segmentalTrunkKg: 'Trunk Muscle',
  segmentalArmLeftKg: 'Left Arm Muscle',
  segmentalArmRightKg: 'Right Arm Muscle',
  segmentalLegLeftKg: 'Left Leg Muscle',
  segmentalLegRightKg: 'Right Leg Muscle',
};

interface OcrReviewDialogProps {
  ocrReviewData: Partial<FormData> | null;
  setOcrReviewData: React.Dispatch<React.SetStateAction<Partial<FormData> | null>>;
  applyOcrData: () => void;
}

export const OcrReviewDialog = ({
  ocrReviewData,
  setOcrReviewData,
  applyOcrData
}: OcrReviewDialogProps) => {
  return (
    <Dialog open={!!ocrReviewData} onOpenChange={() => setOcrReviewData(null)}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5 text-primary" />
              Check the Numbers
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Review the extracted values below. Edit anything that looks wrong, then tap <strong>Apply</strong>.
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Fields highlighted in amber weren&apos;t detected — enter them manually or leave blank to skip.
            </p>
            <div className="grid grid-cols-2 gap-4 max-h-[360px] overflow-y-auto p-2">
              {ocrReviewData && [
                'inbodyScore',
                'inbodyWeightKg',
                'skeletalMuscleMassKg',
                'bodyFatMassKg',
                'inbodyBodyFatPct',
                'inbodyBmi',
                'totalBodyWaterL',
                'waistHipRatio',
                'visceralFatLevel',
                'bmrKcal',
                'segmentalTrunkKg',
                'segmentalArmLeftKg',
                'segmentalArmRightKg',
                'segmentalLegLeftKg',
                'segmentalLegRightKg'
              ].map(key => {
                const value = ocrReviewData[key as keyof typeof ocrReviewData] ?? '';
                const unit = key.toLowerCase().includes('kg') ? 'kg' : key.toLowerCase().includes('pct') ? '%' : key.toLowerCase().includes('water') ? 'L' : key.toLowerCase().includes('kcal') ? 'kcal' : '';
                return (
                  <div key={key} className={`flex flex-col justify-between rounded-lg border bg-muted/50 p-3 transition-all ${!value ? 'border-amber-200 bg-amber-50/30' : 'border-border'}`}>
                    <span className="text-[10px] font-semibold text-muted-foreground mb-1.5">
                      {OCR_FIELD_LABELS[key] ?? key}
                      {unit ? <span className="ml-1 text-muted-foreground/60">({unit})</span> : null}
                    </span>
                    <Input
                      type="text"
                      value={value as string}
                      placeholder="—"
                      onChange={(e) => {
                        setOcrReviewData(prev => prev ? ({
                          ...prev,
                          [key]: e.target.value
                        }) : null);
                      }}
                      className="h-8 text-lg font-bold text-foreground border-none bg-transparent p-0 focus-visible:ring-0 shadow-none w-full placeholder:text-muted-foreground/40"
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOcrReviewData(null)} className="rounded-lg font-bold">
              Cancel
            </Button>
            <Button onClick={applyOcrData} className="gap-2 rounded-lg bg-primary font-bold text-primary-foreground transition-colors hover:bg-primary/90">
              <CheckCircle2 className="h-4 w-4" />
              Apply to Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
};
