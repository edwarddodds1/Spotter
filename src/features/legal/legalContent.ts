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
    heading: "Deleting your account",
    body:
      "You can permanently delete your account and all associated data at any time from Settings → Delete account. Deletion removes your profile, scans, and photos and cannot be undone.",
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
      "Only upload photos you have the right to share. Don't upload images of people without consent, or anything illegal, hateful, or harmful. Public spots are visible to other users.",
  },
  {
    heading: "Objectionable content & conduct",
    body:
      "There is zero tolerance for objectionable content or abusive behaviour. Don't post content that is sexual, hateful, violent, harassing, or otherwise objectionable, and don't harass other users. You can report any post or user from the menu on their content, and block users from their profile. We review reports and may remove content and suspend or terminate accounts, typically within 24 hours of a report.",
  },
  {
    heading: "Accounts",
    body:
      "Keep your password private. Tell us if you think your account has been accessed. We may suspend or remove accounts that violate these terms. You can delete your account at any time from Settings.",
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
