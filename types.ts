
export interface Phrase {
  id: string;
  english: string;
  portuguese: string;
  context: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

export enum AppMode {
  SETUP = 'SETUP',
  DASHBOARD = 'DASHBOARD',
  FLASHCARDS = 'FLASHCARDS',
  LISTENING = 'LISTENING',
  SPEAKING = 'SPEAKING',
  PUZZLE = 'PUZZLE',
  CROSSWORD = 'CROSSWORD',
  CLOZE = 'CLOZE',
  PAIRS = 'PAIRS',
  SETTINGS = 'SETTINGS',
}

export interface ActivityStats {
  correct: number;
  total: number;
}

export interface AppSettings {
  voice: string;
  speed: number;
}

// Add global type for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}