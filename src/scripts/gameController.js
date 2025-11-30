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
    
    // そろばんの座標設定（TestZero.astroと同じ値に統一、pxベース）
    // 基準サイズ: 500px × 700px
    this.baseWidth = 500;
    this.baseHeight = 700;
    this.rodX = [61, 185, 308, 432]; // 4本の棒の中心X座標（px、TestZero.astroと同じ）
    this.tamaWidth = 108; // 玉画像の幅（px、TestZero.astroと同じ）
    this.tamaHeight = 70; // 玉画像の高さ（px、TestZero.astroと同じ）
    this.tamaOffsetX = this.tamaWidth / 2; // 玉の中心を棒の中心に合わせるオフセット（px）
    this.upperRestY = 80; // 上玉の休み位置（px、TestZero.astroと同じ）
    this.upperActiveY = 117; // 上玉のアクティブ位置（px、TestZero.astroと同じ）
    this.lowerRestY = 448; // 下玉の休み位置（px、TestZero.astroと同じ）
    this.lowerActiveStartY = 205; // 下玉のアクティブ開始位置（px、TestZero.astroと同じ）
    this.lowerGap = 65; // 下玉の上下間隔（px、TestZero.astroと同じ）
    
    this.init();
  }

  /**
   * 初期化
   */
  init() {
    this.setupEventListeners();
    
    // 長押し用のタイマー
    this.continuousChangeTimer = null;
    this.continuousChangeInterval = null;
    this.continuousButtonsSetup = false;
    
    this.setupContinuousChangeButtons();
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

      // 数字の増減ボタンは setupContinuousChangeButtons() で処理するため、ここでは処理しない
      if (button.id === "scroll-up" || button.id === "scroll-down") {
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
      const current = this.questionIndex;
      const total = this.currentLevel.questions;
      const gauge = this.createProgressGauge(current, total);
      this.questionCounter.textContent = 
        `もんすう：${current} / ${total} ${gauge}`;
    }
    
    if (this.answerDisplay) {
      this.answerDisplay.textContent = "";
    }
    
    if (this.feedback) {
      this.feedback.textContent = "";
      this.feedback.className = "feedback";
    }
    
    // 説明文を元に戻す
    const instructionText = getElementSafely("instruction-text");
    if (instructionText) {
      instructionText.innerHTML = "そろばんの かずを おぼえて<br>みぎの でんたくで こたえを いれてね 💡";
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
      // 答え合わせ後は次の問題へ進む
      if (!this.waitingAnswer && this.questionIndex > 0) {
        this.nextQuestion();
        return;
      }
      
      // 答えをチェック
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
    // 既に設定済みの場合はスキップ（重複防止）
    if (this.continuousButtonsSetup) {
      return;
    }
    this.continuousButtonsSetup = true;

    // DOM要素が存在するまで待機
    setTimeout(() => {
      const scrollUpBtn = getElementSafely("scroll-up");
      const scrollDownBtn = getElementSafely("scroll-down");

      if (scrollUpBtn) {
        // 長押し用のmousedownイベント（クリック時も1回実行される）
        scrollUpBtn.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.incrementAnswer();
          this.startContinuousChange("scroll-up");
        });
        scrollUpBtn.addEventListener("mouseup", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.stopContinuousChange();
        });
        scrollUpBtn.addEventListener("mouseleave", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.stopContinuousChange();
        });
        // タッチデバイス対応
        scrollUpBtn.addEventListener("touchstart", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.incrementAnswer();
          this.startContinuousChange("scroll-up");
        });
        scrollUpBtn.addEventListener("touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.stopContinuousChange();
        });
        scrollUpBtn.addEventListener("touchcancel", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.stopContinuousChange();
        });
      }

      if (scrollDownBtn) {
        // 長押し用のmousedownイベント（クリック時も1回実行される）
        scrollDownBtn.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.decrementAnswer();
          this.startContinuousChange("scroll-down");
        });
        scrollDownBtn.addEventListener("mouseup", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.stopContinuousChange();
        });
        scrollDownBtn.addEventListener("mouseleave", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.stopContinuousChange();
        });
        // タッチデバイス対応
        scrollDownBtn.addEventListener("touchstart", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.decrementAnswer();
          this.startContinuousChange("scroll-down");
        });
        scrollDownBtn.addEventListener("touchend", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.stopContinuousChange();
        });
        scrollDownBtn.addEventListener("touchcancel", (e) => {
          e.preventDefault();
          e.stopPropagation();
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
   * 進捗ゲージを生成
   * @param {number} current - 現在の問題番号
   * @param {number} total - 総問題数
   * @returns {string} ゲージ文字列
   */
  createProgressGauge(current, total) {
    const completed = Math.max(0, current - 1); // 完了した問題数（現在の問題は含まない）
    const remaining = total - completed;
    const completedEmojis = "🧮".repeat(completed);
    const remainingUnderscores = "＿".repeat(remaining);
    return completedEmojis + remainingUnderscores;
  }

  /**
   * 答えをチェック
   */
  checkAnswer() {
    // 空の答えの場合は不正解として処理
    const trimmedAnswer = this.answerText.trim();
    let userValue;
    let correct;
    
    if (trimmedAnswer === "") {
      // 答えが空の場合は常に不正解
      userValue = NaN;
      correct = false;
    } else {
      // 数値に変換してチェック
      userValue = parseInt(trimmedAnswer, 10);
      // NaNの場合は不正解
      if (isNaN(userValue)) {
        correct = false;
      } else {
        correct = userValue === this.currentAnswer;
      }
    }
    
    // 答え合わせ時にそろばんを表示
    if (this.abacusDisplayContainer) {
      const digits = this.currentLevel.digits;
      this.createAbacusDisplay(this.currentAnswer, digits);
      const abacusBase = this.abacusDisplayContainer.querySelector('.abacus-base');
      if (abacusBase) {
        abacusBase.style.opacity = "1";
      }
      this.abacusDisplayContainer.style.display = "flex";
    }
    
    // 説明文を更新
    const instructionText = getElementSafely("instruction-text");
    if (instructionText) {
      instructionText.innerHTML = "けってい ボタンで つぎに すすめます ⏭️";
    }
    
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
    // 次の問題への自動遷移を削除（決定ボタンで手動で進む）
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
    abacusBase.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden; margin: 0; display: flex; align-items: center; justify-content: center;';
    
    // 土台画像
    const dodai = document.createElement('img');
    dodai.src = '/images/dodai.png';
    dodai.alt = 'そろばんの土台';
    dodai.className = 'dodai';
    dodai.loading = 'eager'; // 重要な画像なので即座に読み込む
    dodai.style.cssText = 'display: block; width: 100%; height: 100%; object-fit: contain; object-position: center; margin: 0;';
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
      upperBead.style.cssText = 'position: absolute; left: ' + upperLeft + 'px; top: ' + upperY + 'px; width: ' + this.tamaWidth + 'px; height: ' + this.tamaHeight + 'px; opacity: 1; pointer-events: none; z-index: 10; transition: top 0.3s ease;';
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
        lowerBead.style.cssText = 'position: absolute; left: ' + lowerLeft + 'px; top: ' + lowerY + 'px; width: ' + this.tamaWidth + 'px; height: ' + this.tamaHeight + 'px; opacity: 1; pointer-events: none; z-index: 10; transition: top 0.3s ease;';
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

