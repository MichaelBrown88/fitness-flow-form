import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFormContext, type FormData } from '@/contexts/FormContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Scan, CheckCircle2 } from 'lucide-react';

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
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5 text-primary" />
              Check the Numbers
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-slate-500">
              Here's what we found. Double-check the numbers look right.
            </p>
            <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto p-2">
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
                return (
                  <div key={key} className={`bg-slate-50 p-4 rounded-2xl border transition-all flex flex-col justify-between ${!value ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100'}`}>
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary/70 mb-2">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                    <div className="flex items-baseline gap-1">
                      <Input 
                        type="text" 
                        value={value as string} 
                        placeholder="--"
                        onChange={(e) => {
                          setOcrReviewData(prev => prev ? ({
                            ...prev,
                            [key]: e.target.value
                          }) : null);
                        }}
                        className="h-8 text-xl font-black text-slate-900 border-none bg-transparent p-0 focus-visible:ring-0 shadow-none w-full placeholder:text-slate-300"
                      />
                      <span className="text-[10px] font-bold text-slate-400">
                        {key.toLowerCase().includes('kg') ? 'kg' : key.toLowerCase().includes('pct') ? '%' : key.toLowerCase().includes('water') ? 'L' : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOcrReviewData(null)} className="rounded-xl font-bold">
              Cancel
            </Button>
            <Button onClick={applyOcrData} className="rounded-xl bg-slate-900 font-bold gap-2 text-white hover:bg-slate-800 transition-colors">
              <CheckCircle2 className="h-4 w-4" />
              Apply to Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
};
