export function friendlyAuthErrorMessage(message: string): string {
  const normalized = message.trim().toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "Wrong email or password. Try again or create an account.";
  }
  if (normalized.includes("user already registered")) {
    return "That email already has an account. Sign in instead.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Confirm your email first, then sign in.";
  }
  if (normalized.includes("signup is disabled")) {
    return "Sign-up is temporarily unavailable. Try again later.";
  }
  return message;
}
