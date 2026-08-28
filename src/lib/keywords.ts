/**
 * Detection of predefined suspicious phrases/keywords.
 *
 * These findings flag *visible* content that reads as manipulative or
 * sensitive. They are informational only: matched text is never removed by
 * the cleaner, since a keyword being suspicious does not make it hidden.
 */

export type KeywordCategory =
  | 'prompt-injection'
  | 'credential-phishing'
  | 'social-engineering'
  | 'financial-scam';

interface KeywordRule {
  pattern: RegExp;
  category: KeywordCategory;
  label: string;
}

const RULES: KeywordRule[] = [
  // Prompt / instruction manipulation
  {
    pattern: /\b(ignore|disregard|forget)\s+(all\s+)?(the\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)\b/i,
    category: 'prompt-injection',
    label: 'Instruction manipulation language',
  },
  {
    pattern: /\breveal\s+(the\s+)?(system\s+prompt|your\s+instructions|hidden\s+prompt)\b/i,
    category: 'prompt-injection',
    label: 'Attempt to extract system prompt',
  },
  { pattern: /\bsystem\s+prompt\b/i, category: 'prompt-injection', label: 'Reference to system prompt' },
  { pattern: /\bdeveloper\s+mode\b/i, category: 'prompt-injection', label: 'Developer-mode jailbreak language' },
  { pattern: /\bdo\s+anything\s+now\b/i, category: 'prompt-injection', label: 'Known jailbreak phrase (DAN)' },
  { pattern: /\bjailbreak\b/i, category: 'prompt-injection', label: 'Jailbreak language' },
  { pattern: /\bact\s+as\s+(if\s+)?(a|an|the)\b/i, category: 'prompt-injection', label: 'Role-override instruction' },
  { pattern: /\bpretend\s+(you\s+are|to\s+be)\b/i, category: 'prompt-injection', label: 'Role-override instruction' },
  { pattern: /\byou\s+are\s+now\b/i, category: 'prompt-injection', label: 'Role-override instruction' },
  { pattern: /\bbypass\s+(the\s+)?(filter|restriction|safety|guardrail)/i, category: 'prompt-injection', label: 'Safety-bypass instruction' },
  { pattern: /\bwithout\s+any\s+restrictions?\b/i, category: 'prompt-injection', label: 'Safety-bypass instruction' },

  // Credentials / phishing
  { pattern: /\bpassword(s)?\b/i, category: 'credential-phishing', label: 'Password-related term' },
  { pattern: /\bone[\s-]?time\s+(password|code|pin)\b/i, category: 'credential-phishing', label: 'One-time-code term' },
  { pattern: /\botp\b/i, category: 'credential-phishing', label: 'One-time-password reference' },
  { pattern: /\breset\s+your\s+password\b/i, category: 'credential-phishing', label: 'Password reset request' },
  { pattern: /\bverify\s+your\s+(account|identity)\b/i, category: 'credential-phishing', label: 'Account verification request' },
  { pattern: /\bconfirm\s+your\s+(account|password|details|identity)\b/i, category: 'credential-phishing', label: 'Confirmation request' },
  { pattern: /\blog\s?in\s+(details|credentials)\b/i, category: 'credential-phishing', label: 'Credential request' },
  { pattern: /\bsocial\s+security\s+number\b/i, category: 'credential-phishing', label: 'Sensitive personal identifier' },
  { pattern: /\bcredit\s+card\s+(number|details)\b/i, category: 'credential-phishing', label: 'Sensitive financial identifier' },
  { pattern: /\bclick\s+here\s+to\b/i, category: 'credential-phishing', label: 'Click-bait call to action' },

  // Social engineering / urgency
  { pattern: /\burgent\s+action\s+required\b/i, category: 'social-engineering', label: 'Urgency pressure tactic' },
  { pattern: /\bact\s+now\b/i, category: 'social-engineering', label: 'Urgency pressure tactic' },
  { pattern: /\bdo\s+not\s+tell\s+(anyone|anybody)\b/i, category: 'social-engineering', label: 'Secrecy pressure tactic' },
  { pattern: /\bkeep\s+this\s+(confidential|secret)\b/i, category: 'social-engineering', label: 'Secrecy pressure tactic' },

  // Financial scam
  { pattern: /\bwire\s+transfer\b/i, category: 'financial-scam', label: 'Wire-transfer request' },
  { pattern: /\bgift\s+card(s)?\b/i, category: 'financial-scam', label: 'Gift-card request' },
  { pattern: /\bcryptocurrency\s+(wallet|payment)\b/i, category: 'financial-scam', label: 'Cryptocurrency payment request' },
  { pattern: /\bbank\s+account\s+(number|details)\b/i, category: 'financial-scam', label: 'Bank account request' },
];

export interface KeywordMatch {
  index: number;
  length: number;
  matchedText: string;
  category: KeywordCategory;
  label: string;
}

/** Scans text for suspicious phrases/keywords. Overlapping matches are merged, keeping the longest. */
export function scanKeywords(text: string): KeywordMatch[] {
  const raw: KeywordMatch[] = [];
  for (const rule of RULES) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : `${rule.pattern.flags}g`);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      raw.push({
        index: match.index,
        length: match[0].length,
        matchedText: match[0],
        category: rule.category,
        label: rule.label,
      });
      if (match[0].length === 0) regex.lastIndex++;
    }
  }

  raw.sort((a, b) => a.index - b.index || b.length - a.length);

  const merged: KeywordMatch[] = [];
  for (const m of raw) {
    const last = merged[merged.length - 1];
    if (last && m.index < last.index + last.length) continue;
    merged.push(m);
  }
  return merged;
}
