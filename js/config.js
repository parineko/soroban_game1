/**
 * ゲーム設定
 */
(function() {
  'use strict';
  
  window.SorobanGame = window.SorobanGame || {};
  
  window.SorobanGame.LEVELS = {
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

  /**
   * 結果メッセージの設定
   */
  window.SorobanGame.RESULT_MESSAGES = {
    perfect: "すごい…！ ぜんぶ せいかいだよ 🎉",
    excellent: "とっても よく できました 💖",
    good: "いい ちょうせん だったね 🌿",
    keepGoing: "これから すこしずつ なれていこうね 🐾",
  };

  /**
   * フィードバックメッセージ
   */
  window.SorobanGame.FEEDBACK_MESSAGES = {
    correct: "せいかい！ 🎉",
    incorrect: function(correctAnswer) {
      return `ざんねん… 😢 ただしい こたえ：${correctAnswer}`;
    },
  };
})();

