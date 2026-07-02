export type QuestionType = 'word' | 'sentence' | 'phrase';

export interface WordQuestion {
  id: string;
  word: string;
  options: string[]; // 4 choices
  answerIndex: number; // Index of the correct choice in options
  partOfSpeech: string; // e.g. "adj.", "n."
  phonetic: string; // IPA phonetic symbols, e.g. [/dɪˈlɪʃəs/]
  keyPoint: string; // Key test point for AI explanation reference
}

export type SentenceType = 'order' | 'fill'; // 连词成句 or 翻译填空

export interface SentenceQuestion {
  id: string;
  type: SentenceType;
  chinese: string; // Chinese prompt
  englishTemplate: string; // e.g., "Would you mind _____ the window?" (for fill) or complete sentence for order
  options?: string[]; // Words to scramble for 'order' type
  answer: string | string[]; // Correct filled word (fill) or full exact sentence/ordered words array (order)
  keyPoint: string; // Key test point for AI explanation reference
}

export interface LeaderboardEntry {
  username: string;
  score: number;
  date: string;
  quizType: string;
}

export interface CheckInStatus {
  lastCheckInDate: string | null;
  streak: number;
  totalCheckIns: number;
}
