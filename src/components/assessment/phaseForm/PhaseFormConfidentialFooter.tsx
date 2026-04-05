import { PHASE_FORM_COPY } from '@/constants/phaseFormCopy';

export interface PhaseFormConfidentialFooterProps {
  orgDisplayName: string | undefined;
}

export function PhaseFormConfidentialFooter({ orgDisplayName }: PhaseFormConfidentialFooterProps) {
  const name = orgDisplayName || PHASE_FORM_COPY.FOOTER_DEFAULT_ORG_NAME;
  return (
    <footer className="pb-8 pt-12 text-center text-xs font-semibold uppercase tracking-widest text-foreground-tertiary">
      {name} {PHASE_FORM_COPY.FOOTER_PROFESSIONAL_SUFFIX}
    </footer>
  );
}
