/** Lowercase emails allowed to edit global breed profile copy (must match Supabase Auth + RLS policy). */
export const ADMIN_EMAILS = ["doddsy2005@gmail.com"] as const;

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((a) => a === normalized);
}
