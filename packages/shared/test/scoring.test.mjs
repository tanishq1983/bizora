import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SCORE_WEIGHTS,
  computeAnswerAverage,
  computeOverallScore,
  computeReadiness,
  readinessBand,
  scoreBand,
  toRatio,
  withOverallScore,
} from '../dist/scoring.js';

test('sub-score weights sum to 1', () => {
  const total = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total - 1) < 1e-9, `weights sum to ${total}`);
});

test('overall score is the weighted mean of the sub-scores', () => {
  const overall = computeOverallScore({
    marketPotential: 80,
    problemSolutionFit: 60,
    innovation: 40,
    feasibility: 90,
    revenuePotential: 50,
  });
  // 80*.25 + 60*.2 + 40*.15 + 90*.2 + 50*.2 = 20+12+6+18+10 = 66
  assert.equal(overall, 66);
});

test('overall score is clamped and rounded to a whole number', () => {
  assert.equal(
    computeOverallScore({
      marketPotential: 100,
      problemSolutionFit: 100,
      innovation: 100,
      feasibility: 100,
      revenuePotential: 100,
    }),
    100,
  );
  assert.equal(
    computeOverallScore({
      marketPotential: 0,
      problemSolutionFit: 0,
      innovation: 0,
      feasibility: 0,
      revenuePotential: 0,
    }),
    0,
  );
  assert.equal(Number.isInteger(computeOverallScore({ marketPotential: 73, problemSolutionFit: 61, innovation: 88, feasibility: 55, revenuePotential: 44 })), true);
});

test('withOverallScore preserves the sub-scores it was given', () => {
  const subs = { marketPotential: 70, problemSolutionFit: 70, innovation: 70, feasibility: 70, revenuePotential: 70 };
  const scores = withOverallScore(subs);
  assert.equal(scores.overall, 70);
  assert.equal(scores.marketPotential, 70);
  assert.equal(scores.revenuePotential, 70);
});

test('answer average is the mean of the three dimensions', () => {
  assert.equal(computeAnswerAverage({ clarity: 8, marketUnderstanding: 8, financialReasoning: 8 }), 8);
  assert.equal(computeAnswerAverage({ clarity: 8, marketUnderstanding: 7, financialReasoning: 6 }), 7);
});

test('answer average ignores missing dimensions instead of scoring them zero', () => {
  assert.equal(computeAnswerAverage({ clarity: 9, marketUnderstanding: 9 }), 9);
  assert.equal(computeAnswerAverage({}), 0);
});

test('readiness weights a strong idea explained poorly below a decent idea argued well', () => {
  const metrics = (c, m, f) => ({
    clarity: { score: c, explanation: 'x', improvement: 'y' },
    marketUnderstanding: { score: m, explanation: 'x', improvement: 'y' },
    financialReasoning: { score: f, explanation: 'x', improvement: 'y' },
  });

  const greatIdeaVagueFounder = computeReadiness(92, [metrics(5, 5, 5), metrics(5, 5, 5), metrics(5, 5, 5)]);
  const decentIdeaSharpFounder = computeReadiness(62, [metrics(9, 9, 9), metrics(9, 9, 9), metrics(9, 9, 9)]);

  assert.ok(
    decentIdeaSharpFounder.investorReadinessScore > greatIdeaVagueFounder.investorReadinessScore,
    `${decentIdeaSharpFounder.investorReadinessScore} should exceed ${greatIdeaVagueFounder.investorReadinessScore}`,
  );
});

test('readiness breakdown components sum to the reported score', () => {
  const metrics = {
    clarity: { score: 8, explanation: 'x', improvement: 'y' },
    marketUnderstanding: { score: 7, explanation: 'x', improvement: 'y' },
    financialReasoning: { score: 6, explanation: 'x', improvement: 'y' },
  };
  const result = computeReadiness(74, [metrics]);
  const sum = result.builderContribution + result.answerContribution;
  assert.ok(Math.abs(sum - result.investorReadinessScore) <= 1, `${sum} vs ${result.investorReadinessScore}`);
});

test('readiness stays inside 0–100 even with impossible inputs', () => {
  const flat = (s) => ({
    clarity: { score: s, explanation: 'x', improvement: 'y' },
    marketUnderstanding: { score: s, explanation: 'x', improvement: 'y' },
    financialReasoning: { score: s, explanation: 'x', improvement: 'y' },
  });
  assert.equal(computeReadiness(100, [flat(10), flat(10), flat(10)]).investorReadinessScore, 100);
  assert.equal(computeReadiness(0, [flat(0), flat(0), flat(0)]).investorReadinessScore, 0);
  assert.equal(computeReadiness(500, [flat(50), flat(50), flat(50)]).investorReadinessScore, 100);
});

test('readiness with no answers falls back to the idea score alone', () => {
  const result = computeReadiness(80, []);
  assert.equal(result.investorReadinessScore, 32); // 80 * 0.4
});

test('readiness band thresholds', () => {
  assert.equal(readinessBand(95), 'strong');
  assert.equal(readinessBand(80), 'strong');
  assert.equal(readinessBand(79), 'promising');
  assert.equal(readinessBand(65), 'promising');
  assert.equal(readinessBand(64), 'developing');
  assert.equal(readinessBand(45), 'developing');
  assert.equal(readinessBand(44), 'early');
  assert.equal(readinessBand(0), 'early');
});

test('ratio and band helpers are bounded', () => {
  assert.equal(toRatio(50), 0.5);
  assert.equal(toRatio(500), 1);
  assert.equal(toRatio(-10), 0);
  assert.equal(scoreBand(90), 'strong');
  assert.equal(scoreBand(70), 'solid');
  assert.equal(scoreBand(50), 'mixed');
  assert.equal(scoreBand(10), 'weak');
});