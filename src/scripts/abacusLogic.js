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

