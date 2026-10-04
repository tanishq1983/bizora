/**
 * Ideas used by the "Try an example" control. The first is the canonical demo
 * idea; the others exist so the dashboard can be shown twice in a run without
 * the founder noticing a cached result.
 */
export interface DemoIdea {
  label: string;
  idea: string;
}

export const DEMO_IDEAS: readonly DemoIdea[] = [
  {
    label: 'Student internships',
    idea: 'An AI-powered platform that helps college students find personalized internships and skill-building opportunities based on their skills, interests, and academic background.',
  },
  {
    label: 'Restaurant waste',
    idea: 'A marketplace that connects local restaurants with surplus unsold food to nearby consumers and food banks, using demand forecasting to reduce waste and guarantee same-day pickup.',
  },
  {
    label: 'Freelance contracts',
    idea: 'A contract review tool for freelance designers and developers that flags unfair payment terms, auto-generates scope agreements, and scores client reliability before work begins.',
  },
] as const;

export const DEFAULT_DEMO_IDEA = DEMO_IDEAS[0];