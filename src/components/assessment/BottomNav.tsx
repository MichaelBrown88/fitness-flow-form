import { Home, Activity, BarChart2, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

type Item = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
};

const items: Item[] = [
  { label: 'Home', icon: Home, to: '/' },
  { label: 'Assess', icon: Activity, to: '/' },
  { label: 'Results', icon: BarChart2, to: '/results' },
  { label: 'Profile', icon: User, to: '/profile' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="sticky bottom-0 left-0 right-0 z-40">
      <div className="mx-auto max-w-2xl px-4 pb-4">
        <div className="glass grid grid-cols-4 rounded-2xl">
          {items.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to || (item.to === '/' && location.pathname === '/');
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.to)}
                className={`relative flex flex-col items-center py-3 text-xs transition-colors ${active ? 'text-white' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {active && <span className="absolute inset-x-4 -top-1 h-6 rounded-full bg-primary/25" />}
                <Icon className="h-5 w-5" />
                <span className="mt-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}


