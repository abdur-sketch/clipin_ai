export type TranscriptWord = { start: number; end: number; word: string };

export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
  words?: TranscriptWord[];
};

export type KliyuMoment = {
  start: number;
  end: number;
  score: number;
  title: string;
  hook: string;
  reason: string;
  category: string;
};
