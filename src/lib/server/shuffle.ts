import type { Challenge, Lesson } from "../lesson";

const random = (): number => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** the options in a new order with the right one at `target`; each option keeps its own explanation of why it is wrong */
export function placeCorrect(c: Extract<Challenge, { kind: "mcq" }>, target: number): Extract<Challenge, { kind: "mcq" }> {
  const right = c.options[c.correct];
  const others = shuffle(c.options.filter((_, i) => i !== c.correct));
  const options = [...others.slice(0, target), right, ...others.slice(target)];
  return { ...c, options, correct: target };
}

/**
 * AI-written questions tend to put the right answer in the same slot. Here the slots are dealt from a shuffled, evenly
 * mixed pile, so across a lesson no slot holds more than its share, and nobody can guess by position.
 */
export function spreadAnswers(lesson: Lesson): Lesson {
  const mcq = lesson.stations.filter((s) => s.challenge.kind === "mcq").length;
  let pile: number[] = [];
  const next = () => {
    if (!pile.length) pile = shuffle([0, 1, 2, 3]);
    return pile.pop()!;
  };
  const stations = lesson.stations.map((s) => (s.challenge.kind === "mcq" && mcq > 0 ? { ...s, challenge: placeCorrect(s.challenge, next()) } : s));
  return { ...lesson, stations };
}
