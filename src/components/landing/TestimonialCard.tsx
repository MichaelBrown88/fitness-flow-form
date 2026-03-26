import { Star } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  company: string;
  avatarUrl?: string;
  index?: number;
}

export function TestimonialCard({ quote, author, role, company, avatarUrl, index = 0 }: TestimonialCardProps) {
  const initials = author
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

  return (
    <GlassCard className="p-8">
      <div className="flex items-center gap-4 mb-6">
        {avatarUrl ? (
          <img src={avatarUrl} alt={author} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gradient-from to-gradient-to text-sm font-bold text-primary-foreground">
            {initials}
          </div>
        )}
        <div>
          <h4 className="font-bold text-foreground">{author}</h4>
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
            {role}
          </p>
        </div>
      </div>
      <div className="mb-4 flex gap-1 text-amber-500 dark:text-amber-400">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} size={16} fill="currentColor" />
        ))}
      </div>
      <p className="text-balance text-sm font-medium leading-relaxed text-muted-foreground">
        &ldquo;{quote}&rdquo;
      </p>
    </GlassCard>
  );
}

