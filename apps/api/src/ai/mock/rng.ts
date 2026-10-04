/** Deterministic pseudo-randomness and text extraction for the fallback provider. */

/** FNV-1a. Stable across runs and platforms, which is what the demo needs. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export interface Rng {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  sample<T>(items: readonly T[], count: number): T[];
  bool(probability?: number): boolean;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0 || 1;

  const next = (): number => {
    // mulberry32
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  function pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('pick() called with an empty list');
    const index = Math.min(items.length - 1, Math.floor(next() * items.length));
    return items[index] as T;
  }

  function sample<T>(items: readonly T[], count: number): T[] {
    const pool = [...items];
    const taken: T[] = [];
    const size = Math.min(count, pool.length);
    for (let i = 0; i < size; i += 1) {
      const index = Math.min(pool.length - 1, Math.floor(next() * pool.length));
      taken.push(pool.splice(index, 1)[0] as T);
    }
    return taken;
  }

  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick,
    sample,
    bool: (probability = 0.5) => next() < probability,
  };
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'that', 'which', 'with', 'and', 'or', 'but', 'for', 'from', 'into', 'their', 'them',
  'they', 'this', 'these', 'those', 'who', 'whom', 'whose', 'will', 'would', 'can', 'could', 'should',
  'have', 'has', 'had', 'been', 'being', 'are', 'was', 'were', 'such', 'than', 'then', 'there', 'here',
  'when', 'where', 'what', 'how', 'why', 'not', 'its', "it's", 'use', 'using', 'used', 'make', 'making',
  'allows', 'allow', 'help', 'helps', 'helping', 'providing', 'provide', 'provides', 'based', 'via',
  'platform', 'solution', 'app', 'application', 'tool', 'website', 'online', 'users', 'user', 'people',
  'enable', 'enables', 'enabling', 'create', 'creates', 'creating', 'you', 'your', 'we', 'our', 'it',
]);

export interface IdeaSignals {
  /** The idea restated as a noun phrase, e.g. "personalised internship matching". */
  subject: string;
  /** Domain keywords present in the idea, lowercase, noise removed. */
  keywords: string[];
  /** Capitalised multi-word tokens, likely a product or market name. */
  properNouns: string[];
  /** True when the idea mentions an AI/ML capability explicitly. */
  mentionsAi: boolean;
  wordCount: number;
}

export function analyseIdea(idea: string): IdeaSignals {
  const words = idea
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  // Hyphenated compounds are split so "AI-powered" contributes "ai" and
  // "powered" rather than one opaque token that no keyword filter can match.
  const tokens = words
    .flatMap((word) => word.split('-'))
    .filter((word) => word.length > 0);

  const keywords = tokens
    .map((word) => word.toLowerCase())
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));

  const properNouns = idea.match(/\b[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,})*/g) ?? [];

  const lower = idea.toLowerCase();
  const subject = keywords.slice(0, 3).join(' ') || 'the proposed product';

  return {
    subject,
    keywords: [...new Set(keywords)].slice(0, 12),
    properNouns: properNouns.slice(0, 4),
    mentionsAi: /\b(ai|a\.i\.|artificial intelligence|machine learning|llm|ml|model)\b/.test(lower),
    wordCount: words.length,
  };
}

export function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Removes a leading article so "An AI-powered platform" becomes "AI-powered platform". */
export function stripLeadingArticle(phrase: string): string {
  return phrase.replace(/^(an?|the)\s+/i, '').trim();
}