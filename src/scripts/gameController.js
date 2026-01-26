/**
 * gameController.js
 * そろばん枠常時表示＆TestZero座標系準拠版
 */
import { LEVELS, RESULT_MESSAGES } from './levelConfig.js';

// 画像の縦横比（dodai.pngの形状に合わせる）
const ABACUS_ASPECT_RATIO = 0.85;

// TestZero（シミュレーター）の座標・サイズ設定
const TEST_ZERO_CONFIG = {
  ROD_X: [11.6, 36.2, 61.2, 85.8],
  TAMA_WIDTH: 20.0,
  TAMA_OFFSET: 9.0,
  Y: {
    upperRest: 4.0,
    upperActive: 13.0,
    lowerRest: 83.0,
    lowerActiveStart: 30.5,
    lowerGap: 13
  }
};

function getElementSafely(id) {
  return document.getElementById(id);
}

function validateDigit(num) {
  const n = Number(num);
  if (isNaN(n) || n < 0 || n > 9) return null;
  return n;
}

export class GameController {
  constructor() {
    this.currentLevel = LEVELS.easy;
    this.currentAnswer = 0;
    this.questionIndex = 0;
    this.correctCount = 0;
    this.answerText = "";
    this.showTimeoutId = null;
    this.waitingAnswer = false;
    this.isNextState = false; 
    
    // DOM要素
    this.levelLabel = getElementSafely("level-label");
    this.questionCounter = getElementSafely("question-counter");
    this.answerDisplay = getElementSafely("answer-display");
    this.resultSummary = getElementSafely("result-summary");
    this.resultDetail = getElementSafely("result-detail");
    this.abacusArea = getElementSafely("abacus-area");
    this.abacusDisplayContainer = getElementSafely("abacus-display-container");
    this.enterButton = getElementSafely("enter-btn");
    this.instructionText = getElementSafely("instruction-text");
    
    // SVG設定
    this.SVG_WIDTH = 100; 
    this.SVG_HEIGHT = 100 * ABACUS_ASPECT_RATIO;

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupContinuousChangeButtons();
  }

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

  showScreen(screenName) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
      screen.style.display = 'none';
    });
    
    const targetScreen = document.querySelector(`[data-screen="${screenName}"]`);
    if (targetScreen) {
      targetScreen.style.display = 'block';
      if (screenName === 'game') {
        document.body.classList.add('game-screen-active');
      } else {
        document.body.classList.remove('game-screen-active');
      }
    }
  }

  handleAction(action) {
    switch (action) {
      case "go-level": this.showScreen("level"); break;
      case "back-start": this.showScreen("start"); break;
      case "back-level": this.showScreen("level"); break;
      case "retry": this.startLevel(this.currentLevel.key); break;
      case "give-up": this.showScreen("start"); break;
      default: break;
    }
  }

  reset() {
    this.currentAnswer = 0;
    this.questionIndex = 0;
    this.correctCount = 0;
    this.answerText = "";
    this.waitingAnswer = false;
    this.isNextState = false;
    this.resetEnterButton();
    this.resetDisplayState();

    if (this.showTimeoutId) {
      clearTimeout(this.showTimeoutId);
      this.showTimeoutId = null;
    }
  }

  resetEnterButton() {
    if (this.enterButton) {
      this.enterButton.textContent = "けってい";
      this.enterButton.classList.remove("next-mode");
    }
  }

  setNextButton() {
    if (this.enterButton) {
      this.enterButton.textContent = "つぎへ ➡";
      this.enterButton.classList.add("next-mode");
    }
    this.isNextState = true;
  }

  showCountdownText(text) {
    if (!this.answerDisplay) return;
    this.answerDisplay.textContent = text;
    this.answerDisplay.classList.add('center-mode');
  }

  resetDisplayState() {
    if (!this.answerDisplay) return;
    this.answerDisplay.textContent = this.answerText;
    this.answerDisplay.className = 'answer-display';
    if (this.instructionText) {
      this.instructionText.className = '';
      this.instructionText.style.display = 'none';
    }
  }

  setResultState(isCorrect) {
    if (!this.answerDisplay) return;
    this.answerDisplay.className = 'answer-display';
    if (isCorrect) {
      this.answerDisplay.classList.add('success');
    } else {
      this.answerDisplay.classList.add('error');
    }
  }

  startLevel(levelKey) {
    if (levelKey === "custom") {
      const digitsInput = document.getElementById("custom-digits");
      const timeInput = document.getElementById("custom-time");
      if (!digitsInput || !timeInput) return;
      const digits = parseInt(digitsInput.value, 10);
      const displayTime = parseFloat(timeInput.value) * 1000;
      this.currentLevel = {
        key: "custom",
        label: `カスタム (${digits}けた・${timeInput.value}びょう)`,
        digits: digits,
        displayTime: displayTime,
        questions: 10,
      };
    } else {
      this.currentLevel = LEVELS[levelKey] || LEVELS.easy;
    }
    
    this.reset();
    if (this.levelLabel) this.levelLabel.textContent = "れべる：" + this.currentLevel.label;
    this.showScreen("game");
    this.startCountdown();
  }

  startCountdown() {
    if(this.abacusDisplayContainer) {
       this.abacusDisplayContainer.innerHTML = '';
       this.abacusDisplayContainer.style.display = "flex";
       this.abacusDisplayContainer.style.height = "100%";
       
       // ★修正：カウントダウン中も「枠（土台）」だけ表示してレイアウト崩れを防ぐ
       this.drawEmptyAbacus();
    }
    if(this.abacusArea) {
      this.abacusArea.style.display = "flex";
    }

    let count = 3;
    this.showCountdownText(count);
    
    const countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        this.showCountdownText(count);
      } else {
        this.showCountdownText("スタート！");
        clearInterval(countdownInterval);
        setTimeout(() => {
          this.resetDisplayState();
          this.nextQuestion();
        }, 800);
      }
    }, 1000);
  }

  nextQuestion() {
    this.isNextState = false;
    this.resetEnterButton();
    this.resetDisplayState();

    if (this.showTimeoutId) {
      clearTimeout(this.showTimeoutId);
      this.showTimeoutId = null;
    }

    if (this.questionIndex >= this.currentLevel.questions) {
      this.finishGame();
      return;
    }

    this.questionIndex++;
    
    const digits = this.currentLevel.digits;
    let min, max;
    if (digits === 1) { min = 0; max = 9; }
    else { min = Math.pow(10, digits - 1); max = Math.pow(10, digits) - 1; }
    
    this.currentAnswer = this.getRandomInt(min, max);
    this.answerText = "";
    this.waitingAnswer = false;

    if (this.questionCounter) {
      const current = this.questionIndex;
      const total = this.currentLevel.questions;
      this.questionCounter.textContent = `もんすう：${current} / ${total}`;
    }
    
    if (this.answerDisplay) this.answerDisplay.textContent = "";
    
    if (this.instructionText) {
      this.instructionText.style.display = "block";
      this.instructionText.textContent = "かずを おぼえて こたえを いれてね 💡";
    }
    
    if (this.abacusDisplayContainer) {
      this.createAbacusDisplay(this.currentAnswer, digits);
      this.abacusDisplayContainer.style.display = "flex";
      const svg = this.abacusDisplayContainer.querySelector('svg');
      if (svg) {
        svg.style.transition = "opacity 0.2s ease";
        svg.style.opacity = "1";
      }
    }

    this.showTimeoutId = setTimeout(() => {
      if (this.abacusDisplayContainer) {
        // 時間切れになったら玉を隠すが、枠は残したい場合等はここで調整可能
        // 現状は透明度0にする仕様
        const svg = this.abacusDisplayContainer.querySelector('svg');
        if (svg) svg.style.opacity = "0";
      }
      this.waitingAnswer = true;
    }, this.currentLevel.displayTime);
  }

  finishGame() {
    const total = this.currentLevel.questions;
    const correct = this.correctCount;
    const percent = Math.round((correct / total) * 100);
    
    let message;
    if (percent === 100) message = RESULT_MESSAGES.perfect;
    else if (percent >= 80) message = RESULT_MESSAGES.excellent;
    else if (percent >= 50) message = RESULT_MESSAGES.good;
    else message = RESULT_MESSAGES.keepGoing;

    if (this.resultSummary) {
      this.resultSummary.textContent = `せいかい：${correct}もん`;
    }
    if (this.resultDetail) {
      this.resultDetail.textContent = message;
    }
    this.showScreen("result");
  }

  handleKeypad(key) {
    if (key === "del") {
      if (this.isNextState) return;
      if (this.answerText.length > 0) {
        this.answerText = this.answerText.slice(0, -1);
        if (this.answerDisplay) this.answerDisplay.textContent = this.answerText;
      }
      return;
    }

    if (key === "enter") {
      if (this.isNextState) {
        this.nextQuestion();
        return;
      }
      if (!this.waitingAnswer && this.questionIndex > 0) return;
      if (!this.waitingAnswer || this.answerText.length === 0) return;
      
      this.checkAnswer();
      return;
    }

    if (this.isNextState) return;
    
    const validatedDigit = validateDigit(key);
    if (validatedDigit === null) return;
    if (this.answerText.length >= this.currentLevel.digits + 1) return;

    if (this.answerText === "0") this.answerText = validatedDigit.toString();
    else this.answerText += validatedDigit.toString();
    
    if (this.answerDisplay) this.answerDisplay.textContent = this.answerText;
  }

  incrementAnswer() {
    if (!this.waitingAnswer || this.isNextState) return;
    const currentValue = this.answerText ? parseInt(this.answerText, 10) : 0;
    if (isNaN(currentValue)) this.answerText = "1";
    else {
      const newValue = Math.min(currentValue + 1, 9999);
      this.answerText = newValue.toString();
    }
    if (this.answerDisplay) this.answerDisplay.textContent = this.answerText;
  }

  decrementAnswer() {
    if (!this.waitingAnswer || this.isNextState) return;
    const currentValue = this.answerText ? parseInt(this.answerText, 10) : 0;
    if (isNaN(currentValue) || currentValue <= 0) this.answerText = "0";
    else {
      const newValue = Math.max(currentValue - 1, 0);
      this.answerText = newValue.toString();
    }
    if (this.answerDisplay) this.answerDisplay.textContent = this.answerText;
  }

  setupContinuousChangeButtons() {
    if (this.continuousButtonsSetup) return;
    this.continuousButtonsSetup = true;

    setTimeout(() => {
      const scrollUpBtn = getElementSafely("scroll-up");
      const scrollDownBtn = getElementSafely("scroll-down");

      const attach = (btn, action) => {
        if (!btn) return;
        const start = (e) => {
          e.preventDefault(); e.stopPropagation();
          action();
          this.startContinuousChange(btn.id);
        };
        const stop = (e) => {
          e.preventDefault(); e.stopPropagation();
          this.stopContinuousChange();
        };
        btn.addEventListener("mousedown", start); btn.addEventListener("mouseup", stop);
        btn.addEventListener("mouseleave", stop); btn.addEventListener("touchstart", start);
        btn.addEventListener("touchend", stop); btn.addEventListener("touchcancel", stop);
      };
      attach(scrollUpBtn, () => this.incrementAnswer());
      attach(scrollDownBtn, () => this.decrementAnswer());
    }, 100);
  }

  startContinuousChange(buttonId) {
    this.stopContinuousChange();
    this.continuousChangeTimer = setTimeout(() => {
      this.continuousChangeInterval = setInterval(() => {
        if (buttonId === "scroll-up") this.incrementAnswer();
        else this.decrementAnswer();
      }, 100);
    }, 500);
  }

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

  checkAnswer() {
    const trimmedAnswer = this.answerText.trim();
    let userValue, correct;
    
    if (trimmedAnswer === "") { userValue = NaN; correct = false; }
    else {
      userValue = parseInt(trimmedAnswer, 10);
      correct = !isNaN(userValue) && userValue === this.currentAnswer;
    }
    
    if (this.abacusDisplayContainer) {
      const digits = this.currentLevel.digits;
      this.createAbacusDisplay(this.currentAnswer, digits);
      const svg = this.abacusDisplayContainer.querySelector('svg');
      if (svg) svg.style.opacity = "1";
    }
    
    this.setResultState(correct);

    if (this.instructionText) {
      this.instructionText.style.display = "block";
      this.instructionText.className = "result-msg";
      
      if (correct) {
        this.correctCount++;
        this.instructionText.textContent = "せいかい！ ⭕";
      } else {
        this.instructionText.textContent = `ざんねん... こたえは ${this.currentAnswer} ❌`;
      }
    }
    
    this.waitingAnswer = false;
    this.setNextButton();
  }

  getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // ★追加：空のそろばん（枠のみ）を描画する関数
  drawEmptyAbacus() {
    if (!this.abacusDisplayContainer) return;
    this.abacusDisplayContainer.innerHTML = '';
    
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${this.SVG_WIDTH} ${this.SVG_HEIGHT}`);
    svg.setAttribute("role", "presentation");

    const dodaiImage = document.createElementNS(ns, "image");
    dodaiImage.setAttribute("href", "/images/dodai.png");
    dodaiImage.setAttribute("x", "0");
    dodaiImage.setAttribute("y", "0");
    dodaiImage.setAttribute("width", "100%");
    dodaiImage.setAttribute("height", "100%");
    dodaiImage.setAttribute("preserveAspectRatio", "none");
    
    svg.appendChild(dodaiImage);
    this.abacusDisplayContainer.appendChild(svg);
  }

  // そろばん描画（通常時）
  createAbacusDisplay(value, digits) {
    if (!this.abacusDisplayContainer) return;
    this.abacusDisplayContainer.innerHTML = '';

    const C = TEST_ZERO_CONFIG;
    const ns = "http://www.w3.org/2000/svg";
    
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${this.SVG_WIDTH} ${this.SVG_HEIGHT}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `そろばん: ${value}`);

    // 土台
    const dodaiImage = document.createElementNS(ns, "image");
    dodaiImage.setAttribute("href", "/images/dodai.png");
    dodaiImage.setAttribute("x", "0");
    dodaiImage.setAttribute("y", "0");
    dodaiImage.setAttribute("width", "100%");
    dodaiImage.setAttribute("height", "100%");
    dodaiImage.setAttribute("preserveAspectRatio", "none");
    svg.appendChild(dodaiImage);

    // 玉
    const maxCols = 4;
    for (let col = 0; col < maxCols; col++) {
      const beadX = C.ROD_X[col] - C.TAMA_OFFSET;
      const beadW = C.TAMA_WIDTH;
      const beadH = beadW * 0.55; 

      const digit = this.getDigit(value, digits, col);

      // 五玉
      const isUpperActive = digit >= 5;
      const upperY_Percent = isUpperActive ? C.Y.upperActive : C.Y.upperRest;
      const upperY = (upperY_Percent / 100) * this.SVG_HEIGHT;
      
      const upperBead = document.createElementNS(ns, "image");
      upperBead.setAttribute("href", "/images/tama.png");
      upperBead.setAttribute("x", beadX);
      upperBead.setAttribute("y", upperY);
      upperBead.setAttribute("width", beadW);
      upperBead.setAttribute("height", beadH);
      upperBead.style.transition = "y 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
      svg.appendChild(upperBead);

      // 一玉
      const remainder = digit % 5;
      for (let row = 0; row < 4; row++) {
        const isLowerActive = row < remainder;
        let lowerY_Percent;
        if (isLowerActive) {
          lowerY_Percent = C.Y.lowerActiveStart + (row * C.Y.lowerGap);
        } else {
          lowerY_Percent = C.Y.lowerRest - ((3 - row) * C.Y.lowerGap);
        }
        
        const lowerY = (lowerY_Percent / 100) * this.SVG_HEIGHT;

        const lowerBead = document.createElementNS(ns, "image");
        lowerBead.setAttribute("href", "/images/tama.png");
        lowerBead.setAttribute("x", beadX);
        lowerBead.setAttribute("y", lowerY);
        lowerBead.setAttribute("width", beadW);
        lowerBead.setAttribute("height", beadH);
        lowerBead.style.transition = "y 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
        svg.appendChild(lowerBead);
      }
    }

    this.abacusDisplayContainer.appendChild(svg);
  }

  getDigit(value, digits, col) {
    const maxVisualDigits = 4;
    const str = value.toString().padStart(maxVisualDigits, "0");
    const digitArray = Array.from(str).map(char => parseInt(char, 10));
    const rightToLeftIndex = 3 - col;
    const arrayIndex = maxVisualDigits - 1 - rightToLeftIndex;

    return arrayIndex >= 0 && arrayIndex < digitArray.length ? digitArray[arrayIndex] : 0;
  }
}

if (typeof window !== 'undefined') {
  window.GameController = GameController;
}