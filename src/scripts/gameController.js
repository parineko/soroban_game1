/**
 * gameController.js
 * 状態管理（現レベル・現在の問題・正答数・画面切替など）
 */
import { LEVELS, RESULT_MESSAGES, FEEDBACK_MESSAGES } from './levelConfig.js';
import { renderAbacus } from './abacusLogic.js';

/**
 * ゲーム状態管理クラス
 */
export class GameController {
  constructor() {
    this.currentLevel = LEVELS.easy;
    this.currentAnswer = 0;
    this.questionIndex = 0;
    this.correctCount = 0;
    this.answerText = "";
    this.showTimeoutId = null;
    this.waitingAnswer = false;
    
    // DOM要素の参照
    this.levelLabel = document.getElementById("level-label");
    this.questionCounter = document.getElementById("question-counter");
    this.answerDisplay = document.getElementById("answer-display");
    this.feedback = document.getElementById("feedback");
    this.resultSummary = document.getElementById("result-summary");
    this.resultDetail = document.getElementById("result-detail");
    this.abacusArea = document.getElementById("abacus-area");
    
    this.init();
  }

  /**
   * 初期化
   */
  init() {
    this.setupEventListeners();
  }

  /**
   * イベントリスナー設定
   */
  setupEventListeners() {
    document.body.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;

      const action = button.getAttribute("data-action");
      if (action) {
        event.preventDefault();
        this.handleAction(action);
        return;
      }

      if (button.classList.contains("key-btn")) {
        const key = button.getAttribute("data-key");
        if (key) {
          event.preventDefault();
          this.handleKeypad(key);
        }
        return;
      }

      if (button.classList.contains("level-btn")) {
        const levelKey = button.getAttribute("data-level");
        if (levelKey) {
          event.preventDefault();
          this.startLevel(levelKey);
        }
        return;
      }
    });
  }

  /**
   * 画面を切り替える
   * @param {string} screenName - 画面名
   */
  showScreen(screenName) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
      screen.style.display = 'none';
    });
    
    const targetScreen = document.querySelector(`[data-screen="${screenName}"]`);
    if (targetScreen) {
      targetScreen.style.display = 'block';
    }
  }

  /**
   * アクション処理
   * @param {string} action - アクション名
   */
  handleAction(action) {
    switch (action) {
      case "go-howto":
        this.showScreen("howto");
        break;
      case "go-level":
        this.showScreen("level");
        break;
      case "back-start":
        this.showScreen("start");
        break;
      case "back-level":
        this.showScreen("level");
        break;
      case "retry":
        this.startLevel(this.currentLevel.key);
        break;
      case "give-up":
        this.showScreen("start");
        break;
      default:
        break;
    }
  }

  /**
   * ゲーム状態をリセット
   */
  reset() {
    this.currentAnswer = 0;
    this.questionIndex = 0;
    this.correctCount = 0;
    this.answerText = "";
    this.waitingAnswer = false;
    if (this.showTimeoutId) {
      clearTimeout(this.showTimeoutId);
      this.showTimeoutId = null;
    }
  }

  /**
   * レベルを開始
   * @param {string} levelKey - レベルキー
   */
  startLevel(levelKey) {
    this.currentLevel = LEVELS[levelKey] || LEVELS.easy;
    this.reset();
    
    if (this.levelLabel) {
      this.levelLabel.textContent = "れべる：" + this.currentLevel.label;
    }
    
    this.showScreen("game");
    this.nextQuestion();
  }

  /**
   * 次の問題へ
   */
  nextQuestion() {
    // 前のタイマーをクリア
    if (this.showTimeoutId) {
      clearTimeout(this.showTimeoutId);
      this.showTimeoutId = null;
    }

    // ゲーム終了チェック
    if (this.questionIndex >= this.currentLevel.questions) {
      this.finishGame();
      return;
    }

    this.questionIndex++;
    
    // 問題を生成
    const digits = this.currentLevel.digits;
    let min, max;
    
    if (digits === 1) {
      min = 0;
      max = 9;
    } else {
      min = Math.pow(10, digits - 1);
      max = Math.pow(10, digits) - 1;
    }
    
    this.currentAnswer = this.getRandomInt(min, max);
    this.answerText = "";
    this.waitingAnswer = false;

    // UI更新
    if (this.questionCounter) {
      this.questionCounter.textContent = 
        `もんすう：${this.questionIndex} / ${this.currentLevel.questions}`;
    }
    
    if (this.answerDisplay) {
      this.answerDisplay.textContent = "";
    }
    
    if (this.feedback) {
      this.feedback.textContent = "";
      this.feedback.className = "feedback";
    }

    // そろばんを描画
    if (this.abacusArea) {
      renderAbacus(this.abacusArea, this.currentAnswer, digits);
      this.abacusArea.classList.remove("hidden");
    }

    // 一定時間後に非表示
    this.showTimeoutId = setTimeout(() => {
      if (this.abacusArea) {
        this.abacusArea.classList.add("hidden");
      }
      this.waitingAnswer = true;
    }, this.currentLevel.displayTime);
  }

  /**
   * ゲーム終了処理
   */
  finishGame() {
    const total = this.currentLevel.questions;
    const correct = this.correctCount;
    const percent = Math.round((correct / total) * 100);
    
    let message;
    if (percent === 100) {
      message = RESULT_MESSAGES.perfect;
    } else if (percent >= 80) {
      message = RESULT_MESSAGES.excellent;
    } else if (percent >= 50) {
      message = RESULT_MESSAGES.good;
    } else {
      message = RESULT_MESSAGES.keepGoing;
    }

    if (this.resultSummary) {
      this.resultSummary.textContent = 
        `せいかい：${correct} / ${total}（${percent}%）`;
    }
    
    if (this.resultDetail) {
      this.resultDetail.textContent = message;
    }

    this.showScreen("result");
  }

  /**
   * キーパッド入力処理
   * @param {string} key - 入力キー
   */
  handleKeypad(key) {
    if (key === "del") {
      if (this.answerText.length > 0) {
        this.answerText = this.answerText.slice(0, -1);
        if (this.answerDisplay) {
          this.answerDisplay.textContent = this.answerText;
        }
      }
      return;
    }

    if (key === "enter") {
      if (!this.waitingAnswer) {
        return;
      }
      if (this.answerText.length === 0) {
        return;
      }
      this.checkAnswer();
      return;
    }

    // 数字入力
    if (!/^[0-9]$/.test(key)) {
      return;
    }

    if (this.answerText.length >= this.currentLevel.digits + 1) {
      return;
    }

    if (this.answerText === "0") {
      this.answerText = key;
    } else {
      this.answerText += key;
    }
    
    if (this.answerDisplay) {
      this.answerDisplay.textContent = this.answerText;
    }
  }

  /**
   * 答えをチェック
   */
  checkAnswer() {
    const userValue = parseInt(this.answerText, 10);
    const correct = userValue === this.currentAnswer;
    
    if (correct) {
      this.correctCount++;
      if (this.feedback) {
        this.feedback.textContent = FEEDBACK_MESSAGES.correct;
        this.feedback.className = "feedback success";
      }
    } else {
      if (this.feedback) {
        this.feedback.textContent = FEEDBACK_MESSAGES.incorrect(this.currentAnswer);
        this.feedback.className = "feedback error";
      }
    }

    this.waitingAnswer = false;
    setTimeout(() => {
      this.nextQuestion();
    }, 1000);
  }

  /**
   * ランダムな整数を生成
   * @param {number} min - 最小値
   * @param {number} max - 最大値
   * @returns {number} ランダムな整数
   */
  getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

// グローバルに公開（Astroで使用するため）
if (typeof window !== 'undefined') {
  window.GameController = GameController;
}

