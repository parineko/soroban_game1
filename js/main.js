/**
 * メインエントリーポイント
 */
(function() {
  'use strict';
  
  // 初期化
  var GameState = window.SorobanGame.GameState;
  var ScreenManager = window.SorobanGame.ScreenManager;
  var GameUI = window.SorobanGame.GameUI;
  var renderAbacus = window.SorobanGame.renderAbacus;

  var gameState = new GameState();
  var screenManager = new ScreenManager();
  var gameUI = new GameUI();

  /**
   * レベルを開始
   * @param {string} levelKey - レベルキー
   */
  function startLevel(levelKey) {
    gameState.setLevel(levelKey);
    gameUI.updateLevelLabel(gameState.currentLevel.label);
    screenManager.show("game");
    nextQuestion();
  }

  /**
   * 次の問題へ
   */
  function nextQuestion() {
    // 前のタイマーをクリア
    if (gameState.showTimeoutId) {
      clearTimeout(gameState.showTimeoutId);
      gameState.showTimeoutId = null;
    }

    // ゲーム終了チェック
    if (gameState.isGameFinished()) {
      finishGame();
      return;
    }

    // 問題を生成
    var answer = gameState.generateNextQuestion();
    var digits = gameState.currentLevel.digits;

    // UI更新
    gameUI.updateQuestionCounter(
      gameState.questionIndex,
      gameState.currentLevel.questions
    );
    gameUI.updateAnswerDisplay("");
    gameUI.clearFeedback();

    // そろばんを描画
    renderAbacus(gameUI.abacusArea, answer, digits);
    gameUI.setAbacusHidden(false);

    // 一定時間後に非表示
    gameState.waitingAnswer = false;
    gameState.showTimeoutId = setTimeout(function() {
      gameUI.setAbacusHidden(true);
      gameState.waitingAnswer = true;
    }, gameState.currentLevel.displayTime);
  }

  /**
   * ゲーム終了処理
   */
  function finishGame() {
    var result = gameState.getResult();
    gameUI.showResult(result);
    screenManager.show("result");
  }

  /**
   * キーパッド入力処理
   * @param {string} key - 入力キー
   */
  function handleKeypad(key) {
    if (key === "del") {
      if (gameState.answerText.length > 0) {
        gameState.answerText = gameState.answerText.slice(0, -1);
        gameUI.updateAnswerDisplay(gameState.answerText);
      }
      return;
    }

    if (key === "enter") {
      if (!gameState.waitingAnswer) {
        return;
      }
      if (gameState.answerText.length === 0) {
        return;
      }
      checkAnswer();
      return;
    }

    // 数字入力
    if (!/^[0-9]$/.test(key)) {
      return;
    }

    if (gameState.answerText.length >= gameState.currentLevel.digits + 1) {
      return;
    }

    if (gameState.answerText === "0") {
      gameState.answerText = key;
    } else {
      gameState.answerText += key;
    }
    gameUI.updateAnswerDisplay(gameState.answerText);
  }

  /**
   * 答えをチェック
   */
  function checkAnswer() {
    var result = gameState.checkAnswer();
    gameUI.showFeedback(result.message, result.correct ? "success" : "error");

    gameState.waitingAnswer = false;
    setTimeout(function() {
      nextQuestion();
    }, 1000);
  }

  /**
   * アクション処理
   * @param {string} action - アクション名
   */
  function handleAction(action) {
    switch (action) {
      case "go-howto":
        screenManager.show("howto");
        break;
      case "go-level":
        screenManager.show("level");
        break;
      case "back-start":
        screenManager.show("start");
        break;
      case "back-level":
        screenManager.show("level");
        break;
      case "retry":
        startLevel(gameState.currentLevel.key);
        break;
      case "give-up":
        screenManager.show("start");
        break;
      default:
        break;
    }
  }

  // イベントリスナー設定
  document.addEventListener("DOMContentLoaded", function() {
    document.body.addEventListener("click", function(event) {
      // クリックされた要素またはその親要素からボタンを取得
      var button = event.target.closest("button");
      if (!button) return;

      // data-action属性を確認
      var action = button.getAttribute("data-action");
      if (action) {
        event.preventDefault();
        handleAction(action);
        return;
      }

      // キーパッドボタン
      if (button.classList.contains("key-btn")) {
        var key = button.getAttribute("data-key");
        if (key) {
          event.preventDefault();
          handleKeypad(key);
        }
        return;
      }

      // レベル選択ボタン
      if (button.classList.contains("level-btn")) {
        var levelKey = button.getAttribute("data-level");
        if (levelKey) {
          event.preventDefault();
          startLevel(levelKey);
        }
        return;
      }
    });
  });
})();

