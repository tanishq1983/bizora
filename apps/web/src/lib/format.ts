import type { ReadinessBand } from '@bizora/shared';

export type Tone = 'jade' | 'brand' | 'amber' | 'rose' | 'iris' | 'neutral';

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;

  return formatDate(iso);
}

/**
 * Maps a 0–100 score to a tone. The bands are intentionally not evenly spaced:
 * 70+ is genuinely investable, and below 50 needs work rather than polish.
 */
export function toneForScore(score: number | null | undefined): Tone {
  if (score === null || score === undefined || Number.isNaN(score)) return 'neutral';
  if (score >= 80) return 'jade';
  if (score >= 65) return 'brand';
  if (score >= 50) return 'amber';
  return 'rose';
}

export function toneForBand(band: ReadinessBand): Tone {
  switch (band) {
    case 'strong':
      return 'jade';
    case 'promising':
      return 'brand';
    case 'developing':
      return 'amber';
    case 'early':
      return 'rose';
  }
}

/** A 0–100 score rendered as the 0–10 scale founders actually talk in. */
export function outOfTen(score: number): string {
  return (score / 10).toFixed(1);
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}