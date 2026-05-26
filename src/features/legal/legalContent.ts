/**
 * Pilot-stage placeholder copy.
 *
 * Replace before any public launch — these texts are a starting structure, not a legal review.
 * Keep both screens short and human-readable; link to a full ToS/Privacy URL once we have it.
 */

export const PRIVACY_LAST_UPDATED = "May 2026";

export const PRIVACY_SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "What we collect",
    body:
      "Your email and chosen username when you create an account, scan photos you upload, the optional coarse location attached to a spot, and basic device/browser info to keep the app working.",
  },
  {
    heading: "How we use it",
    body:
      "To show you your Dogdex, run the app, and improve reliability. We do not sell your data. Pilot scans live in our Supabase project and may be deleted at any time on request.",
  },
  {
    heading: "Photos",
    body:
      "Scan photos are stored in a private bucket and shown to you and (if you set a spot to public) other users. Deleting a spot in the app removes the row and best-effort removes the photo.",
  },
  {
    heading: "Pilot notice",
    body:
      "Spotter is in a closed pilot. Data, features, and policies can change without notice. Sign-in remains required so you can always delete your account by emailing the team.",
  },
  {
    heading: "Contact",
    body:
      "Questions about your data? Email the Spotter team directly — the address is included in your pilot invite.",
  },
];

export const TERMS_LAST_UPDATED = "May 2026";

export const TERMS_SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "Pilot access",
    body:
      "You're using a private pilot build of Spotter. It is provided as-is with no uptime guarantees, and may break, change, or be wiped without warning.",
  },
  {
    heading: "Your content",
    body:
      "Only upload photos you have the right to share. Don't upload images of people without consent, or anything illegal, hateful, or harmful. Public spots are visible to other pilot users.",
  },
  {
    heading: "Accounts",
    body:
      "Keep your password private. Tell us if you think your account has been accessed. We may suspend accounts that violate these terms.",
  },
  {
    heading: "Limitation of liability",
    body:
      "Spotter is provided without warranty. To the extent permitted by law, the team is not liable for losses arising from use of this pilot.",
  },
  {
    heading: "Contact",
    body:
      "Questions about these terms? Email the Spotter team — the address is in your pilot invite.",
  },
];
