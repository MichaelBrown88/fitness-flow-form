import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sparkles, ChevronDown, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AppShell({
  title,
  subtitle,
  actions,
  children,
  onDemoFill,
  showDemoFill,
  variant = 'default',
  onMenuToggle,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  onDemoFill?: () => void;
  showDemoFill?: boolean;
  variant?: 'default' | 'full-width';
  onMenuToggle?: () => void;
}) {
  const { user, loading, signOut } = useAuth();
  const initials =
    user?.displayName?.split(' ').map((n) => n[0]).join('').toUpperCase() ||
    (user?.email ? user.email[0]?.toUpperCase() : 'C');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 w-full">
        <div className="flex items-center justify-between h-16 px-6 lg:px-10">
          {/* Left side: Logo */}
          <div className="flex items-center gap-4">
            {variant === 'full-width' && onMenuToggle && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onMenuToggle}
                className="lg:hidden h-9 w-9 text-slate-500"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <Link to="/" className="flex items-center gap-3 shrink-0">
              <img
                src="/Brand_Package_Primary_Logo_Black.svg"
                alt="One Fitness"
                className="h-8 w-auto"
              />
              <div className="hidden leading-tight md:block border-l border-slate-200 pl-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Assessment Engine
                </p>
                <p className="text-xs font-semibold text-slate-600">
                  Professional Intake
                </p>
              </div>
            </Link>
          </div>

          {/* Right side: actions/user */}
          <div className="flex items-center gap-3">
            {showDemoFill && onDemoFill && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDemoFill}
                className="h-9 w-9 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                title="Auto-fill demo data"
              >
                <Sparkles className="h-5 w-5" />
              </Button>
            )}
            
            <div className="flex items-center gap-3">
              {actions ? <div className="flex gap-2">{actions}</div> : null}
              {!loading && (
                user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 hover:border-slate-300 transition-colors"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white shadow-sm">
                          {initials}
                        </span>
                        <ChevronDown className="h-4 w-4 text-slate-400 mr-1" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">{user.displayName || 'Coach Account'}</p>
                          <p className="text-xs leading-none text-slate-500">{user.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/">Dashboard</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/settings">Settings</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => {
                          void signOut();
                        }}
                      >
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button asChild size="sm" variant="outline" className="rounded-full">
                    <Link to="/login">Coach login</Link>
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </header>
      
      <main className={`min-h-[calc(100vh-64px)] ${variant === 'default' ? 'mx-auto max-w-7xl px-8 lg:px-10 py-10 lg:py-12' : ''}`}>
        {variant === 'default' && (
          <div className="mb-8 space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
            {subtitle && <p className="text-slate-500 font-medium">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
