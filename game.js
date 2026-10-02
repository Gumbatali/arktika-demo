import { crises } from './data.js';
export const fresh = () => ({ phase: 'start', round: 0, answers: [], purchases: [] });
export function score(answers) {
  return answers.reduce((sum, choice, i) => sum + crises[Math.floor(i / 3)].questions[i % 3].choices[choice][1], 0);
}
export function totals(run) {
  const earned = score(run.answers);
  const levels = [0, 0, 0];
  let spent = 0;
  for (const purchase of run.purchases) spent += ++levels[purchase.item] * 3;
  return { earned, spent, wallet: earned - spent, upgrade: spent / 3 * 2, rating: earned + spent / 3 * 2, levels };
}
export function validRun(run) {
  if (!run || !['start', 'drift', 'problem', 'review', 'shop', 'summary', 'final'].includes(run.phase) ||
      !Number.isInteger(run.round) || run.round < 0 || run.round > 2 ||
      !Array.isArray(run.answers) || run.answers.length > 9 ||
      !run.answers.every(n => Number.isInteger(n) && n >= 0 && n < 4) ||
      !Array.isArray(run.purchases) || run.purchases.length > 9) return false;
  const n = run.answers.length;
  if (run.phase === 'start' && (run.round !== 0 || n !== 0)) return false;
  if (run.phase === 'drift' && n !== run.round * 3) return false;
  if (run.phase === 'problem' && (n < run.round * 3 || n >= (run.round + 1) * 3)) return false;
  if (['review', 'shop', 'summary'].includes(run.phase) && n !== (run.round + 1) * 3) return false;
  if (run.phase === 'final' && (n !== 9 || run.round !== 2 || !Number.isSafeInteger(run.crewId) || run.crewId < 1)) return false;
  const levels = [0, 0, 0];
  let spent = 0, lastRound = 0;
  for (const p of run.purchases) {
    if (!p || !Number.isInteger(p.item) || p.item < 0 || p.item > 2 || !Number.isInteger(p.round) ||
        p.round < lastRound || p.round > 2 || p.round < 0 || p.round > run.round ||
        (p.round + 1) * 3 > n || (p.round === run.round && !['shop', 'summary', 'final'].includes(run.phase))) return false;
    lastRound = p.round;
    if (++levels[p.item] > 3) return false;
    spent += levels[p.item] * 3;
    if (spent > score(run.answers.slice(0, (p.round + 1) * 3))) return false;
  }
  return true;
}

export function investments(run) {
  const levels = [0, 0, 0];
  return run.purchases.map(p => {
    const level = ++levels[p.item];
    return { ...p, level, cost: level * 3, points: level * 2 };
  });
}
export function stepSummary(run, round) {
  const before = totals({ answers: run.answers.slice(0, round * 3), purchases: run.purchases.filter(p => p.round < round) });
  const after = totals({ answers: run.answers.slice(0, (round + 1) * 3), purchases: run.purchases.filter(p => p.round <= round) });
  return { earned: after.earned - before.earned, spent: after.spent - before.spent,
    upgrade: after.upgrade - before.upgrade, change: after.rating - before.rating,
    before: before.rating, after: after.rating, wallet: after.wallet };
}
