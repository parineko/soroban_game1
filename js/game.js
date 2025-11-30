/**
 * ゲームロジックモジュール
 */
(function() {
  'use strict';
  
  window.SorobanGame = window.SorobanGame || {};
  const LEVELS = window.SorobanGame.LEVELS;
  const FEEDBACK_MESSAGES = window.SorobanGame.FEEDBACK_MESSAGES;

  /**
   * ランダムな整数を生成
   * @param {number} min - 最小値
   * @param {number} max - 最大値
   * @returns {number} ランダムな整数
   */
  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * ゲーム状態管理クラス
   */
  window.SorobanGame.GameState = function() {
    this.currentLevel = LEVELS.easy;
    this.currentAnswer = 0;
    this.questionIndex = 0;
    this.correctCount = 0;
    this.answerText = "";
    this.showTimeoutId = null;
    this.waitingAnswer = false;
  };

  window.SorobanGame.GameState.prototype.reset = function() {
    this.currentAnswer = 0;
    this.questionIndex = 0;
    this.correctCount = 0;
    this.answerText = "";
    this.waitingAnswer = false;
    if (this.showTimeoutId) {
      clearTimeout(this.showTimeoutId);
      this.showTimeoutId = null;
    }
  };

  window.SorobanGame.GameState.prototype.setLevel = function(levelKey) {
    this.currentLevel = LEVELS[levelKey] || LEVELS.easy;
    this.reset();
  };

  window.SorobanGame.GameState.prototype.generateNextQuestion = function() {
    this.questionIndex++;
    
    const digits = this.currentLevel.digits;
    let min, max;
    
    if (digits === 1) {
      min = 0;
      max = 9;
    } else {
      min = Math.pow(10, digits - 1);
      max = Math.pow(10, digits) - 1;
    }
    
    this.currentAnswer = getRandomInt(min, max);
    this.answerText = "";
    this.waitingAnswer = false;
    
    return this.currentAnswer;
  };

  window.SorobanGame.GameState.prototype.checkAnswer = function() {
    const userValue = parseInt(this.answerText, 10);
    const correct = userValue === this.currentAnswer;
    
    if (correct) {
      this.correctCount++;
      return {
        correct: true,
        message: FEEDBACK_MESSAGES.correct,
      };
    } else {
      return {
        correct: false,
        message: FEEDBACK_MESSAGES.incorrect(this.currentAnswer),
      };
    }
  };

  window.SorobanGame.GameState.prototype.isGameFinished = function() {
    return this.questionIndex > this.currentLevel.questions;
  };

  window.SorobanGame.GameState.prototype.getResult = function() {
    const total = this.currentLevel.questions;
    const correct = this.correctCount;
    const percent = Math.round((correct / total) * 100);
    
    return {
      total: total,
      correct: correct,
      percent: percent,
    };
  };
})();

