import { Star } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  company: string;
  index?: number;
}

export function TestimonialCard({ quote, author, role, company, index = 0 }: TestimonialCardProps) {
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(author)}&background=6366f1&color=fff&size=128`;
  
  return (
    <GlassCard className="p-8">
      <div className="flex items-center gap-4 mb-6">
        <img src={avatarUrl} alt={author} className="w-12 h-12 rounded-full object-cover" />
        <div>
          <h4 className="font-bold text-slate-900">{author}</h4>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{role}</p>
        </div>
      </div>
      <div className="flex gap-1 text-amber-400 mb-4">
        {[1,2,3,4,5].map(s => <Star key={s} size={16} fill="currentColor" />)}
      </div>
      <p className="text-slate-600 leading-relaxed font-medium text-sm">"{quote}"</p>
    </GlassCard>
  );
}

