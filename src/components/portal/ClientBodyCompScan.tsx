/**
 * Client Body Composition Scan
 * 
 * Air-gapped client-facing component for scanning body composition documents.
 * Reuses the existing Gemini OCR pipeline (processBodyCompScan) but stores
 * results as a client submission rather than writing to a live session.
 */

import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Upload, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { saveBodyCompSubmission } from '@/services/clientSubmissions';
import { useToast } from '@/hooks/use-toast';
import type { FormData } from '@/contexts/FormContext';

/** OCR field labels for the review screen */
const FIELD_LABELS: Record<string, string> = {
  inbodyScore: 'Body Comp Score',
  inbodyWeightKg: 'Weight (kg)',
  skeletalMuscleMassKg: 'Skeletal Muscle Mass (kg)',
  bodyFatMassKg: 'Body Fat Mass (kg)',
  inbodyBodyFatPct: 'Body Fat (%)',
  inbodyBmi: 'BMI',
  totalBodyWaterL: 'Total Body Water (L)',
  visceralFatLevel: 'Visceral Fat Level',
  bmrKcal: 'BMR (kcal)',
};

interface ClientBodyCompScanProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function ClientBodyCompScan({ onComplete, onCancel }: ClientBodyCompScanProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'processing' | 'review' | 'saving'>('upload');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<Partial<FormData>>({});
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setImagePreview(base64);
      setStep('processing');

      try {
        // Dynamically import OCR engine to avoid bloating the portal bundle
        const { processBodyCompScan } = await import('@/lib/ai/ocrEngine');
        const result = await processBodyCompScan(base64);
        
        setExtractedData(result.fields);
        setConfidence(result.confidence);
        setStep('review');
      } catch (err) {
        setError('Failed to analyze the document. Please try a clearer photo.');
        setStep('upload');
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleInputChange = useCallback((fieldId: string) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setExtractedData((prev) => ({
        ...prev,
        [fieldId]: value === '' ? undefined : parseFloat(value) || value,
      }));
    };
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!user || !profile) return;
    setStep('saving');

    try {
      await saveBodyCompSubmission(
        user.uid,
        profile.organizationId,
        imagePreview || '',
        extractedData,
        confidence
      );
      toast({
        title: 'Scan submitted',
        description: 'Your coach will review the results.',
      });
      onComplete();
    } catch (err) {
      setError('Failed to save submission. Please try again.');
      setStep('review');
    }
  }, [user, profile, imagePreview, extractedData, confidence, toast, onComplete]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Scan Body Composition Report</h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4">
        {/* Upload step */}
        {step === 'upload' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
              <Camera className="w-7 h-7 text-violet-500" />
            </div>
            <p className="text-sm text-slate-700 font-medium mb-1">
              Take a photo of your body composition report
            </p>
            <p className="text-xs text-slate-400 mb-6 max-w-xs mx-auto">
              Our AI will extract the data automatically. Make sure the text is clear and well-lit.
            </p>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-500 mb-4 justify-center">
                <AlertCircle className="w-3 h-3" />
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-500"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Photo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>
          </div>
        )}

        {/* Processing step */}
        {step === 'processing' && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-slate-700">Analyzing your report...</p>
            <p className="text-xs text-slate-400 mt-1">This usually takes a few seconds.</p>
          </div>
        )}

        {/* Review step */}
        {step === 'review' && (
          <div className="space-y-4">
            <div className="bg-emerald-50 rounded-xl p-3 flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-emerald-800">Data extracted successfully</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">
                  Confidence: {Math.round(confidence * 100)}%. Please verify the values below.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {Object.entries(FIELD_LABELS).map(([fieldId, label]) => {
                const value = extractedData[fieldId as keyof FormData];
                if (value === undefined || value === null) return null;
                return (
                  <div key={fieldId} className="flex items-center gap-3">
                    <label className="text-xs text-slate-500 w-36 flex-shrink-0 text-right">
                      {label}
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={value as string | number}
                      onChange={handleInputChange(fieldId)}
                      className="h-9 rounded-lg text-sm flex-1"
                    />
                  </div>
                );
              })}
            </div>

            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => { setStep('upload'); setImagePreview(null); setExtractedData({}); }}
                className="flex-1 h-10 rounded-xl"
              >
                Retake
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 h-10 rounded-xl bg-violet-600 hover:bg-violet-500"
              >
                Submit for Review
              </Button>
            </div>
          </div>
        )}

        {/* Saving step */}
        {step === 'saving' && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-slate-700">Saving your submission...</p>
          </div>
        )}
      </div>
    </div>
  );
}
