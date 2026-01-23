/**
 * gameController.js
 * PCレイアウト修正 & カウントダウン表示安定版
 */
import { LEVELS, RESULT_MESSAGES } from './levelConfig.js';

function getElementSafely(id) {
  return document.getElementById(id);
}

function validateDigit(num) {
  const n = Number(num);
  if (isNaN(n) || n < 0 || n > 9) return null;
  return n;
}

function setupImageErrorHandler(img) {
  img.onerror = () => {
    console.error("画像読み込みに失敗:", img.src);
  };
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
    
    // 座標設定
    this.ROD_X = [11.6, 36.2, 61.2, 85.8];
    this.TAMA_WIDTH = 20.0;
    this.TAMA_OFFSET = 9.0;
    
    this.Y = {
      upperRest: 4.0, upperActive: 13.0,
      lowerRest: 83.0, lowerActiveStart: 30.5, lowerGap: 13
    };
    
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
    // ★ここ重要：カウントダウン中もエリアを確保して表示する
    if(this.abacusDisplayContainer) {
       this.abacusDisplayContainer.innerHTML = '';
       this.abacusDisplayContainer.style.display = "flex";
       this.abacusDisplayContainer.style.height = "100%"; // 高さを明示
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
      const abacusBase = this.abacusDisplayContainer.querySelector('.abacus-base');
      if (abacusBase) abacusBase.style.opacity = "1";
    }

    this.showTimeoutId = setTimeout(() => {
      if (this.abacusDisplayContainer) {
        const abacusBase = this.abacusDisplayContainer.querySelector('.abacus-base');
        if (abacusBase) abacusBase.style.opacity = "0";
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
      const abacusBase = this.abacusDisplayContainer.querySelector('.abacus-base');
      if (abacusBase) abacusBase.style.opacity = "1";
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

  createAbacusDisplay(value, digits) {
    if (!this.abacusDisplayContainer) return;
    this.abacusDisplayContainer.innerHTML = '';
    const maxDigits = Math.max(digits, 4);

    const abacusBase = document.createElement('div');
    abacusBase.className = 'abacus-base';
    abacusBase.style.cssText = 'position: relative; width: 100%; height: auto; margin: 0 auto; max-width: 500px; overflow: visible;';
    
    const dodai = document.createElement('img');
    dodai.src = '/images/dodai.png';
    dodai.alt = 'そろばんの土台';
    dodai.className = 'dodai';
    dodai.loading = 'eager';
    dodai.style.cssText = 'display: block; width: 100%; height: auto;';
    setupImageErrorHandler(dodai);
    abacusBase.appendChild(dodai);
    
    for (let col = 0; col < 4; col++) {
      const leftPos = this.ROD_X[col] - this.TAMA_OFFSET;
      
      const upperBead = document.createElement('img');
      upperBead.src = '/images/tama.png';
      upperBead.className = `tama upper U${col}`;
      const upperY = this.getUpperY(value, maxDigits, col);
      upperBead.style.cssText = `position: absolute; left: ${leftPos}%; top: ${upperY}%; width: ${this.TAMA_WIDTH}%; height: auto; transition: top 0.3s ease;`;
      abacusBase.appendChild(upperBead);
      
      for (let row = 0; row < 4; row++) {
        const lowerBead = document.createElement('img');
        lowerBead.src = '/images/tama.png';
        lowerBead.className = `tama lower L${col}_${row}`;
        const lowerY = this.getLowerY(value, maxDigits, col, row);
        lowerBead.style.cssText = `position: absolute; left: ${leftPos}%; top: ${lowerY}%; width: ${this.TAMA_WIDTH}%; height: auto; transition: top 0.3s ease;`;
        abacusBase.appendChild(lowerBead);
      }
    }
    this.abacusDisplayContainer.appendChild(abacusBase);
  }

  getDigit(value, digits, col) {
    const str = value.toString().padStart(digits, "0");
    const digitArray = Array.from(str).map(char => parseInt(char, 10));
    const rightToLeftIndex = 3 - col;
    const arrayIndex = digits - 1 - rightToLeftIndex;
    return arrayIndex >= 0 && arrayIndex < digitArray.length ? digitArray[arrayIndex] : 0;
  }

  getUpperY(value, digits, col) {
    const digit = this.getDigit(value, digits, col);
    return digit >= 5 ? this.Y.upperActive : this.Y.upperRest;
  }

  getLowerY(value, digits, col, row) {
    const digit = this.getDigit(value, digits, col);
    const ones = digit % 5;
    if (row < ones) return this.Y.lowerActiveStart + row * this.Y.lowerGap;
    return this.Y.lowerRest - (3 - row) * this.Y.lowerGap;
  }
}

if (typeof window !== 'undefined') {
  window.GameController = GameController;
}