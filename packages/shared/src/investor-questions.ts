/**
 * The investor interview is deliberately fixed. These three questions are the
 * canonical screen every founder passes through — the same order, the same
 * framing, every time. That is what makes the output comparable across founders
 * and different from an open-ended chat.
 */
export type InvestorQuestionKey = 'why_now' | 'competitive_advantage' | 'customer_acquisition';

export interface InvestorQuestionDefinition {
  readonly key: InvestorQuestionKey;
  readonly index: number;
  readonly title: string;
  readonly prompt: string;
  readonly lookingFor: string;
}

export const INVESTOR_QUESTIONS: readonly InvestorQuestionDefinition[] = [
  {
    key: 'why_now',
    index: 1,
    title: 'Why now?',
    prompt:
      'Why is this the right moment to build this? What changed in the market, in technology, or in customer behaviour that makes this possible or necessary right now?',
    lookingFor:
      'A specific, dated trigger — not "the market is growing". Name the shift, and how you know it is real.',
  },
  {
    key: 'competitive_advantage',
    index: 2,
    title: 'What is your competitive advantage?',
    prompt:
      'What stops an incumbent, a well-funded competitor, or a team with more money from building exactly this and doing it better? What do you have that they cannot easily copy?',
    lookingFor:
      'A defensible wedge: proprietary data, a distribution advantage, switching costs, network effects, or execution speed. "Better UX" is not a moat.',
  },
  {
    key: 'customer_acquisition',
    index: 3,
    title: 'How will you acquire your first customers?',
    prompt:
      'Walk me through exactly how you get the first ten paying customers. Which channel, what does it cost, who is the first cohort, and what does the founder do personally to close them?',
    lookingFor:
      'A concrete first motion with numbers attached. CAC, a named channel, a repeatable step — not "we will do marketing".',
  },
] as const;

export const TOTAL_QUESTIONS = INVESTOR_QUESTIONS.length;

export function getQuestion(key: InvestorQuestionKey): InvestorQuestionDefinition {
  const found = INVESTOR_QUESTIONS.find((q) => q.key === key);
  if (!found) throw new Error(`Unknown investor question key: ${key}`);
  return found;
}

export function questionKeyAtIndex(index: number): InvestorQuestionKey | undefined {
  return INVESTOR_QUESTIONS[index]?.key;
}

export const MIN_ANSWER_LENGTH = 40;

export const ANSWER_GUIDANCE = `Aim for at least a couple of sentences with a specific example or number. Vague answers score low — that is the point of the exercise.`;

export const INVESTOR_PERSONA =
  'You are a seasoned early-stage investor conducting a first meeting. You are direct, you have seen hundreds of pitches, and you respect founders who are honest about what they do not know yet. You are supportive but you never give unearned praise, and you always name the weakest part of an answer.';