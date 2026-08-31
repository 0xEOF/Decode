/**
 * Detection of invisible / suspicious Unicode characters.
 *
 * Covers characters commonly abused to hide text or manipulate rendering:
 * zero-width spacing/joining characters, bidirectional control characters,
 * deprecated invisible-math operators, and the Unicode "tag" block that has
 * been used in the wild to smuggle hidden ASCII payloads inside emoji.
 */

export type UnicodeCategory =
  | 'zero-width'
  | 'bidi-control'
  | 'invisible-format'
  | 'tag'
  | 'byte-order-mark';

export interface UnicodeCharInfo {
  name: string;
  category: UnicodeCategory;
  /** Word-separator characters may be replaced with a space instead of deleted when cleaning. */
  actsAsSeparator: boolean;
}

const NAMED_CHARACTERS: Record<number, UnicodeCharInfo> = {
  0x200b: { name: 'ZERO WIDTH SPACE', category: 'zero-width', actsAsSeparator: true },
  0x200c: { name: 'ZERO WIDTH NON-JOINER', category: 'zero-width', actsAsSeparator: false },
  0x200d: { name: 'ZERO WIDTH JOINER', category: 'zero-width', actsAsSeparator: false },
  0x2060: { name: 'WORD JOINER', category: 'zero-width', actsAsSeparator: false },
  0xfeff: { name: 'ZERO WIDTH NO-BREAK SPACE (BOM)', category: 'byte-order-mark', actsAsSeparator: false },
  0x00ad: { name: 'SOFT HYPHEN', category: 'invisible-format', actsAsSeparator: false },
  0x034f: { name: 'COMBINING GRAPHEME JOINER', category: 'invisible-format', actsAsSeparator: false },
  0x115f: { name: 'HANGUL CHOSEONG FILLER', category: 'invisible-format', actsAsSeparator: false },
  0x1160: { name: 'HANGUL JUNGSEONG FILLER', category: 'invisible-format', actsAsSeparator: false },
  0x3164: { name: 'HANGUL FILLER', category: 'invisible-format', actsAsSeparator: false },
  0xffa0: { name: 'HALFWIDTH HANGUL FILLER', category: 'invisible-format', actsAsSeparator: false },
  0x2061: { name: 'FUNCTION APPLICATION', category: 'invisible-format', actsAsSeparator: false },
  0x2062: { name: 'INVISIBLE TIMES', category: 'invisible-format', actsAsSeparator: false },
  0x2063: { name: 'INVISIBLE SEPARATOR', category: 'invisible-format', actsAsSeparator: true },
  0x2064: { name: 'INVISIBLE PLUS', category: 'invisible-format', actsAsSeparator: false },
  0x180e: { name: 'MONGOLIAN VOWEL SEPARATOR', category: 'invisible-format', actsAsSeparator: false },
  // Bidirectional control characters.
  0x200e: { name: 'LEFT-TO-RIGHT MARK', category: 'bidi-control', actsAsSeparator: false },
  0x200f: { name: 'RIGHT-TO-LEFT MARK', category: 'bidi-control', actsAsSeparator: false },
  0x202a: { name: 'LEFT-TO-RIGHT EMBEDDING', category: 'bidi-control', actsAsSeparator: false },
  0x202b: { name: 'RIGHT-TO-LEFT EMBEDDING', category: 'bidi-control', actsAsSeparator: false },
  0x202c: { name: 'POP DIRECTIONAL FORMATTING', category: 'bidi-control', actsAsSeparator: false },
  0x202d: { name: 'LEFT-TO-RIGHT OVERRIDE', category: 'bidi-control', actsAsSeparator: false },
  0x202e: { name: 'RIGHT-TO-LEFT OVERRIDE', category: 'bidi-control', actsAsSeparator: false },
  0x2066: { name: 'LEFT-TO-RIGHT ISOLATE', category: 'bidi-control', actsAsSeparator: false },
  0x2067: { name: 'RIGHT-TO-LEFT ISOLATE', category: 'bidi-control', actsAsSeparator: false },
  0x2068: { name: 'FIRST STRONG ISOLATE', category: 'bidi-control', actsAsSeparator: false },
  0x2069: { name: 'POP DIRECTIONAL ISOLATE', category: 'bidi-control', actsAsSeparator: false },
  0x061c: { name: 'ARABIC LETTER MARK', category: 'bidi-control', actsAsSeparator: false },
};

/** Unicode "Tags" block (U+E0000-U+E007F), used to steganographically hide ASCII payloads. */
function isTagCharacter(codePoint: number): boolean {
  return codePoint === 0xe0001 || (codePoint >= 0xe0020 && codePoint <= 0xe007f);
}

export interface UnicodeMatch {
  index: number;
  length: number;
  codePoint: number;
  char: string;
  info: UnicodeCharInfo;
}

export function classifyCodePoint(codePoint: number): UnicodeCharInfo | undefined {
  if (isTagCharacter(codePoint)) {
    return {
      name: `TAG CHARACTER (U+${codePoint.toString(16).toUpperCase()})`,
      category: 'tag',
      actsAsSeparator: false,
    };
  }
  return NAMED_CHARACTERS[codePoint];
}

/** Scans text for invisible/suspicious Unicode characters and returns each occurrence. */
export function scanUnicode(text: string): UnicodeMatch[] {
  const matches: UnicodeMatch[] = [];
  for (const { segment: char, index } of iterateCodePoints(text)) {
    const codePoint = char.codePointAt(0)!;
    const info = classifyCodePoint(codePoint);
    if (info) {
      matches.push({ index, length: char.length, codePoint, char, info });
    }
  }
  return matches;
}

function* iterateCodePoints(text: string): Generator<{ segment: string; index: number }> {
  let index = 0;
  for (const char of text) {
    yield { segment: char, index };
    index += char.length;
  }
}
