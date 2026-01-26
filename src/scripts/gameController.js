/**
 * gameController.js
 * 最強そろばんエンジン搭載版（5桁・SVG描画・カスタム設定対応）
 */
import { RESULT_MESSAGES } from './levelConfig.js';

/* --- ★TestZeroで完成させたデザイン設定 --- */
const DESIGN_CONFIG = {
  widthPerDigit: 60,
  height: 225, // 調整済みの高さ
  
  colors: {
    frame: "#231815",
    rod: "#deb887",
    beam: "#e6e6e6",
    beamBorder: "#231815",
    dot: "#000000"
  },
  
  bead: {
    width: 60,
    height: 32,
    imgSrc: "/images/tama.png" 
  },

  y: {
    upperRest: 10,
    upperActive: 28,
    beam: 60,
    lowerBase: 91,
    lowerGap: 31,
    lowerActiveOffset: -19
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
    // 現在のゲーム設定
    this.gameSettings = {
      digits: 3,
      time: 2000,
      questions: 10
    };

    this.currentAnswer = 0;
    this.questionIndex = 0;
    this.correctCount = 0;
    this.answerText = "";
    this.showTimeoutId = null;
    this.waitingAnswer = false;
    this.isNextState = false; 
    
    // DOM要素
    this.levelLabel = getElementSafely("level-label"); // ここに設定を表示
    this.questionCounter = getElementSafely("question-counter");
    this.answerDisplay = getElementSafely("answer-display");
    this.resultSummary = getElementSafely("result-summary");
    this.resultDetail = getElementSafely("result-detail");
    this.abacusArea = getElementSafely("abacus-area");
    this.abacusDisplayContainer = getElementSafely("abacus-display-container");
    this.enterButton = getElementSafely("enter-btn");
    this.instructionText = getElementSafely("instruction-text");
    
    // SVG設定
    this.SVG_WIDTH = 0; // startLevelで計算
    this.SVG_HEIGHT = DESIGN_CONFIG.height;

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

      // レベル選択画面のスタートボタン
      if (button.id === "custom-start-btn") {
        event.preventDefault();
        this.startFromMenu();
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
    });
  }

  showScreen(screenName) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
      screen.style.display = 'none';
    });
    
    const targetScreen = document.querySelector(`[data-screen="${screenName}"]`);
    if (targetScreen) {
      targetScreen.style.display = 'flex'; // 中央寄せのためにflex推奨（CSS依存）
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
      case "retry": this.startLevel(this.gameSettings.digits, this.gameSettings.time); break;
      case "give-up": this.showScreen("start"); break;
      default: break;
    }
  }

  // メニュー画面の値を取得してスタート
  startFromMenu() {
    const digitsSelect = document.getElementById("custom-digits");
    const timeSelect = document.getElementById("custom-time");
    
    if (digitsSelect && timeSelect) {
      const digits = parseInt(digitsSelect.value, 10);
      const time = parseFloat(timeSelect.value) * 1000;
      this.startLevel(digits, time);
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

  // ゲーム開始（引数で設定を受け取る）
  startLevel(digits, timeMs) {
    this.gameSettings = {
      digits: digits,
      time: timeMs,
      questions: 10
    };

    // SVG幅の再計算
    // 本編では「表示桁数＝問題の桁数」とするのが自然ですが、
    // 見た目を良くするために最低でも3桁分くらいの幅は確保しても良いかも。
    // 今回はシンプルに「5桁固定表示」で、問題の桁数だけ変える方式を採用します。
    // （TestZeroで作った5桁そろばんが綺麗だったので）
    this.displayDigits = 5; 
    this.SVG_WIDTH = this.displayDigits * DESIGN_CONFIG.widthPerDigit;
    
    this.reset();

    // ステータスラベルの更新（例：3けた ・ 2.0びょう）
    if (this.levelLabel) {
      const timeSec = (timeMs / 1000).toFixed(1);
      this.levelLabel.textContent = `${digits}けた ・ ${timeSec}びょう`;
    }

    this.showScreen("game");
    this.startCountdown();
  }

  startCountdown() {
    if(this.abacusDisplayContainer) {
       this.abacusDisplayContainer.innerHTML = '';
       this.abacusDisplayContainer.style.display = "flex";
       this.abacusDisplayContainer.style.height = "100%";
       
       // 空のそろばん（枠のみ）を描画
       this.drawAbacusBackground();
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

    if (this.questionIndex >= this.gameSettings.questions) {
      this.finishGame();
      return;
    }

    this.questionIndex++;
    
    const digits = this.gameSettings.digits;
    let min, max;
    if (digits === 1) { min = 0; max = 9; }
    else { min = Math.pow(10, digits - 1); max = Math.pow(10, digits) - 1; }
    
    this.currentAnswer = this.getRandomInt(min, max);
    this.answerText = "";
    this.waitingAnswer = false;

    if (this.questionCounter) {
      const current = this.questionIndex;
      const total = this.gameSettings.questions;
      this.questionCounter.textContent = `${current} / ${total}`;
    }
    
    if (this.answerDisplay) this.answerDisplay.textContent = "";
    
    if (this.instructionText) {
      this.instructionText.style.display = "block";
      this.instructionText.textContent = "かずを おぼえて こたえを いれてね 💡";
    }
    
    if (this.abacusDisplayContainer) {
      // 5桁の枠の中に、問題の数字を描画
      this.createAbacusDisplay(this.currentAnswer, this.displayDigits);
      
      const svg = this.abacusDisplayContainer.querySelector('svg');
      if (svg) {
        // 玉をフェードイン
        const beads = svg.querySelectorAll('image');
        beads.forEach(bead => {
             bead.style.transition = "opacity 0.2s ease";
             bead.style.opacity = "1";
        });
      }
    }

    this.showTimeoutId = setTimeout(() => {
      if (this.abacusDisplayContainer) {
        const svg = this.abacusDisplayContainer.querySelector('svg');
        if (svg) {
            // 時間切れで玉を隠す
            const beads = svg.querySelectorAll('image');
            beads.forEach(bead => bead.style.opacity = "0");
        }
      }
      this.waitingAnswer = true;
    }, this.gameSettings.time);
  }

  finishGame() {
    const total = this.gameSettings.questions;
    const correct = this.correctCount;
    const percent = Math.round((correct / total) * 100);
    
    let message;
    if (percent === 100) message = RESULT_MESSAGES.perfect;
    else if (percent >= 80) message = RESULT_MESSAGES.excellent;
    else if (percent >= 50) message = RESULT_MESSAGES.good;
    else message = RESULT_MESSAGES.keepGoing;

    if (this.resultSummary) {
      this.resultSummary.textContent = `${correct}もん せいかい！`;
    }
    if (this.resultDetail) {
      this.resultDetail.innerHTML = `<span style="font-size: 3rem;">${percent}</span> てん<br><span style="font-size: 1rem; color: #888;">${message}</span>`;
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
    // 入力桁数制限（設定桁数 + 1くらい余裕を持たせる）
    if (this.answerText.length >= this.gameSettings.digits + 1) return;

    if (this.answerText === "0") this.answerText = validatedDigit.toString();
    else this.answerText += validatedDigit.toString();
    
    if (this.answerDisplay) this.answerDisplay.textContent = this.answerText;
  }

  incrementAnswer() {
    if (!this.waitingAnswer || this.isNextState) return;
    const currentValue = this.answerText ? parseInt(this.answerText, 10) : 0;
    if (isNaN(currentValue)) this.answerText = "1";
    else {
      this.answerText = (currentValue + 1).toString();
    }
    if (this.answerDisplay) this.answerDisplay.textContent = this.answerText;
  }

  decrementAnswer() {
    if (!this.waitingAnswer || this.isNextState) return;
    const currentValue = this.answerText ? parseInt(this.answerText, 10) : 0;
    if (isNaN(currentValue) || currentValue <= 0) this.answerText = "0";
    else {
      this.answerText = (currentValue - 1).toString();
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
      // 答え合わせの時に玉を再表示
      const svg = this.abacusDisplayContainer.querySelector('svg');
      if (svg) {
         const beads = svg.querySelectorAll('image');
         beads.forEach(b => b.style.opacity = "1");
      }
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

  // --- SVG生成関連 (TestZeroからの移植) ---

  drawAbacusBackground() {
    if (!this.abacusDisplayContainer) return;
    this.abacusDisplayContainer.innerHTML = '';
    
    const ns = "http://www.w3.org/2000/svg";
    const C = DESIGN_CONFIG;
    
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${this.SVG_WIDTH} ${this.SVG_HEIGHT}`);
    svg.setAttribute("role", "presentation");
    svg.style.width = "100%";
    svg.style.height = "100%";

    // 外枠
    const createFrame = (y) => {
        const r = document.createElementNS(ns, "rect");
        r.setAttribute("x", 0); r.setAttribute("y", y);
        r.setAttribute("width", this.SVG_WIDTH); r.setAttribute("height", 10);
        r.setAttribute("fill", C.colors.frame);
        return r;
    };
    svg.appendChild(createFrame(0));
    svg.appendChild(createFrame(this.SVG_HEIGHT - 10));

    // 梁
    const beam = document.createElementNS(ns, "rect");
    beam.setAttribute("x", 0); beam.setAttribute("y", C.y.beam);
    beam.setAttribute("width", this.SVG_WIDTH); beam.setAttribute("height", 12);
    beam.setAttribute("fill", C.colors.beam);
    beam.setAttribute("stroke", C.colors.beamBorder);
    beam.setAttribute("stroke-width", "1");
    svg.appendChild(beam);

    // 棒と点
    for(let i=0; i<this.displayDigits; i++) {
        const cx = (i * C.widthPerDigit) + (C.widthPerDigit / 2);
        
        const rod = document.createElementNS(ns, "rect");
        rod.setAttribute("x", cx - 3); 
        rod.setAttribute("y", 10);
        rod.setAttribute("width", 6);
        rod.setAttribute("height", this.SVG_HEIGHT - 20);
        rod.setAttribute("fill", C.colors.rod);
        
        svg.insertBefore(rod, beam);

        // 点（一の位と千の位）
        const onePlaceIdx = this.displayDigits - 1;
        const thousandPlaceIdx = this.displayDigits - 4;
        
        if (i === onePlaceIdx || (thousandPlaceIdx >= 0 && i === thousandPlaceIdx)) { 
           const dot = document.createElementNS(ns, "circle");
           dot.setAttribute("cx", cx);
           dot.setAttribute("cy", C.y.beam + 6); 
           dot.setAttribute("r", 3); 
           dot.setAttribute("fill", C.colors.dot);
           svg.appendChild(dot);
        }
    }

    this.abacusDisplayContainer.appendChild(svg);
    return svg;
  }

  createAbacusDisplay(value, digits) {
    const svg = this.drawAbacusBackground();
    if (!svg) return;

    const ns = "http://www.w3.org/2000/svg";
    const C = DESIGN_CONFIG;
    
    for (let col = 0; col < digits; col++) {
      const cx = (col * C.widthPerDigit) + (C.widthPerDigit / 2);
      const beadX = cx - (C.bead.width / 2);
      
      const digit = this.getDigit(value, digits, col);

      // 五玉
      const isUpperActive = digit >= 5;
      const upperY = isUpperActive ? C.y.upperActive : C.y.upperRest;
      
      const upperBead = document.createElementNS(ns, "image");
      upperBead.setAttribute("href", C.bead.imgSrc);
      upperBead.setAttribute("x", beadX);
      upperBead.setAttribute("y", upperY);
      upperBead.setAttribute("width", C.bead.width);
      upperBead.setAttribute("height", C.bead.height);
      svg.appendChild(upperBead);

      // 一玉
      const remainder = digit % 5;
      for (let row = 0; row < 4; row++) {
        const isLowerActive = row < remainder;
        let lowerY;
        if (isLowerActive) {
          lowerY = (C.y.lowerBase + (row * C.y.lowerGap)) + C.y.lowerActiveOffset;
        } else {
          lowerY = C.y.lowerBase + (row * C.y.lowerGap);
        }
        
        const lowerBead = document.createElementNS(ns, "image");
        lowerBead.setAttribute("href", C.bead.imgSrc);
        lowerBead.setAttribute("x", beadX);
        lowerBead.setAttribute("y", lowerY);
        lowerBead.setAttribute("width", C.bead.width);
        lowerBead.setAttribute("height", C.bead.height);
        svg.appendChild(lowerBead);
      }
    }
  }

  getDigit(value, digits, col) {
    const str = value.toString().padStart(digits, "0");
    const digitArray = Array.from(str).map(char => parseInt(char, 10));
    if (col >= 0 && col < digitArray.length) {
      return digitArray[col];
    }
    return 0;
  }
}

if (typeof window !== 'undefined') {
  window.GameController = GameController;
}