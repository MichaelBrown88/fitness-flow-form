import { Check } from 'lucide-react';

export const GlassPanel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/70 backdrop-blur-3xl border border-white/50 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] ${className}`}>
    {children}
  </div>
);

export const OptionCard = ({
  selected,
  onClick,
  icon: Icon,
  title,
  subtitle,
  children
}: {
  selected: boolean;
  onClick: () => void;
  icon?: React.ElementType;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) => (
  <div
    onClick={onClick}
    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative overflow-hidden group ${
      selected
        ? 'bg-white border-indigo-600 shadow-xl shadow-indigo-100 scale-[1.02]'
        : 'bg-white/40 border-transparent hover:bg-white/60 hover:border-indigo-200'
    }`}
  >
    <div className="flex items-start gap-4 relative z-10">
      {Icon && (
        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shrink-0 ${
          selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-500'
        }`}>
          <Icon size={22} />
        </div>
      )}
      <div className="flex-1">
        <h4 className={`font-bold text-lg mb-1 ${selected ? 'text-slate-900' : 'text-slate-700'}`}>{title}</h4>
        {subtitle && <p className="text-sm text-slate-500 leading-snug">{subtitle}</p>}
        {children}
      </div>
      {selected && (
        <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-sm shrink-0">
          <Check size={14} strokeWidth={3} />
        </div>
      )}
    </div>
  </div>
);

export const GlassInput = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={`w-full px-5 py-4 rounded-2xl bg-white/50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium ${className}`}
    {...props}
  />
);
