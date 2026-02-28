import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm mb-4">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
            {isLast || !item.href ? (
              <span className={isLast ? 'font-semibold text-slate-900' : 'text-slate-400'}>
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
