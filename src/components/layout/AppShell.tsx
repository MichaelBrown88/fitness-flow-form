import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
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
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const initials =
    user?.displayName?.split(' ').map((n) => n[0]).join('').toUpperCase() ||
    (user?.email ? user.email[0]?.toUpperCase() : 'C');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-6 sm:py-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Brand mark – uses primary One Fitness logo from /public */}
              <div className="flex h-9 items-center">
                <img
                  src="/Brand_Package_Primary_Logo_Black.svg"
                  alt="One Fitness"
                  className="h-7 w-auto"
                />
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500">
                  Assessment Engine
                </p>
                <p className="text-sm font-medium text-slate-900">
                  Client Intake & Reporting
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {actions ? <div className="flex gap-2">{actions}</div> : null}
              {!loading && (
                user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs hover:border-slate-300"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                          {initials}
                        </span>
                        <span className="hidden flex-col text-left leading-tight sm:flex">
                          <span className="text-[11px] font-medium text-slate-800">
                            Coach
                          </span>
                          <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                            {user.email}
                          </span>
                        </span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuLabel>Coach menu</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/">Dashboard</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/assessment">New assessment</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/settings">Settings (coming soon)</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          void signOut();
                        }}
                      >
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/login">Coach login</Link>
                  </Button>
                )
              )}
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-2 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
        </div>
      </header>
      <main className="px-6 py-10">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}


