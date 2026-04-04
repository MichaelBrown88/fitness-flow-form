#!/usr/bin/env bash
#
# Create one Stripe Product per capacity tier (Test mode) + monthly + annual GBP prices.
#
# Prerequisites: brew install stripe/stripe-cli/stripe jq && stripe login
#
# Run from repo root:
#   ./scripts/stripe-seed-capacity-catalog-test.sh
#
# If this fails, run (shows the real Stripe error). Use a space after --name, not --name=…
# when the name contains spaces (CLI 1.40+; default output is JSON, no -o json):
#   stripe products create --name "CLI test product"

set -euo pipefail

command -v stripe >/dev/null 2>&1 || {
  echo "Install Stripe CLI: brew install stripe/stripe-cli/stripe" >&2
  exit 1
}
command -v jq >/dev/null 2>&1 || {
  echo "Install jq: brew install jq" >&2
  exit 1
}

# Run Stripe CLI; merge stderr into capture so failures still show Stripe's message.
stripe_json() {
  local tmp ec
  tmp="$(mktemp)"
  set +e
  "$@" >"$tmp" 2>&1
  ec=$?
  set -e
  if [[ "$ec" -ne 0 ]]; then
    echo "--- Stripe CLI failed (exit $ec): $* ---" >&2
    cat "$tmp" >&2
    rm -f "$tmp"
    return "$ec"
  fi
  if ! jq -e .id <"$tmp" >/dev/null 2>&1; then
    echo "--- Stripe returned non-JSON or missing .id: $* ---" >&2
    cat "$tmp" >&2
    rm -f "$tmp"
    return 1
  fi
  cat "$tmp"
  rm -f "$tmp"
}

echo "Stripe CLI: $(stripe --version 2>&1)" >&2
echo "Using Test mode session from: stripe login" >&2
echo "" >&2

# tier_id|label (ASCII)|monthly_gbp|annual_gbp|track
tiers=(
  'S10|Solo - 10 clients|39|374|solo'
  'S20|Solo - 20 clients|69|662|solo'
  'S35|Solo - 35 clients|94|902|solo'
  'S50|Solo - 50 clients|114|1094|solo'
  'S75|Solo - 75 clients|129|1238|solo'
  'S100|Solo - 100 clients|139|1334|solo'
  'G50|Gym - 50 clients|149|1430|gym'
  'G100|Gym - 100 clients|199|1910|gym'
  'G150|Gym - 150 clients|239|2294|gym'
  'G200|Gym - 200 clients|269|2582|gym'
  'G250|Gym - 250 clients|289|2774|gym'
)

echo "Tier rows loaded: ${#tiers[@]}" >&2
echo "" >&2
echo "=== Paste these into env (TEST mode) ===" >&2
echo "" >&2

for row in "${tiers[@]}"; do
  IFS='|' read -r tier label monthly_gbp annual_gbp track <<< "${row}"
  monthly_pence=$((monthly_gbp * 100))
  annual_pence=$((annual_gbp * 100))

  echo "→ ${tier} (${label})..." >&2

  # Must be `--name "${label}"` (space). `--name=Solo - 10` breaks at spaces and breaks the CLI.
  prod_json="$(stripe_json stripe products create --name "${label}")" || exit 1
  prod_id="$(echo "${prod_json}" | jq -r .id)"

  # Stripe CLI 1.40+: default response is JSON; do not use removed `-o json` flag.
  pm_json="$(stripe_json stripe prices create \
    --product="${prod_id}" \
    --currency=gbp \
    --unit-amount="${monthly_pence}" \
    -d 'recurring[interval]=month')" || exit 1
  pm_id="$(echo "${pm_json}" | jq -r .id)"

  pa_json="$(stripe_json stripe prices create \
    --product="${prod_id}" \
    --currency=gbp \
    --unit-amount="${annual_pence}" \
    -d 'recurring[interval]=year')" || exit 1
  pa_id="$(echo "${pa_json}" | jq -r .id)"

  echo "STRIPE_PACKAGE_${tier}_MONTHLY_TEST=${pm_id}"
  echo "STRIPE_PACKAGE_${tier}_ANNUAL_TEST=${pa_id}"
  echo "# ${label} → product ${prod_id}" >&2
done

echo "" >&2
echo "=== Next steps ===" >&2
echo "1. Copy STRIPE_PACKAGE_* lines into Cloud Run + functions/.env" >&2
echo "2. Stripe → Settings → Billing → Customer portal → your bpc_ config → add each new product" >&2
echo "3. Deactivate old prices: stripe prices update price_OLD --active=false" >&2
