import {
  ArrowRight,
  CreditCard,
  Mail,
  Receipt,
  ChevronRight,
  AlertTriangle,
  Star,
  Clock,
  RefreshCw,
  TrendingUp,
  Lock,
  Check,
  Download,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlanBadge } from '@/components/org/billing/PlanBadge';
import { useInvoices } from '@/hooks/useInvoices';
import { CHECKOUT_FLOW_COPY } from '@/constants/checkoutFlowCopy';
import { formatPrice } from '@/lib/utils/currency';
import type { Region, PackageTrack } from '@/constants/pricing';
import { cn } from '@/lib/utils';

interface OrgBillingData {
  name: string;
  subscription: {
    plan: string;
    status: string;
    clientSeats: number;
    clientCount?: number;
    clientCap?: number;
    monthlyAiCredits?: number;
    capacityTierId?: string;
    region?: Region;
    currency?: string;
    amountCents?: number;
    amountFils?: number;
  };
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  orgType: string;
  packageTrack: PackageTrack;
  coachCount: number;
  statsClientCount: number;
  assessmentCredits?: number;
  customBrandingEnabled?: boolean;
}

export interface BillingOverviewPanelProps {
  orgData: OrgBillingData;
  organizationId: string;
  subscriptionPlanHeadline: string;
  subscriptionStatus: string;
  monthlyAmount: number;
  currency: string;
  locale: string;
  clientCapForDisplay: number;
  hasStripeCustomer: boolean;
  region: Region;
  profile: { displayName?: string } | null;
  userEmail: string | undefined;
  portalLoading: boolean;
  canShowChangePlan: boolean;
  onChangePlan: () => void;
  onManagePayment: () => void;
  onCancelSubscription: () => void;
}

// ── Sub-components ─────────────────────────────────────

function NumberCell({
  label,
  value,
  sub,
  progress,
}: {
  label: string;
  value: string;
  sub: string;
  progress?: number;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-secondary">
        {label}
      </span>
      <p className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground tracking-tight">
        {value}
      </p>
      <p className="text-xs text-foreground-secondary">{sub}</p>
      {progress !== undefined && (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-2">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              progress >= 1 ? 'bg-red-500' : progress >= 0.8 ? 'bg-amber-500' : 'bg-emerald-500',
            )}
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function TimelineRow({
  date,
  label,
  sub,
  icon: Icon,
  isNow,
  isWarn,
}: {
  date: string;
  label: string;
  sub?: string;
  icon: typeof Star;
  isNow?: boolean;
  isWarn?: boolean;
}) {
  return (
    <div className={cn('flex items-start gap-4 py-3', isNow && 'font-medium')}>
      <span className="text-[10px] font-semibold uppercase tracking-wider tabular-nums text-foreground-secondary w-16 shrink-0 pt-0.5">
        {date}
      </span>
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          isNow
            ? 'bg-primary text-primary-foreground'
            : isWarn
              ? 'bg-score-red-light text-score-red-bold dark:bg-score-red-muted/20'
              : 'bg-muted text-foreground-secondary',
        )}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{label}</p>
        {sub && <p className="text-xs text-foreground-secondary mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function AdminRow({
  icon: Icon,
  title,
  sub,
  action,
  destructive,
  onClick,
}: {
  icon: typeof CreditCard;
  title: string;
  sub: string;
  action: string;
  destructive?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-4 px-5 py-4 text-left transition-colors',
        'border-b border-border/40 last:border-b-0',
        'hover:bg-muted/30',
        destructive && 'text-score-red-bold',
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          destructive ? 'bg-score-red-light/50 dark:bg-score-red-muted/10' : 'bg-muted',
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-foreground-secondary mt-0.5">{sub}</p>
      </div>
      <span className="text-xs text-foreground-secondary flex items-center gap-1">
        {action} <ChevronRight className="h-3 w-3" aria-hidden />
      </span>
    </button>
  );
}

function InvoiceRow({
  date,
  amount,
  status,
  description,
  pdfUrl,
}: {
  date: string;
  amount: string;
  status: string;
  description: string | null;
  pdfUrl: string | null;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-3 border-b border-border/40 last:border-b-0">
      <span className="text-xs tabular-nums text-foreground-secondary w-20 shrink-0">{date}</span>
      <span className="text-sm font-medium tabular-nums text-foreground w-20 shrink-0">{amount}</span>
      <span
        className={cn(
          'text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full',
          status === 'paid'
            ? 'bg-score-green-light text-score-green-bold dark:bg-score-green-muted/20'
            : 'bg-muted text-foreground-secondary',
        )}
      >
        {status}
      </span>
      <span className="text-xs text-foreground-secondary flex-1 min-w-0 truncate">
        {description}
      </span>
      {pdfUrl && (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground-secondary hover:text-foreground transition-colors"
          title="Download invoice"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
        </a>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────

export function BillingOverviewPanel({
  orgData,
  organizationId,
  subscriptionPlanHeadline,
  subscriptionStatus,
  monthlyAmount,
  currency,
  locale,
  clientCapForDisplay,
  hasStripeCustomer,
  region,
  profile,
  userEmail,
  portalLoading,
  canShowChangePlan,
  onChangePlan,
  onManagePayment,
  onCancelSubscription,
}: BillingOverviewPanelProps) {
  const priceFormatted =
    monthlyAmount > 0 ? formatPrice(monthlyAmount, currency, locale) : '\u2014';

  const { invoices, loading: invoicesLoading } = useInvoices(
    hasStripeCustomer ? organizationId : null,
    5,
  );

  // Status-specific hero copy
  const heroCopy = {
    trial: {
      eyebrow: `TRIAL \u00b7 ${clientCapForDisplay} CLIENT CAPACITY`,
      headline: 'Your trial is going well.',
      lead: `Pick a plan to keep your ${orgData.statsClientCount} active clients and the reports you\u2019ve built.`,
      cta: CHECKOUT_FLOW_COPY.overviewChoosePlanCta,
    },
    active: {
      eyebrow: `YOU\u2019RE ON THE ${subscriptionPlanHeadline.toUpperCase()} PLAN`,
      headline: 'Billing is taken care of.',
      lead: `Your plan renews automatically. Upgrade, downgrade, or pause any time \u2014 changes pro-rate automatically.`,
      cta: CHECKOUT_FLOW_COPY.overviewChangePlanCta,
    },
    past_due: {
      eyebrow: 'PAYMENT FAILED \u00b7 ACTION NEEDED',
      headline: 'We couldn\u2019t charge your card.',
      lead: 'Your plan is still active. Update your card now to avoid service interruption.',
      cta: CHECKOUT_FLOW_COPY.overviewUpdatePaymentCta,
    },
    cancelled: {
      eyebrow: 'CANCELLED',
      headline: 'You can come back when it\u2019s the right time.',
      lead: 'Everything you\u2019ve built \u2014 plans, artefacts, notes \u2014 is safe. Reactivate to pick up where you left off.',
      cta: CHECKOUT_FLOW_COPY.overviewResubscribeCta,
    },
  }[subscriptionStatus] ?? {
    eyebrow: 'YOUR PLAN',
    headline: subscriptionPlanHeadline,
    lead: '',
    cta: CHECKOUT_FLOW_COPY.overviewChangePlanCta,
  };

  const primaryCtaAction = () => {
    if (subscriptionStatus === 'past_due') {
      onManagePayment();
    } else {
      onChangePlan();
    }
  };

  // Timeline items per status
  const timelineItems = buildTimeline(subscriptionStatus, priceFormatted, clientCapForDisplay, orgData);

  const aiCreditsUsed =
    orgData.subscription.monthlyAiCredits != null && orgData.assessmentCredits != null
      ? orgData.subscription.monthlyAiCredits - orgData.assessmentCredits
      : null;

  return (
    <div className="mx-auto max-w-3xl space-y-10 pb-20 sm:pb-28 px-1 sm:px-0">
      {/* ── Hero ── */}
      <header className="space-y-4 pt-2">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground-secondary">
            {heroCopy.eyebrow}
          </span>
          <PlanBadge status={subscriptionStatus} />
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-[1.1]">
          {heroCopy.headline}
        </h1>

        <p className="text-base sm:text-lg text-foreground-secondary max-w-xl leading-relaxed">
          {heroCopy.lead}
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {canShowChangePlan && (
            <Button
              type="button"
              className="rounded-xl font-semibold h-11 px-6"
              onClick={primaryCtaAction}
            >
              {heroCopy.cta}
              <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden />
            </Button>
          )}
          {subscriptionStatus === 'past_due' && canShowChangePlan && (
            <Button type="button" variant="outline" className="rounded-xl" onClick={onChangePlan}>
              {CHECKOUT_FLOW_COPY.overviewChangePlanCta}
            </Button>
          )}
          {hasStripeCustomer && subscriptionStatus === 'active' && (
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              onClick={onManagePayment}
              disabled={portalLoading}
            >
              <Receipt className="h-4 w-4 mr-1.5" aria-hidden />
              Invoices
            </Button>
          )}
        </div>
      </header>

      {/* ── Numbers row ── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 border-t border-b border-border/60 py-6">
        <NumberCell
          label="Plan"
          value={subscriptionPlanHeadline}
          sub={`${clientCapForDisplay} client capacity`}
        />
        <NumberCell
          label={
            subscriptionStatus === 'trial'
              ? 'Would be charged'
              : subscriptionStatus === 'cancelled'
                ? 'Last paid'
                : 'Monthly price'
          }
          value={priceFormatted}
          sub={subscriptionStatus === 'active' ? 'Renews automatically' : ' '}
        />
        <NumberCell
          label="Clients used"
          value={`${orgData.statsClientCount} / ${clientCapForDisplay}`}
          sub={
            aiCreditsUsed != null
              ? `${orgData.assessmentCredits} AI scans left this month`
              : `${orgData.statsClientCount} active clients`
          }
          progress={orgData.statsClientCount / Math.max(clientCapForDisplay, 1)}
        />
      </section>

      {/* ── Timeline ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">What happens next</h2>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-secondary">
            Your billing calendar
          </span>
        </div>
        <div className="divide-y divide-border/40">
          {timelineItems.map((item, i) => (
            <TimelineRow key={i} {...item} />
          ))}
        </div>
      </section>

      {/* ── Branding upsell ── */}
      {orgData.customBrandingEnabled !== true &&
        subscriptionStatus !== 'cancelled' &&
        region === 'GB' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Add to your plan</h2>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-secondary">
                Optional
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 rounded-xl border border-border/70 bg-background p-6">
              {/* Mini preview */}
              <div className="w-full sm:w-48 shrink-0 rounded-lg bg-muted/40 border border-border/50 p-4 flex flex-col items-center justify-center gap-2">
                <div className="w-full space-y-1.5">
                  <div className="h-1.5 bg-muted rounded w-3/5" />
                  <div className="h-1.5 bg-muted rounded w-4/5" />
                  <div className="h-1.5 bg-muted rounded w-2/5" />
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  <Palette className="h-3 w-3 text-foreground-secondary" />
                  <span className="text-[9px] font-semibold text-foreground-secondary uppercase tracking-wider">
                    Your logo
                  </span>
                </div>
              </div>
              <div className="space-y-3 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-secondary">
                  CUSTOM BRANDING
                </p>
                <h3 className="text-lg font-bold text-foreground">
                  Your logo on every client report.
                </h3>
                <p className="text-sm text-foreground-secondary leading-relaxed max-w-md">
                  Swap &ldquo;Powered by One Assess&rdquo; for your studio identity — once, forever.
                </p>
                <Button
                  type="button"
                  className="rounded-xl font-semibold"
                  onClick={onChangePlan}
                >
                  Add custom branding
                </Button>
              </div>
            </div>
          </section>
        )}

      {/* ── Invoices (in-app) ── */}
      {hasStripeCustomer && invoices.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Recent invoices</h2>
            <button
              type="button"
              onClick={onManagePayment}
              disabled={portalLoading}
              className="text-xs text-foreground-secondary hover:text-foreground underline underline-offset-2 transition-colors"
            >
              View all
            </button>
          </div>
          <div className="rounded-xl border border-border/70 bg-background overflow-hidden">
            {invoices.map((inv) => (
              <InvoiceRow
                key={inv.id}
                date={new Date(inv.date * 1000).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
                amount={formatPrice(inv.amountPaid / 100, inv.currency.toUpperCase(), 'en-GB')}
                status={inv.status ?? 'unknown'}
                description={inv.description}
                pdfUrl={inv.pdfUrl}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Payment & admin ── */}
      {subscriptionStatus !== 'cancelled' && hasStripeCustomer && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Payment & admin</h2>
          <div className="rounded-xl border border-border/70 bg-background overflow-hidden">
            <AdminRow
              icon={CreditCard}
              title="Payment method"
              sub={subscriptionStatus === 'past_due' ? 'Last charge declined' : 'Managed via Stripe'}
              action="Update"
              destructive={subscriptionStatus === 'past_due'}
              onClick={onManagePayment}
            />
            <AdminRow
              icon={Mail}
              title={`Billing emails \u2192 ${userEmail ?? '\u2014'}`}
              sub="Receipts and upcoming charges"
              action="Change"
              onClick={onManagePayment}
            />
          </div>
        </section>
      )}

      {/* ── Cancel / reactivate ── */}
      <section>
        {subscriptionStatus === 'cancelled' ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-border/70 bg-background p-6">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">Miss the clarity already?</h3>
              <p className="text-sm text-foreground-secondary max-w-md">
                Reactivating keeps your current capacity and picks up billing from today. Your data never left.
              </p>
            </div>
            {canShowChangePlan && (
              <Button type="button" className="rounded-xl font-semibold shrink-0" onClick={onChangePlan}>
                Reactivate
                <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden />
              </Button>
            )}
          </div>
        ) : hasStripeCustomer && subscriptionStatus === 'active' ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-dashed border-border/70 bg-muted/10 p-6">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Need to step away?</p>
              <p className="text-xs text-foreground-secondary">
                Cancel or pause your plan. Your client data stays with you.
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" className="rounded-lg" onClick={onCancelSubscription}>
              Cancel plan
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

// ── Timeline builder ───────────────────────────────────

function buildTimeline(
  status: string,
  priceFormatted: string,
  clientCap: number,
  orgData: OrgBillingData,
) {
  if (status === 'trial') {
    return [
      { date: 'TODAY', label: 'You are here', icon: Star, isNow: true, sub: 'Full access during trial' },
      { date: 'SOON', label: 'Trial ends', icon: Clock, sub: 'Pick a plan to keep your data active' },
      { date: 'SOON', label: `First charge \u00b7 ${priceFormatted}`, icon: CreditCard, sub: 'Billed to your chosen plan' },
    ];
  }
  if (status === 'past_due') {
    return [
      { date: 'RECENT', label: 'Charge declined', icon: AlertTriangle, isWarn: true, sub: `${priceFormatted} \u00b7 Your card was declined` },
      { date: 'TODAY', label: 'You are here', icon: Star, isNow: true, sub: 'Plan still active. Clients unaffected.' },
      { date: 'SOON', label: 'Automatic retry', icon: RefreshCw, sub: 'Stripe will retry the charge' },
      { date: 'LATER', label: 'Access paused if not paid', icon: Lock, sub: 'You\u2019ll still have read-only access to your data' },
    ];
  }
  if (status === 'cancelled') {
    return [
      { date: 'RECENT', label: 'Subscription cancelled', icon: Check, sub: 'Keep using everything until period ends' },
      { date: 'TODAY', label: 'You are here', icon: Star, isNow: true, sub: 'Read-only access continues until renewal date' },
      { date: 'SOON', label: 'Studio goes read-only', icon: Lock, sub: 'We\u2019ll email you before anything changes' },
    ];
  }
  // active
  const aiCredits = orgData.subscription.monthlyAiCredits;
  return [
    { date: 'NEXT', label: 'Monthly usage resets', icon: RefreshCw, sub: aiCredits ? `${aiCredits} fresh AI scans available` : 'Credits refresh' },
    { date: 'NEXT', label: `Next charge \u00b7 ${priceFormatted}`, icon: CreditCard, sub: 'Receipt emailed the same day' },
    { date: 'ANYTIME', label: 'Change capacity', icon: TrendingUp, sub: 'Grow your client base and we\u2019ll pro-rate the difference' },
  ];
}
