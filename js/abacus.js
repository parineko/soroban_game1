/**
 * そろばん描画モジュール
 */
(function() {
  'use strict';
  
  window.SorobanGame = window.SorobanGame || {};

  /**
   * そろばんの1桁分の列を作成
   * @param {number} digit - 0-9の数字
   * @returns {HTMLElement} 列要素
   */
  function createAbacusColumn(digit) {
    const col = document.createElement("div");
    col.className = "abacus-column";

    const upper = document.createElement("div");
    upper.className = "abacus-upper";
    
    const lower = document.createElement("div");
    lower.className = "abacus-lower";

    const bar = document.createElement("div");
    bar.className = "abacus-bar";

    // 5の珠（天珠）
    const fiveBead = document.createElement("div");
    fiveBead.className = "bead five";
    if (digit >= 5) {
      fiveBead.classList.add("active");
    }
    upper.appendChild(fiveBead);

    // 1の珠（地珠）4個
    const ones = digit % 5;
    for (let j = 0; j < 4; j++) {
      const lowerBead = document.createElement("div");
      lowerBead.className = "bead lower";
      if (j < ones) {
        lowerBead.classList.add("active");
      }
      lower.appendChild(lowerBead);
    }

    col.appendChild(upper);
    col.appendChild(bar);
    col.appendChild(lower);

    return col;
  }

  /**
   * そろばんを描画する
   * @param {HTMLElement} container - そろばんを描画するコンテナ要素
   * @param {number} value - 表示する数値
   * @param {number} digits - 桁数
   */
  window.SorobanGame.renderAbacus = function(container, value, digits) {
    container.innerHTML = "";

    const abacus = document.createElement("div");
    abacus.className = "abacus";

    const str = value.toString().padStart(digits, "0");

    for (let i = 0; i < digits; i++) {
      const digit = parseInt(str[i], 10);
      const col = createAbacusColumn(digit);
      abacus.appendChild(col);
    }

    container.appendChild(abacus);
  };
})();

