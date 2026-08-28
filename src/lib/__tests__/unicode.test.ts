import { describe, expect, it } from 'vitest';
import { scanUnicode } from '../unicode';

describe('scanUnicode', () => {
  it('finds a zero width space', () => {
    const matches = scanUnicode('Hello​world');
    expect(matches).toHaveLength(1);
    expect(matches[0].info.name).toBe('ZERO WIDTH SPACE');
    expect(matches[0].index).toBe(5);
  });

  it('finds bidi control characters', () => {
    const matches = scanUnicode('abc‮def');
    expect(matches).toHaveLength(1);
    expect(matches[0].info.category).toBe('bidi-control');
  });

  it('finds Unicode tag block steganography characters', () => {
    const matches = scanUnicode('😀\u{E0041}\u{E0042}');
    expect(matches).toHaveLength(2);
    expect(matches.every((m) => m.info.category === 'tag')).toBe(true);
  });

  it('returns no matches for plain text', () => {
    expect(scanUnicode('Hello world, this is normal punctuation!.,?')).toHaveLength(0);
  });
});
