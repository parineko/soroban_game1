/**
 * UI管理モジュール
 */
(function() {
  'use strict';
  
  window.SorobanGame = window.SorobanGame || {};
  const RESULT_MESSAGES = window.SorobanGame.RESULT_MESSAGES;

  /**
   * 画面管理クラス
   */
  window.SorobanGame.ScreenManager = function() {
    this.screens = {
      start: document.getElementById("screen-start"),
      howto: document.getElementById("screen-howto"),
      level: document.getElementById("screen-level"),
      game: document.getElementById("screen-game"),
      result: document.getElementById("screen-result"),
    };
  };

  window.SorobanGame.ScreenManager.prototype.show = function(screenName) {
    var screens = this.screens;
    Object.keys(screens).forEach(function(key) {
      if (screens[key]) {
        screens[key].classList.remove("active");
      }
    });
    if (this.screens[screenName]) {
      this.screens[screenName].classList.add("active");
    }
  };

  /**
   * ゲームUI管理クラス
   */
  window.SorobanGame.GameUI = function() {
    this.levelLabel = document.getElementById("level-label");
    this.questionCounter = document.getElementById("question-counter");
    this.answerDisplay = document.getElementById("answer-display");
    this.feedback = document.getElementById("feedback");
    this.resultSummary = document.getElementById("result-summary");
    this.resultDetail = document.getElementById("result-detail");
    this.abacusArea = document.getElementById("abacus-area");
  };

  window.SorobanGame.GameUI.prototype.updateLevelLabel = function(label) {
    this.levelLabel.textContent = "れべる：" + label;
  };

  window.SorobanGame.GameUI.prototype.updateQuestionCounter = function(current, total) {
    this.questionCounter.textContent = "もんすう：" + current + " / " + total;
  };

  window.SorobanGame.GameUI.prototype.updateAnswerDisplay = function(text) {
    this.answerDisplay.textContent = text;
  };

  window.SorobanGame.GameUI.prototype.showFeedback = function(message, type) {
    this.feedback.textContent = message;
    this.feedback.className = "feedback " + type;
  };

  window.SorobanGame.GameUI.prototype.clearFeedback = function() {
    this.feedback.textContent = "";
    this.feedback.className = "feedback";
  };

  window.SorobanGame.GameUI.prototype.setAbacusHidden = function(hidden) {
    if (hidden) {
      this.abacusArea.classList.add("hidden");
    } else {
      this.abacusArea.classList.remove("hidden");
    }
  };

  window.SorobanGame.GameUI.prototype.showResult = function(result) {
    var total = result.total;
    var correct = result.correct;
    var percent = result.percent;
    
    var message;
    if (percent === 100) {
      message = RESULT_MESSAGES.perfect;
    } else if (percent >= 80) {
      message = RESULT_MESSAGES.excellent;
    } else if (percent >= 50) {
      message = RESULT_MESSAGES.good;
    } else {
      message = RESULT_MESSAGES.keepGoing;
    }

    this.resultSummary.textContent = "せいかい：" + correct + " / " + total + "（" + percent + "%）";
    this.resultDetail.textContent = message;
  };
})();

