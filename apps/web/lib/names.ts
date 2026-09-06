/** Names shown for the un-onboarded app preview (e.g. "Good morning, {name}"). Picked randomly per visit so the preview doesn't always show the same person. */
export const PREVIEW_NAMES = [
  'Maya',
  'Jordan',
  'Priya',
  'Ethan',
  'Sofia',
  'Marcus',
  'Aisha',
  'Liam',
  'Noor',
  'Diego',
  'Chloe',
  'Kenji',
] as const;

export function randomPreviewName(): string {
  return PREVIEW_NAMES[Math.floor(Math.random() * PREVIEW_NAMES.length)];
}
