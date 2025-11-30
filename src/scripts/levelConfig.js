/**
 * levelConfig.js
 * レベル別の設定（桁数・表示秒数・問題数）
 */

export const LEVELS = {
  easy: {
    key: "easy",
    label: "しょきゅう 🌸",
    digits: 1,
    displayTime: 2000,
    questions: 10,
  },
  normal: {
    key: "normal",
    label: "ちゅうきゅう 🌿",
    digits: 2,
    displayTime: 1500,
    questions: 15,
  },
  hard: {
    key: "hard",
    label: "じょうきゅう ✨",
    digits: 3,
    displayTime: 1000,
    questions: 20,
  },
};

export const RESULT_MESSAGES = {
  perfect: "すごい…！ ぜんぶ せいかいだよ 🎉",
  excellent: "とっても よく できました 💖",
  good: "いい ちょうせん だったね 🌿",
  keepGoing: "これから すこしずつ なれていこうね 🐾",
};

export const FEEDBACK_MESSAGES = {
  correct: "せいかい！ 🎉",
  incorrect: (correctAnswer) => `ざんねん… 😢 ただしい こたえ：${correctAnswer}`,
};

