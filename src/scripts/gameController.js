/**
 * gameController.js
 * 状態管理（現レベル・現在の問題・正答数・画面切替など）
 */
import { LEVELS, RESULT_MESSAGES, FEEDBACK_MESSAGES } from './levelConfig.js';

/**
 * DOM要素を安全に取得する
 * @param {string} id - 要素ID
 * @returns {HTMLElement|null} 要素またはnull
 */
function getElementSafely(id) {
  const el = document.getElementById(id);
  if (!el) {
    console.error(`Element not found: ${id}`);
    return null;
  }
  return el;
}

/**
 * 数字のバリデーション（0-9のみ）
 * @param {number|string} num - 検証する値
 * @returns {number|null} 有効な数字またはnull
 */
function validateDigit(num) {
  const n = Number(num);
  if (isNaN(n) || n < 0 || n > 9) {
    console.warn("不正な入力:", num);
    return null;
  }
  return n;
}

/**
 * 画像読み込みエラー処理を設定
 * @param {HTMLImageElement} img - 画像要素
 */
function setupImageErrorHandler(img) {
  img.onerror = () => {
    console.error("画像読み込みに失敗:", img.src);
    // フォールバック画像があれば差し替え、無ければ無視
  };
}

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
    
    // DOM要素の参照（安全に取得）
    this.levelLabel = getElementSafely("level-label");
    this.questionCounter = getElementSafely("question-counter");
    this.answerDisplay = getElementSafely("answer-display");
    this.feedback = getElementSafely("feedback");
    this.resultSummary = getElementSafely("result-summary");
    this.resultDetail = getElementSafely("result-detail");
    this.abacusArea = getElementSafely("abacus-area");
    this.abacusDisplayContainer = getElementSafely("abacus-display-container");
    this.countdownElement = getElementSafely("countdown");
    
    // そろばんの座標設定（AbacusDisplay.astroと同じ値）
    this.rodX = [62, 184, 306, 428]; // 4本の棒の中心X座標
    this.tamaWidth = 108; // 玉画像の幅
    this.tamaOffsetX = this.tamaWidth / 2; // 玉の中心を棒の中心に合わせるオフセット
    this.upperRestY = 106; // 上玉の休み位置（一番上）
    this.upperActiveY = 141; // 上玉のアクティブ位置（梁に寄る）
    this.lowerRestY = 469; // 下玉の休み位置（一番下）
    this.lowerActiveStartY = 229; // 下玉のアクティブ開始位置（梁のすぐ下）
    this.lowerGap = 65; // 下玉の上下間隔
    
    this.init();
  }

  /**
   * 初期化
   */
  init() {
    this.setupEventListeners();
    this.setupContinuousChangeButtons();
    
    // 長押し用のタイマー
    this.continuousChangeTimer = null;
    this.continuousChangeInterval = null;
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

      // 数字の増減ボタンの処理（クリック時は1回だけ実行）
      if (button.id === "scroll-up" || button.id === "scroll-down") {
        event.preventDefault();
        if (button.id === "scroll-up") {
          this.incrementAnswer();
        } else {
          this.decrementAnswer();
        }
        // 長押し処理を開始
        this.startContinuousChange(button.id);
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
    if (levelKey === "custom") {
      // カスタムレベルの設定を取得
      const digitsInput = document.getElementById("custom-digits");
      const timeInput = document.getElementById("custom-time");
      
      if (!digitsInput || !timeInput) {
        return;
      }
      
      const digits = parseInt(digitsInput.value, 10);
      const displayTime = parseFloat(timeInput.value) * 1000; // 秒をミリ秒に変換
      
      this.currentLevel = {
        key: "custom",
        label: `カスタム 🎨 (${digits}けた・${timeInput.value}びょう)`,
        digits: digits,
        displayTime: displayTime,
        questions: 10,
      };
    } else {
      this.currentLevel = LEVELS[levelKey] || LEVELS.easy;
    }
    
    this.reset();
    
    if (this.levelLabel) {
      this.levelLabel.textContent = "れべる：" + this.currentLevel.label;
    }
    
    this.showScreen("game");
    this.startCountdown();
  }

  /**
   * カウントダウンを開始
   */
  startCountdown() {
    if (!this.countdownElement) return;
    
    let count = 3;
    this.countdownElement.style.display = "flex";
    this.countdownElement.textContent = count;
    
    const countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        this.countdownElement.textContent = count;
      } else {
        this.countdownElement.textContent = "スタート！";
        clearInterval(countdownInterval);
        setTimeout(() => {
          this.countdownElement.style.display = "none";
          this.nextQuestion();
        }, 500);
      }
    }, 1000);
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
    
    // そろばんを描画（AbacusDisplayコンポーネントを使用）
    if (this.abacusDisplayContainer) {
      this.createAbacusDisplay(this.currentAnswer, digits);
      this.abacusDisplayContainer.style.display = "flex";
    }
    
    if (this.abacusArea) {
      this.abacusArea.classList.remove("hidden");
    }

    // 一定時間後に非表示（エリアの高さは維持）
    this.showTimeoutId = setTimeout(() => {
      if (this.abacusDisplayContainer) {
        // そろばんを非表示にするが、エリアの高さは維持
        const abacusBase = this.abacusDisplayContainer.querySelector('.abacus-base');
        if (abacusBase) {
          abacusBase.style.opacity = "0";
        }
      }
      // abacusAreaの高さは維持するため、hiddenクラスは追加しない
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
        
        // 入力時はそろばんを表示しない
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

    // 数字入力（バリデーション）
    const validatedDigit = validateDigit(key);
    if (validatedDigit === null) {
      return;
    }

    if (this.answerText.length >= this.currentLevel.digits + 1) {
      return;
    }

    if (this.answerText === "0") {
      this.answerText = validatedDigit.toString();
    } else {
      this.answerText += validatedDigit.toString();
    }
    
    if (this.answerDisplay) {
      this.answerDisplay.textContent = this.answerText;
    }
    
    // 入力時はそろばんを表示しない
  }

  /**
   * 答えを1増やす
   */
  incrementAnswer() {
    if (!this.waitingAnswer) return;
    
    const currentValue = this.answerText ? parseInt(this.answerText, 10) : 0;
    if (isNaN(currentValue)) {
      this.answerText = "1";
    } else {
      const newValue = Math.min(currentValue + 1, 9999);
      this.answerText = newValue.toString();
    }
    
    if (this.answerDisplay) {
      this.answerDisplay.textContent = this.answerText;
    }
  }

  /**
   * 答えを1減らす
   */
  decrementAnswer() {
    if (!this.waitingAnswer) return;
    
    const currentValue = this.answerText ? parseInt(this.answerText, 10) : 0;
    if (isNaN(currentValue) || currentValue <= 0) {
      this.answerText = "0";
    } else {
      const newValue = Math.max(currentValue - 1, 0);
      this.answerText = newValue.toString();
    }
    
    if (this.answerDisplay) {
      this.answerDisplay.textContent = this.answerText;
    }
  }

  /**
   * 長押し用のボタンイベント設定
   */
  setupContinuousChangeButtons() {
    // DOM要素が存在するまで待機
    setTimeout(() => {
      const scrollUpBtn = document.getElementById("scroll-up");
      const scrollDownBtn = document.getElementById("scroll-down");

      if (scrollUpBtn) {
        scrollUpBtn.addEventListener("mousedown", (e) => {
          e.preventDefault();
          this.incrementAnswer();
          this.startContinuousChange("scroll-up");
        });
        scrollUpBtn.addEventListener("mouseup", () => {
          this.stopContinuousChange();
        });
        scrollUpBtn.addEventListener("mouseleave", () => {
          this.stopContinuousChange();
        });
        // タッチデバイス対応
        scrollUpBtn.addEventListener("touchstart", (e) => {
          e.preventDefault();
          this.incrementAnswer();
          this.startContinuousChange("scroll-up");
        });
        scrollUpBtn.addEventListener("touchend", () => {
          this.stopContinuousChange();
        });
        scrollUpBtn.addEventListener("touchcancel", () => {
          this.stopContinuousChange();
        });
      }

      if (scrollDownBtn) {
        scrollDownBtn.addEventListener("mousedown", (e) => {
          e.preventDefault();
          this.decrementAnswer();
          this.startContinuousChange("scroll-down");
        });
        scrollDownBtn.addEventListener("mouseup", () => {
          this.stopContinuousChange();
        });
        scrollDownBtn.addEventListener("mouseleave", () => {
          this.stopContinuousChange();
        });
        // タッチデバイス対応
        scrollDownBtn.addEventListener("touchstart", (e) => {
          e.preventDefault();
          this.decrementAnswer();
          this.startContinuousChange("scroll-down");
        });
        scrollDownBtn.addEventListener("touchend", () => {
          this.stopContinuousChange();
        });
        scrollDownBtn.addEventListener("touchcancel", () => {
          this.stopContinuousChange();
        });
      }
    }, 100);
  }

  /**
   * 連続増減を開始
   * @param {string} buttonId - ボタンID
   */
  startContinuousChange(buttonId) {
    // 既存のタイマーをクリア
    this.stopContinuousChange();

    // 最初の遅延（500ms後に開始）
    this.continuousChangeTimer = setTimeout(() => {
      // 連続実行（100ms間隔）
      this.continuousChangeInterval = setInterval(() => {
        if (buttonId === "scroll-up") {
          this.incrementAnswer();
        } else {
          this.decrementAnswer();
        }
      }, 100);
    }, 500);
  }

  /**
   * 連続増減を停止
   */
  stopContinuousChange() {
    if (this.continuousChangeTimer) {
      clearTimeout(this.continuousChangeTimer);
      this.continuousChangeTimer = null;
    }
    if (this.continuousChangeInterval) {
      clearInterval(this.continuousChangeInterval);
      this.continuousChangeInterval = null;
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

  /**
   * AbacusDisplayコンポーネントを動的に生成
   * @param {number} value - 表示する値
   * @param {number} digits - 桁数
   */
  createAbacusDisplay(value, digits) {
    if (!this.abacusDisplayContainer) return;
    
    // 既存のAbacusDisplayを削除
    this.abacusDisplayContainer.innerHTML = '';
    
    // AbacusDisplayのHTMLを生成
    const maxDigits = Math.max(digits, 4);
    const abacusBase = document.createElement('div');
    abacusBase.className = 'abacus-base';
    abacusBase.style.cssText = 'position: relative; width: 500px; height: 700px; overflow: hidden; margin-top: -75px; margin-bottom: -75px;';
    
    // 土台画像
    const dodai = document.createElement('img');
    dodai.src = '/images/dodai.png';
    dodai.alt = 'そろばんの土台';
    dodai.className = 'dodai';
    dodai.style.cssText = 'width: 100%; height: 100%; display: block;';
    setupImageErrorHandler(dodai);
    abacusBase.appendChild(dodai);
    
    // 玉を生成
    for (let col = 0; col < 4; col++) {
      // 上玉
      const upperBead = document.createElement('img');
      upperBead.src = '/images/tama.png';
      upperBead.alt = 'そろばんの玉（上）';
      upperBead.setAttribute('class', 'tama upper U' + col);
      upperBead.setAttribute('data-col', col);
      upperBead.setAttribute('data-type', 'upper');
      const upperY = this.getUpperY(value, maxDigits, col);
      const upperLeft = this.rodX[col] - this.tamaOffsetX;
      upperBead.style.cssText = 'position: absolute; left: ' + upperLeft + 'px; top: ' + upperY + 'px; width: 108px; height: 70px; opacity: 1; pointer-events: none; z-index: 10; transition: top 0.3s ease;';
      setupImageErrorHandler(upperBead);
      abacusBase.appendChild(upperBead);
      
      // 下玉
      for (let row = 0; row < 4; row++) {
        const lowerBead = document.createElement('img');
        lowerBead.src = '/images/tama.png';
        lowerBead.alt = 'そろばんの玉（下）';
        lowerBead.setAttribute('class', 'tama lower L' + col + '_' + row);
        lowerBead.setAttribute('data-col', col);
        lowerBead.setAttribute('data-row', row);
        lowerBead.setAttribute('data-type', 'lower');
        const lowerY = this.getLowerY(value, maxDigits, col, row);
        const lowerLeft = this.rodX[col] - this.tamaOffsetX;
        lowerBead.style.cssText = 'position: absolute; left: ' + lowerLeft + 'px; top: ' + lowerY + 'px; width: 108px; height: 70px; opacity: 1; pointer-events: none; z-index: 10; transition: top 0.3s ease;';
        setupImageErrorHandler(lowerBead);
        abacusBase.appendChild(lowerBead);
      }
    }
    
    this.abacusDisplayContainer.appendChild(abacusBase);
  }

  /**
   * そろばん表示を更新（リアルタイム）
   * @param {number} value - 表示する値
   * @param {number} digits - 桁数
   */
  updateAbacusDisplay(value, digits) {
    if (!this.abacusDisplayContainer) return;
    
    const maxDigits = Math.max(digits, 4);
    
    // AbacusDisplayコンポーネントが存在するか確認
    let abacusBase = this.abacusDisplayContainer.querySelector('.abacus-base');
    if (!abacusBase) {
      // まだAbacusDisplayが生成されていない場合は生成
      this.createAbacusDisplay(value, digits);
      abacusBase = this.abacusDisplayContainer.querySelector('.abacus-base');
    }
    
    if (!abacusBase) return;
    
    // 入力中のそろばん表示を表示
    this.abacusDisplayContainer.style.display = "flex";
    
    // そろばんを表示
    abacusBase.style.opacity = "1";
    
    // 玉の位置を更新
    for (let col = 0; col < 4; col++) {
      // 上玉
      const upperBead = abacusBase.querySelector('.tama.upper.U' + col);
      if (upperBead) {
        const y = this.getUpperY(value, maxDigits, col);
        const left = this.rodX[col] - this.tamaOffsetX;
        upperBead.style.left = left + 'px';
        upperBead.style.top = y + 'px';
      }

      // 下玉
      for (let row = 0; row < 4; row++) {
        const lowerBead = abacusBase.querySelector('.tama.lower.L' + col + '_' + row);
        if (lowerBead) {
          const y = this.getLowerY(value, maxDigits, col, row);
          const left = this.rodX[col] - this.tamaOffsetX;
          lowerBead.style.left = left + 'px';
          lowerBead.style.top = y + 'px';
        }
      }
    }
  }

  /**
   * 各桁の数字を取得
   */
  getDigit(value, digits, col) {
    const str = value.toString().padStart(digits, "0");
    const digitArray = Array.from(str).map(char => parseInt(char, 10));
    const rightToLeftIndex = 3 - col;
    const arrayIndex = digits - 1 - rightToLeftIndex;
    return arrayIndex >= 0 && arrayIndex < digitArray.length ? digitArray[arrayIndex] : 0;
  }

  /**
   * 上玉のY座標を取得
   */
  getUpperY(value, digits, col) {
    const digit = this.getDigit(value, digits, col);
    return digit >= 5 ? this.upperActiveY : this.upperRestY;
  }

  /**
   * 下玉のY座標を取得
   */
  getLowerY(value, digits, col, row) {
    const digit = this.getDigit(value, digits, col);
    const ones = digit % 5;
    if (row < ones) {
      return this.lowerActiveStartY + row * this.lowerGap;
    }
    return this.lowerRestY - (3 - row) * this.lowerGap;
  }
}

// グローバルに公開（Astroで使用するため）
if (typeof window !== 'undefined') {
  window.GameController = GameController;
}

