/**
 * BrandingPreview
 * Live mockup showing how the app header, sidebar nav, and a sample card
 * will look with the coach's brand colour and logo — in both light and dark mode.
 *
 * Fully isolated: all colours are applied as inline styles derived from
 * computePreviewTokens(), so it never affects the rest of the page.
 */

import { useState } from 'react';
import { computePreviewTokens } from '@/lib/design/brandTokens';
import { LayoutDashboard, Users, BarChart2, Settings, ChevronRight } from 'lucide-react';

interface BrandingPreviewProps {
  orgName: string;
  brandHex: string;
  /** Logo for light backgrounds */
  logoUrl: string | null;
  /** Logo for dark backgrounds */
  logoUrlDark: string | null;
}

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: Users, label: 'Clients', active: false },
  { icon: BarChart2, label: 'Reports', active: false },
  { icon: Settings, label: 'Settings', active: false },
];

export function BrandingPreview({ orgName, brandHex, logoUrl, logoUrlDark }: BrandingPreviewProps) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const isDark = mode === 'dark';
  const t = computePreviewTokens(brandHex, isDark);
  const activeLogo = isDark ? (logoUrlDark ?? logoUrl) : logoUrl;
  const displayName = orgName.trim() || 'Your Organisation';
  const initial = displayName[0]?.toUpperCase() ?? 'O';

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
          Live Preview
        </p>
        <div
          className="inline-flex rounded-md border p-0.5 gap-0.5"
          style={{ borderColor: t.border, backgroundColor: t.surface }}
          role="group"
        >
          {(['light', 'dark'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="rounded px-3 py-1 text-xs font-semibold transition-colors capitalize"
              style={
                mode === m
                  ? { backgroundColor: t.primary, color: t.primaryFg }
                  : { color: t.textMuted, backgroundColor: 'transparent' }
              }
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Preview frame */}
      <div
        className="rounded-xl border overflow-hidden shadow-sm select-none"
        style={{ backgroundColor: t.bg, borderColor: t.border }}
        aria-label={`Branding preview in ${mode} mode`}
      >
        {/* Top header bar */}
        <div
          className="flex items-center justify-between px-4 py-2.5 border-b"
          style={{ backgroundColor: t.surface, borderColor: t.border }}
        >
          {/* Logo / org name */}
          <div className="flex items-center gap-2.5">
            {activeLogo ? (
              <img
                src={activeLogo}
                alt={displayName}
                className="h-7 w-auto max-w-[120px] object-contain"
              />
            ) : (
              <>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm"
                  style={{ backgroundColor: t.primary, color: t.primaryFg }}
                >
                  {initial}
                </div>
                <span className="text-sm font-bold" style={{ color: t.text }}>
                  {displayName}
                </span>
              </>
            )}
          </div>

          {/* Fake avatar pill */}
          <div
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: t.primarySubtle, color: t.primaryText }}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ backgroundColor: t.primary, color: t.primaryFg }}
            >
              J
            </div>
            <span>Coach</span>
          </div>
        </div>

        {/* Body — sidebar + main content */}
        <div className="flex" style={{ minHeight: 180 }}>
          {/* Sidebar */}
          <nav
            className="w-36 shrink-0 border-r flex flex-col gap-0.5 p-2"
            style={{ backgroundColor: t.surface, borderColor: t.border }}
          >
            {NAV_ITEMS.map(({ icon: Icon, label, active }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium"
                style={
                  active
                    ? { backgroundColor: t.primarySubtle, color: t.primaryText }
                    : { color: t.textMuted }
                }
              >
                <Icon
                  size={13}
                  style={{ color: active ? t.primary : t.textMuted }}
                />
                {label}
                {active && (
                  <div
                    className="ml-auto w-1 h-4 rounded-full"
                    style={{ backgroundColor: t.primary }}
                  />
                )}
              </div>
            ))}
          </nav>

          {/* Main content */}
          <div className="flex-1 p-4 space-y-3">
            {/* Page heading row */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold" style={{ color: t.text }}>
                  Dashboard
                </div>
                <div className="text-[11px]" style={{ color: t.textMuted }}>
                  Welcome back
                </div>
              </div>
              {/* Primary CTA — vivid brand colour with auto foreground */}
              <button
                type="button"
                className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm"
                style={{ backgroundColor: t.primary, color: t.primaryFg }}
              >
                New assessment
                <ChevronRight size={11} />
              </button>
            </div>

            {/* Sample stat cards */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Clients', value: '24', pct: '60%' },
                { label: 'This month', value: '8', pct: '40%' },
                { label: 'Avg. score', value: '74', pct: '74%' },
              ].map(({ label, value, pct }) => (
                <div
                  key={label}
                  className="rounded-lg p-2.5 border"
                  style={{ backgroundColor: t.surface, borderColor: t.border }}
                >
                  <div className="text-[10px] font-medium" style={{ color: t.textMuted }}>
                    {label}
                  </div>
                  <div className="text-base font-bold mt-0.5" style={{ color: t.text }}>
                    {value}
                  </div>
                  {/* Progress bar — vivid brand colour fill */}
                  <div
                    className="mt-1.5 h-1 rounded-full w-full"
                    style={{ backgroundColor: t.primarySubtle }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ backgroundColor: t.primary, width: pct }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* "Powered by" footer note */}
            <div className="text-[9px] font-medium pt-1" style={{ color: t.textMuted }}>
              Powered by One Assess
            </div>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Buttons and filled elements use your full brand colour with auto-selected text (dark on bright, white on dark).
        Text links and labels use a contrast-adjusted version when on white.
      </p>
    </div>
  );
}
