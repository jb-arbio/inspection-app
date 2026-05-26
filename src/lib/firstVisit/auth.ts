export const ALLOWED_DOMAIN = 'arbio.com';

export function isAllowedEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const [, domain] = email.split('@');
  return domain?.toLowerCase() === ALLOWED_DOMAIN;
}
