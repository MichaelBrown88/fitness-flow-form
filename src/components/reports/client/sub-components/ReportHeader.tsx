import React from 'react';

interface ReportHeaderProps {
  clientName: string;
  reportDate: string;
  standalone: boolean;
  activeView: 'client' | 'coach';
  setActiveView: (view: 'client' | 'coach') => void;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  clientName,
  reportDate,
  standalone,
  activeView,
  setActiveView,
}) => {
  return (
    <div className="space-y-1 sm:space-y-3 md:space-y-4 lg:space-y-5 xl:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 sm:gap-3 md:gap-4 lg:gap-6">
        <div className="space-y-0.5 sm:space-y-1.5 md:space-y-2">
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <span className="inline-flex items-center rounded-full glass-label px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 text-xs font-semibold text-zinc-700">
              Assessment Report
            </span>
            <span className="text-xs text-zinc-400 font-medium">{reportDate}</span>
          </div>
          <h1 className="text-base sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-black tracking-tight text-zinc-900 leading-tight">
            {clientName || 'Your Assessment Report'}
          </h1>
          <p className="hidden sm:block text-xs md:text-sm lg:text-base text-zinc-500 font-medium leading-snug">
            Your personalized journey to better health and performance.
          </p>
        </div>
        
        {!standalone && (
          <div className="flex glass-button p-1.5 rounded-2xl gap-1">
            <button 
              onClick={() => setActiveView('client')}
              className={`px-6 py-2.5 text-sm font-semibold rounded-xl transition-apple ${
                activeView === 'client' 
                  ? 'glass-button-active' 
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Client Report
            </button>
            <button 
              onClick={() => setActiveView('coach')}
              className={`px-6 py-2.5 text-sm font-semibold rounded-xl transition-apple ${
                activeView === 'coach' 
                  ? 'glass-button-active' 
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Coach Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
