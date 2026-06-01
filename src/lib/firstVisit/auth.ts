// Allow-list of staff email domains. Both Arbio domains are valid — the
// company uses @arbio.com and @arbio-group.com interchangeably for employees.
export const ALLOWED_DOMAINS = ['arbio.com', 'arbio-group.com'] as const;

// Back-compat re-export — keeps existing imports working without changes.
export const ALLOWED_DOMAIN = ALLOWED_DOMAINS[0];

export function isAllowedEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const [, domain] = email.split('@');
  if (!domain) return false;
  return (ALLOWED_DOMAINS as readonly string[]).includes(domain.toLowerCase());
}
