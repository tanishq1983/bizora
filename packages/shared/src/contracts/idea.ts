import { z } from 'zod';

export const MIN_IDEA_LENGTH = 25;
export const MAX_IDEA_LENGTH = 1000;

export const ideaInputSchema = z.object({
  idea: z
    .string()
    .trim()
    .min(
      MIN_IDEA_LENGTH,
      `Give us a little more detail — at least ${MIN_IDEA_LENGTH} characters so the Builder Agent has something to work with.`,
    )
    .max(MAX_IDEA_LENGTH, `Keep the idea under ${MAX_IDEA_LENGTH} characters.`),
});
export type IdeaInput = z.infer<typeof ideaInputSchema>;

export function validateIdea(raw: unknown): { ok: true; idea: string } | { ok: false; message: string } {
  const parsed = z.object({ idea: z.string() }).safeParse({ idea: raw });
  if (parsed.success) {
    const checked = ideaInputSchema.safeParse(parsed.data);
    if (checked.success) return { ok: true, idea: checked.data.idea };
    return { ok: false, message: checked.error.issues[0]?.message ?? 'Please enter a startup idea.' };
  }
  return { ok: false, message: 'Please enter a startup idea.' };
}

export function describeIdeaShape(raw: string): string {
  const idea = raw.trim();
  if (idea.length === 0) return 'empty';
  if (idea.length < MIN_IDEA_LENGTH) return 'too-short';
  if (idea.length > MAX_IDEA_LENGTH) return 'too-long';
  return 'ready';
}

export const IDEA_GUIDANCE = 'Describe the problem, who it affects, and what you intend to build — in one or two sentences.';

export const IDEA_PLACEHOLDER =
  'An AI-powered platform that helps college students find personalized internships and skill-building opportunities based on their skills, interests, and academic background.';

/** What the Builder Agent will produce, shown next to the input so the founder knows what they are starting. */
export const IDEA_DELIVERABLES: readonly { title: string; detail: string }[] = [
  { title: 'Business profile', detail: 'Problem, solution, target users, value proposition, business model.' },
  { title: 'Market opportunity', detail: 'Target market, unmet need, and where this can grow.' },
  { title: 'Competitor snapshot', detail: 'Who you are up against, where they win, and your wedge.' },
  { title: 'Six scores out of 100', detail: 'Market potential, fit, innovation, feasibility, revenue, overall.' },
  { title: 'MVP roadmap', detail: 'Three phases from core MVP through growth.' },
  { title: 'Cost & revenue estimates', detail: 'Build cost, running cost, revenue streams, monetisation model.' },
] as const;