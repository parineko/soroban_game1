/**
 * abacusLogic.js
 * 数値 → そろばんの珠のオン/オフ状態に変換するロジック
 */

/**
 * 数値をそろばんの各桁に分解
 * @param {number} value - 数値
 * @param {number} digits - 桁数
 * @returns {Array<number>} 各桁の数字の配列
 */
export function getAbacusDigits(value, digits) {
  const str = value.toString().padStart(digits, "0");
  return Array.from(str).map(char => parseInt(char, 10));
}

/**
 * 1桁の数字からそろばんの状態を取得
 * @param {number} digit - 0-9の数字
 * @returns {Object} { hasFive: boolean, ones: number }
 */
export function getAbacusState(digit) {
  return {
    hasFive: digit >= 5,
    ones: digit % 5,
  };
}

/**
 * そろばんを描画する（DOM操作）
 * @param {HTMLElement} container - コンテナ要素
 * @param {number} value - 表示する数値
 * @param {number} digits - 桁数
 */
export function renderAbacus(container, value, digits) {
  container.innerHTML = "";

  const abacus = document.createElement("div");
  abacus.className = "abacus";

  const digitArray = getAbacusDigits(value, digits);

  digitArray.forEach((digit) => {
    const col = createAbacusColumn(digit);
    abacus.appendChild(col);
  });

  container.appendChild(abacus);
}

/**
 * そろばんの1桁分の列を作成（本物風菱形ビーズ）
 * @param {number} digit - 0-9の数字
 * @returns {HTMLElement} 列要素
 */
function createAbacusColumn(digit) {
  const col = document.createElement("div");
  col.className = "abacus-column";

  // 上段の柱（五玉用）
  const rodUpper = document.createElement("div");
  rodUpper.className = "rod rod-upper";
  
  // 5の珠（天珠）
  const fiveBead = document.createElement("div");
  fiveBead.className = "bead bead-five";
  if (digit >= 5) {
    fiveBead.classList.add("active");
  }
  rodUpper.appendChild(fiveBead);

  // 仕切り線（梁）
  const separator = document.createElement("div");
  separator.className = "separator";

  // 下段の柱（一玉用）
  const rodLower = document.createElement("div");
  rodLower.className = "rod rod-lower";

  // 1の珠（地珠）4個
  const ones = digit % 5;
  for (let j = 0; j < 4; j++) {
    const lowerBead = document.createElement("div");
    lowerBead.className = "bead bead-one";
    if (j < ones) {
      lowerBead.classList.add("active");
    }
    rodLower.appendChild(lowerBead);
  }

  col.appendChild(rodUpper);
  col.appendChild(separator);
  col.appendChild(rodLower);

  return col;
}

