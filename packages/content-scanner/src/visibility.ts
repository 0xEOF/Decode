/**
 * Splits raw input into an ordered list of text Segments, each tagged with
 * whether it is visible to a human reading the rendered content.
 *
 * Plain text always produces a single visible segment. HTML input is parsed
 * with DOMParser (which never executes scripts or fetches resources for a
 * detached document), sanitized, and walked to find elements hidden via
 * `display:none`, `visibility:hidden`, `opacity:0`/near-0, `font-size:0`,
 * the `hidden` attribute, or `aria-hidden="true"`.
 *
 * `segmentsFromHtml` needs a `DOMParser` global — present in browsers and in
 * jsdom-backed tests, absent in a plain Node.js runtime. Any server-side
 * caller (e.g. a syllabus/document pipeline) that only ever has plain text
 * (PDF/DOCX extraction output) is unaffected — it calls
 * `segmentsFromPlainText` and never touches this path. A future caller that
 * needs HTML parsing server-side would need a DOM polyfill (e.g. jsdom or
 * linkedom) as a runtime dependency, not just a test one.
 */
import type { Segment } from './types';

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function segmentsFromPlainText(text: string): Segment[] {
  return [{ id: nextId('seg'), text, hidden: false, hiddenReasons: [] }];
}

const DANGEROUS_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template'];

const BLOCK_TAGS = new Set([
  'p', 'div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'nav',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'li', 'ul', 'ol',
  'table', 'tr', 'td', 'th', 'thead', 'tbody', 'pre', 'figure', 'figcaption',
  'form', 'fieldset', 'address',
]);

interface StyleHiddenResult {
  hidden: boolean;
  reason?: string;
}

function readInlineStyleHidden(styleAttr: string | null): StyleHiddenResult {
  if (!styleAttr) return { hidden: false };
  const declarations = styleAttr
    .toLowerCase()
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean);

  for (const decl of declarations) {
    const sep = decl.indexOf(':');
    if (sep === -1) continue;
    const prop = decl.slice(0, sep).trim();
    const value = decl.slice(sep + 1).trim();

    if (prop === 'display' && value === 'none') return { hidden: true, reason: 'display:none' };
    if (prop === 'visibility' && (value === 'hidden' || value === 'collapse')) {
      return { hidden: true, reason: `visibility:${value}` };
    }
    if (prop === 'opacity') {
      const n = parseFloat(value);
      if (!Number.isNaN(n) && n <= 0.05) return { hidden: true, reason: `opacity:${value}` };
    }
    if (prop === 'font-size') {
      const n = parseFloat(value);
      if (!Number.isNaN(n) && n <= 0) return { hidden: true, reason: `font-size:${value}` };
    }
  }
  return { hidden: false };
}

function sanitize(doc: Document): void {
  for (const tag of DANGEROUS_TAGS) {
    doc.querySelectorAll(tag).forEach((el) => el.remove());
  }
  doc.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        return;
      }
      if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(attr.value)) {
        el.removeAttribute(attr.name);
      }
    });
  });
}

export function segmentsFromHtml(html: string): Segment[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  sanitize(doc);

  const segments: Segment[] = [];

  function pushText(text: string, hidden: boolean, reasons: string[]): void {
    if (text === '') return;
    segments.push({ id: nextId('seg'), text, hidden, hiddenReasons: reasons });
  }

  function pushBreak(text: string): void {
    if (segments.length === 0) return; // never lead with a break
    const last = segments[segments.length - 1];
    if (last.isStructural) {
      if (text.length > last.text.length) last.text = text;
      return;
    }
    segments.push({ id: nextId('brk'), text, hidden: false, hiddenReasons: [], isStructural: true });
  }

  function walk(node: ChildNode, ancestorHidden: boolean, ancestorReasons: string[]): void {
    if (node.nodeType === Node.TEXT_NODE) {
      pushText(node.textContent ?? '', ancestorHidden, ancestorReasons);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    if (tag === 'br') {
      pushBreak('\n');
      return;
    }

    const styleFlags = readInlineStyleHidden(el.getAttribute('style'));
    const hasHiddenAttr = el.hasAttribute('hidden');
    const ariaHidden = (el.getAttribute('aria-hidden') || '').toLowerCase() === 'true';

    let hidden = ancestorHidden;
    const reasons = [...ancestorReasons];
    if (!hidden && styleFlags.hidden) {
      hidden = true;
      reasons.push(styleFlags.reason!);
    } else if (!hidden && hasHiddenAttr) {
      hidden = true;
      reasons.push('hidden attribute');
    } else if (!hidden && ariaHidden) {
      hidden = true;
      reasons.push('aria-hidden="true"');
    }

    const isBlock = BLOCK_TAGS.has(tag);
    if (isBlock) pushBreak('\n\n');

    Array.from(el.childNodes).forEach((child) => walk(child, hidden, reasons));

    if (isBlock) pushBreak('\n\n');
  }

  Array.from(doc.body.childNodes).forEach((child) => walk(child, false, []));

  return trimStructural(segments);
}

/** Drops leading/trailing structural (spacing-only) segments. */
function trimStructural(segments: Segment[]): Segment[] {
  let start = 0;
  let end = segments.length;
  while (start < end && segments[start].isStructural) start += 1;
  while (end > start && segments[end - 1].isStructural) end -= 1;
  return segments.slice(start, end);
}
