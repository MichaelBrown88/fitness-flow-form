import { useCallback } from 'react';

const TERMS_MESSAGE =
  'Please accept the Terms of Service and Privacy Policy first.';

/**
 * Wraps Google/Apple continue actions with shared terms gating for onboarding account step.
 */
export function useOnboardingAccountSocial(params: {
  acceptedTerms: boolean;
  setLocalError: (message: string | null) => void;
  onCreateWithGoogle: () => void;
  onCreateWithApple: () => void;
}): (provider: 'google' | 'apple') => void {
  const { acceptedTerms, setLocalError, onCreateWithGoogle, onCreateWithApple } = params;

  return useCallback(
    (provider: 'google' | 'apple') => {
      if (!acceptedTerms) {
        setLocalError(TERMS_MESSAGE);
        return;
      }
      setLocalError(null);
      if (provider === 'google') {
        onCreateWithGoogle();
      } else {
        onCreateWithApple();
      }
    },
    [acceptedTerms, setLocalError, onCreateWithGoogle, onCreateWithApple],
  );
}
