#!/usr/bin/env bash
#
# Attach seeded capacity products to Customer Portal via Stripe CLI (Test mode).
# Works in: local terminal (stripe login) OR Stripe Dashboard → Developers → Stripe Shell.
#
# Stripe API limit: at most 10 products per portal configuration for subscription switches.
# We use TWO configs: solo (6 products) + gym (5). Match Cloud Functions:
#   STRIPE_BILLING_PORTAL_CONFIGURATION_ID_SOLO_TEST
#   STRIPE_BILLING_PORTAL_CONFIGURATION_ID_GYM_TEST
#
# If you only have one bpc_ today: Dashboard → Settings → Billing → Customer portal
# → open your config → ⋮ Duplicate → name it "Gym portal" → copy the new bpc_ for GYM below.
#
# Product + price IDs must match scripts/stripe-seed-capacity-catalog-test.sh output.
# Edit the PROD_/PRICE_ constants below if you re-ran the seed script.
#
# Usage:
#   export STRIPE_BILLING_PORTAL_CONFIGURATION_ID_SOLO_TEST=bpc_...
#   export STRIPE_BILLING_PORTAL_CONFIGURATION_ID_GYM_TEST=bpc_...
#   ./scripts/stripe-portal-attach-catalog-test.sh
#
# Or paste the two export lines into Stripe Shell, then paste the body of this script.

set -euo pipefail

command -v stripe >/dev/null 2>&1 || {
  echo "Need Stripe CLI or Stripe Shell." >&2
  exit 1
}

SOLO_BPC="${STRIPE_BILLING_PORTAL_CONFIGURATION_ID_SOLO_TEST:-}"
GYM_BPC="${STRIPE_BILLING_PORTAL_CONFIGURATION_ID_GYM_TEST:-}"

if [[ -z "${SOLO_BPC}" || -z "${GYM_BPC}" ]]; then
  echo "Set both env vars (two different bpc_ IDs):" >&2
  echo "  export STRIPE_BILLING_PORTAL_CONFIGURATION_ID_SOLO_TEST=bpc_..." >&2
  echo "  export STRIPE_BILLING_PORTAL_CONFIGURATION_ID_GYM_TEST=bpc_..." >&2
  echo "" >&2
  echo "Why two? Stripe allows max 10 products per portal config; we have 11 tiers (6 solo + 5 gym)." >&2
  echo "Your app already picks SOLO vs GYM in createCustomerPortalSession when these are set." >&2
  exit 1
fi

# --- Solo tiers (6 products) — update IDs if you re-seeded ---
S10_P=prod_UH86ixqeAii0kQ
S10_M=price_1TIZqVQYPCSsahCUbbHb4BzZ
S10_A=price_1TIZqWQYPCSsahCUcUprB2mh
S20_P=prod_UH86y2GdRSr1z0
S20_M=price_1TIZqYQYPCSsahCUbaD5YCQ7
S20_A=price_1TIZqZQYPCSsahCUAl5yzYcL
S35_P=prod_UH86TeBHL5Opp5
S35_M=price_1TIZqcQYPCSsahCUFsL7oI8X
S35_A=price_1TIZqdQYPCSsahCUupzMAwyP
S50_P=prod_UH86Fx0BkZlStq
S50_M=price_1TIZqgQYPCSsahCU86iHCLTD
S50_A=price_1TIZqhQYPCSsahCUXacabKZe
S75_P=prod_UH86oOTZHFvAuX
S75_M=price_1TIZqjQYPCSsahCU0FPGEYfi
S75_A=price_1TIZqkQYPCSsahCUf8ds7iPp
S100_P=prod_UH86Zm38BdiyTd
S100_M=price_1TIZqmQYPCSsahCUjaknW8dD
S100_A=price_1TIZqnQYPCSsahCUQXddhTbl

# --- Gym tiers (5 products) ---
G50_P=prod_UH875hC6nX6d9e
G50_M=price_1TIZqqQYPCSsahCUiLz6HGqZ
G50_A=price_1TIZqrQYPCSsahCUjFwpjpXf
G100_P=prod_UH87MErgOwZqxE
G100_M=price_1TIZqtQYPCSsahCUxHSTFF25
G100_A=price_1TIZquQYPCSsahCUXo62KCA7
G150_P=prod_UH87dtnutN5pxT
G150_M=price_1TIZqxQYPCSsahCUI21DZxab
G150_A=price_1TIZqyQYPCSsahCUchv3ZV6X
G200_P=prod_UH87eFix5FegqH
G200_M=price_1TIZr0QYPCSsahCUM9Pel7JC
G200_A=price_1TIZr1QYPCSsahCUbc5tGR63
G250_P=prod_UH87TvIhJRglLC
G250_M=price_1TIZr4QYPCSsahCUFnuTcqWq
G250_A=price_1TIZr5QYPCSsahCUOTaSAvuV

portal_update() {
  local bpc=$1
  shift
  echo "Updating ${bpc} ..." >&2
  # -c skips interactive confirm in Stripe CLI
  stripe billing_portal configurations update "${bpc}" "$@" -c
}

echo "Solo portal (${SOLO_BPC})" >&2
portal_update "${SOLO_BPC}" \
  -d "features[subscription_update][enabled]=true" \
  -d "features[subscription_update][default_allowed_updates][0]=price" \
  -d "features[subscription_update][default_allowed_updates][1]=quantity" \
  -d "features[subscription_update][products][0][product]=${S10_P}" \
  -d "features[subscription_update][products][0][prices][0]=${S10_M}" \
  -d "features[subscription_update][products][0][prices][1]=${S10_A}" \
  -d "features[subscription_update][products][1][product]=${S20_P}" \
  -d "features[subscription_update][products][1][prices][0]=${S20_M}" \
  -d "features[subscription_update][products][1][prices][1]=${S20_A}" \
  -d "features[subscription_update][products][2][product]=${S35_P}" \
  -d "features[subscription_update][products][2][prices][0]=${S35_M}" \
  -d "features[subscription_update][products][2][prices][1]=${S35_A}" \
  -d "features[subscription_update][products][3][product]=${S50_P}" \
  -d "features[subscription_update][products][3][prices][0]=${S50_M}" \
  -d "features[subscription_update][products][3][prices][1]=${S50_A}" \
  -d "features[subscription_update][products][4][product]=${S75_P}" \
  -d "features[subscription_update][products][4][prices][0]=${S75_M}" \
  -d "features[subscription_update][products][4][prices][1]=${S75_A}" \
  -d "features[subscription_update][products][5][product]=${S100_P}" \
  -d "features[subscription_update][products][5][prices][0]=${S100_M}" \
  -d "features[subscription_update][products][5][prices][1]=${S100_A}"

echo "Gym portal (${GYM_BPC})" >&2
portal_update "${GYM_BPC}" \
  -d "features[subscription_update][enabled]=true" \
  -d "features[subscription_update][default_allowed_updates][0]=price" \
  -d "features[subscription_update][default_allowed_updates][1]=quantity" \
  -d "features[subscription_update][products][0][product]=${G50_P}" \
  -d "features[subscription_update][products][0][prices][0]=${G50_M}" \
  -d "features[subscription_update][products][0][prices][1]=${G50_A}" \
  -d "features[subscription_update][products][1][product]=${G100_P}" \
  -d "features[subscription_update][products][1][prices][0]=${G100_M}" \
  -d "features[subscription_update][products][1][prices][1]=${G100_A}" \
  -d "features[subscription_update][products][2][product]=${G150_P}" \
  -d "features[subscription_update][products][2][prices][0]=${G150_M}" \
  -d "features[subscription_update][products][2][prices][1]=${G150_A}" \
  -d "features[subscription_update][products][3][product]=${G200_P}" \
  -d "features[subscription_update][products][3][prices][0]=${G200_M}" \
  -d "features[subscription_update][products][3][prices][1]=${G200_A}" \
  -d "features[subscription_update][products][4][product]=${G250_P}" \
  -d "features[subscription_update][products][4][prices][0]=${G250_M}" \
  -d "features[subscription_update][products][4][prices][1]=${G250_A}"

echo "" >&2
echo "Done. Set Cloud Functions env:" >&2
echo "  STRIPE_BILLING_PORTAL_CONFIGURATION_ID_SOLO_TEST=${SOLO_BPC}" >&2
echo "  STRIPE_BILLING_PORTAL_CONFIGURATION_ID_GYM_TEST=${GYM_BPC}" >&2
echo "You can remove STRIPE_BILLING_PORTAL_CONFIGURATION_ID_TEST if both SOLO and GYM are set (see functions/src/stripe.ts)." >&2
