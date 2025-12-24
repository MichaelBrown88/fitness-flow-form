import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  createLiveSession, 
  subscribeToLiveSession, 
  updatePostureAnalysis,
  type LiveSession 
} from '@/services/liveSessions';
import { analyzePostureImage } from '@/lib/ai/postureAnalysis';
import { 
  Smartphone, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  Camera, 
  ArrowRight,
  RefreshCcw,
  Monitor,
  ShieldAlert
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface PostureCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: any) => void;
  onStartDirectScan?: () => void;
}

export const PostureCompanionModal: React.FC<PostureCompanionModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  onStartDirectScan
}) => {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [analyzingViews, setAnalyzingViews] = useState<Record<string, boolean>>({});
  const [isOnline, setIsOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const processedRef = useRef<Set<string>>(new Set());

  // 1. Create Session
  useEffect(() => {
    if (isOpen && !session) {
      const init = async () => {
        try {
          const newSession = await createLiveSession('current-client');
          setSession(newSession);
          setError(null);
        } catch (err) {
          setError("Connection failed. Please check your internet.");
        }
      };
      init();
    }
  }, [isOpen, session]);

  // 2. Listen for Photos
  useEffect(() => {
    if (!session?.id) return;

    const unsubscribe = subscribeToLiveSession(session.id, (updatedSession) => {
      console.log('[MODAL] Snapshot update:', updatedSession.postureImages);
      setSession(updatedSession);
      // ONLY set online if companion has joined
      if (updatedSession.companionJoined) {
        setIsOnline(true);
      }

      // 3. AUTO-START AI ANALYSIS
      const views: ('front' | 'side-right' | 'side-left' | 'back')[] = ['front', 'side-right', 'side-left', 'back'];
      for (const view of views) {
        const imageUrl = updatedSession.postureImages[view];
        const hasAnalysis = updatedSession.analysis[view];
        
        if (imageUrl && !hasAnalysis && !processedRef.current.has(`${view}-${imageUrl}`)) {
          processedRef.current.add(`${view}-${imageUrl}`);
          handleAnalyze(view, imageUrl);
        }
      }
    });

    return () => unsubscribe();
  }, [session?.id]);

  const companionUrl = session 
    ? `${window.location.origin}/companion/${session.id}?token=${session.companionToken}` 
    : '';

  const views: ('front' | 'side-right' | 'side-left' | 'back')[] = ['front', 'side-right', 'side-left', 'back'];
  
  const hasAllImages = views.every(v => !!session?.postureImages[v]);
  const isComplete = views.every(v => !!session?.analysis[v]);

  const handleAnalyze = async (view: 'front' | 'side-right' | 'side-left' | 'back', url: string) => {
    setAnalyzingViews(prev => ({ ...prev, [view]: true }));
    try {
      console.log(`[AI] Starting analysis for ${view}...`);
      const result = await analyzePostureImage(url, view);
      if (session?.id) {
        await updatePostureAnalysis(session.id, view, result);
        console.log(`[AI] Success for ${view}`);
      }
    } catch (err) {
      console.error(`[AI] Failed for ${view}:`, err);
      toast({ title: "AI Analysis Failed", description: "Could not process " + view, variant: "destructive" });
    } finally {
      setAnalyzingViews(prev => ({ ...prev, [view]: false }));
    }
  };

  const handleApply = () => {
    if (!session) return;
    
    // Map basic fields for compatibility + store full AI results for the report
    const findings = {
      postureAiResults: session.analysis,
      postureHeadOverall: session.analysis['side-right']?.head_posture.status.toLowerCase().includes('neutral') ? 'neutral' : 'forward-head',
      postureShouldersOverall: session.analysis.front?.shoulder_alignment.status.toLowerCase().includes('neutral') ? 'neutral' : 'rounded',
      postureBackOverall: session.analysis['side-right']?.head_posture.status.toLowerCase().includes('severe') ? 'increased-kyphosis' : 'neutral',
    };
    
    console.log('[POSTURE] Applying Full AI Findings:', findings);
    onComplete(findings);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl p-0 border-none bg-white">
        <div className="flex flex-col lg:flex-row h-full">
          
          {/* LEFT: CONNECTION STATUS & QR */}
          <div className="w-full lg:w-1/3 bg-slate-50 p-8 border-r border-slate-100 flex flex-col items-center">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="bg-white p-4 rounded-3xl shadow-sm mb-4">
                <Smartphone className="h-10 w-10 text-indigo-600" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Remote Camera</h3>
              <p className="text-slate-500 text-xs mt-2">Scan to connect your phone.</p>
            </div>

            <div className="p-4 bg-white rounded-3xl shadow-xl border-4 border-white mb-6 flex items-center justify-center min-h-[212px]">
              {companionUrl ? (
                <div className="animate-in zoom-in duration-500">
                  <QRCodeSVG value={companionUrl} size={180} />
                </div>
              ) : (
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              )}
            </div>

            {session?.id && (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full shadow-sm border border-slate-100">
                  {isOnline ? (
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[9px] font-black text-emerald-600 uppercase">Phone Connected</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <RefreshCcw className="h-3 w-3 animate-spin text-slate-400" />
                      <span className="text-[9px] font-black text-slate-400 uppercase">Waiting...</span>
                    </div>
                  )}
                </div>
                <span className="text-[8px] font-mono text-slate-300">ID: {session.id}</span>
              </div>
            )}

            <div className="mt-auto w-full pt-8 border-t border-slate-200">
              <Button 
                variant="outline" 
                onClick={() => { onClose(); onStartDirectScan?.(); }}
                className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 bg-white"
              >
                <Monitor className="h-4 w-4" />
                Use This Device
              </Button>
            </div>
          </div>

          {/* RIGHT: LIVE SYNC GRID */}
          <div className="flex-1 p-8 overflow-y-auto bg-white max-h-[90vh]">
            <div className="grid grid-cols-2 gap-4 pb-20">
              {views.map((view) => {
                const imageUrl = session?.postureImages[view];
                return (
                  <div key={view} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{view}</span>
                      {imageUrl && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                    </div>
                    <div className="aspect-[3/4] rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden relative flex items-center justify-center">
                      {imageUrl ? (
                        <>
                          <img src={imageUrl} className="w-full h-full object-cover animate-in fade-in zoom-in duration-500" alt={view} />
                          {analyzingViews[view] && (
                            <div className="absolute inset-0 bg-indigo-600/40 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
                              <Loader2 className="h-8 w-8 animate-spin text-white mb-2" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-white">AI Analysis...</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <Camera className="h-6 w-6 text-slate-200" />
                      )}
                    </div>

                    {/* AI FINDINGS CARD */}
                    {session?.analysis[view] && (
                      <div className="mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-2 mb-1">
                          <ShieldAlert className="h-3 w-3 text-indigo-500" />
                          <span className="text-[8px] font-black uppercase text-indigo-500">AI Findings</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-700 leading-tight">
                          {session.analysis[view].head_posture?.status}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {hasAllImages && (
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-white/80 backdrop-blur-md border-t border-slate-100 z-50 animate-in slide-in-from-bottom-4 duration-500">
                <Button 
                  onClick={handleApply}
                  className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs gap-3 shadow-2xl shadow-emerald-500/20"
                >
                  Apply AI Findings
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};
