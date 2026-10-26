/**
 * app.js - Main Application Logic for Math Practice
 * Handles settings, problem generation, manual input, answer verification,
 * stats tracking, and conditional animation display.
 */

class MathApp {
  constructor() {
    // Current Configuration State (with defaults as specified)
    this.config = {
      operation: 'sub', // Default: Subtraction ('sub' or 'add')
      itemsCount: 2,    // Default: 2 items
      digits: 2,        // Default: 2 digits (e.g. 72 - 18, 22 + 33)
      mode: 'auto'      // Default: auto generate ('auto' or 'manual')
    };

    // Current Problem State
    this.currentProblem = {
      numbers: [72, 18],
      operation: 'sub',
      correctAnswer: 54,
      isAnimationEligible: false
    };

    // Stats
    this.stats = {
      total: 0,
      correct: 0,
      streak: 0
    };

    this.history = [];

    // DOM Elements
    this.workspace = document.getElementById('mainWorkspace');
    this.horizontalProblemEl = document.getElementById('horizontalProblem');
    this.userAnswerInput = document.getElementById('userAnswerInput');
    this.btnSubmit = document.getElementById('btnSubmitAnswer');
    this.btnNewProblem = document.getElementById('btnNewProblem');
    this.feedbackBanner = document.getElementById('feedbackBanner');
    this.feedbackIcon = document.getElementById('feedbackIcon');
    this.feedbackTitle = document.getElementById('feedbackTitle');
    this.feedbackDesc = document.getElementById('feedbackDesc');
    this.gradeTag = document.getElementById('gradeTag');
    this.itemsCountSelect = document.getElementById('itemsCountSelect');
    this.digitsSelect = document.getElementById('digitsSelect');
    this.manualPanel = document.getElementById('manualInputPanel');
    this.manualFieldsContainer = document.getElementById('manualFieldsContainer');
    this.btnApplyManual = document.getElementById('btnApplyManual');
    this.btnQuickTenExample = document.getElementById('btnQuickTenExample');
    this.soundToggleBtn = document.getElementById('soundToggleBtn');
    this.streakCountEl = document.getElementById('streakCount');
    this.correctCountEl = document.getElementById('correctCount');
    this.totalAttemptedEl = document.getElementById('totalAttempted');
    this.historyTableBody = document.getElementById('historyTableBody');
    this.historyCountEl = document.getElementById('historyCount');
    this.btnClearHistory = document.getElementById('btnClearHistory');
    this.toggleColumnMath = document.getElementById('toggleColumnMath');
    this.columnMathBody = document.getElementById('columnMathBody');
    this.toggleArrow = document.getElementById('toggleArrow');

    this.bindEvents();
    this.init();
  }

  init() {
    // Render initial problem (Default: 2 numbers, 2 digits, subtraction, auto)
    this.generateNewProblem();
  }

  bindEvents() {
    // 1. Operation toggle
    document.querySelectorAll('#operationGroup .btn-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#operationGroup .btn-toggle').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.config.operation = btn.dataset.op;
        this.onConfigChanged();
      });
    });

    // 2. Items count dropdown (2, 3, 4)
    this.itemsCountSelect.addEventListener('change', (e) => {
      this.config.itemsCount = parseInt(e.target.value, 10);
      this.onConfigChanged();
    });

    // 3. Digits dropdown (1, 2, 3, random)
    this.digitsSelect.addEventListener('change', (e) => {
      this.config.digits = e.target.value === 'random' ? 'random' : parseInt(e.target.value, 10);
      this.onConfigChanged();
    });

    // 4. Input mode toggle (auto / manual)
    document.querySelectorAll('#inputModeGroup .btn-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#inputModeGroup .btn-toggle').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.config.mode = btn.dataset.mode;
        this.updateModeUI();
      });
    });

    // Manual input events
    this.btnApplyManual.addEventListener('click', () => this.applyManualInput());
    this.btnQuickTenExample.addEventListener('click', () => this.applyQuickTenExample());

    // Practice interactions
    this.btnSubmit.addEventListener('click', () => this.checkAnswer());
    this.userAnswerInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.checkAnswer();
      }
    });

    this.btnNewProblem.addEventListener('click', () => {
      this.generateNewProblem();
    });

    // Virtual numpad
    document.querySelectorAll('.num-key').forEach(key => {
      key.addEventListener('click', () => {
        const val = key.dataset.key;
        if (val === 'clear') {
          this.userAnswerInput.value = '';
        } else if (val === 'backspace') {
          this.userAnswerInput.value = this.userAnswerInput.value.slice(0, -1);
        } else {
          this.userAnswerInput.value += val;
        }
        this.userAnswerInput.focus();
      });
    });

    // Sound toggle
    this.soundToggleBtn.addEventListener('click', () => {
      const isMuted = !window.flashAnimator.soundMuted;
      window.flashAnimator.soundMuted = isMuted;
      document.getElementById('soundIcon').textContent = isMuted ? '🔇' : '🔊';
      document.getElementById('soundLabel').textContent = isMuted ? '音效：關' : '音效：開';
    });

    // Clear history
    this.btnClearHistory.addEventListener('click', () => {
      this.history = [];
      this.renderHistory();
    });

    // Collapsible column math
    this.toggleColumnMath.addEventListener('click', () => {
      const isHidden = this.columnMathBody.style.display === 'none';
      this.columnMathBody.style.display = isHidden ? 'block' : 'none';
      this.toggleArrow.textContent = isHidden ? '▲' : '▼';
    });
  }

  onConfigChanged() {
    this.updateModeUI();
    if (this.config.mode === 'auto') {
      this.generateNewProblem();
    }
  }

  updateModeUI() {
    if (this.config.mode === 'manual') {
      this.manualPanel.style.display = 'flex';
      this.renderManualInputFields();
    } else {
      this.manualPanel.style.display = 'none';
    }
  }

  renderManualInputFields() {
    this.manualFieldsContainer.innerHTML = '';
    const opSymbol = this.config.operation === 'add' ? '＋' : '－';
    const count = this.config.itemsCount;

    for (let i = 0; i < count; i++) {
      if (i > 0) {
        const symbolSpan = document.createElement('span');
        symbolSpan.className = 'manual-operator-symbol';
        symbolSpan.textContent = opSymbol;
        this.manualFieldsContainer.appendChild(symbolSpan);
      }

      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'manual-input-box';
      input.id = `manualNum_${i}`;
      input.placeholder = `第${i + 1}數`;
      input.min = '0';
      input.max = '999';

      // Pre-populate with reasonable values
      if (this.config.itemsCount === 2 && this.config.digits === 1) {
        input.value = (i === 0 ? 8 : 3);
      } else if (this.config.itemsCount === 2 && this.config.digits === 2) {
        input.value = (i === 0 ? 72 : 18);
      } else {
        input.value = (i === 0 ? 80 : 20);
      }

      this.manualFieldsContainer.appendChild(input);
    }
  }

  applyManualInput() {
    const numbers = [];
    const count = this.config.itemsCount;

    for (let i = 0; i < count; i++) {
      const input = document.getElementById(`manualNum_${i}`);
      const val = parseInt(input.value, 10);
      if (isNaN(val) || val < 0) {
        alert(`請在第 ${i + 1} 個格子輸入合法的非負整數！`);
        input.focus();
        return;
      }
      numbers.push(val);
    }

    // For subtraction, warn if result would be negative
    if (this.config.operation === 'sub') {
      const sumOfRest = numbers.slice(1).reduce((acc, n) => acc + n, 0);
      if (numbers[0] < sumOfRest) {
        if (!confirm(`提示：目前設定的第一個數字 (${numbers[0]}) 小於後面數字的總和 (${sumOfRest})，結果會小於 0 喔！國小數學通常建議大減小，確定要出這題嗎？`)) {
          return;
        }
      }
    }

    this.setupProblemWithNumbers(numbers, this.config.operation);
  }

  applyQuickTenExample() {
    // Quick demo for 10-or-under Flash animation
    this.config.itemsCount = 2;
    this.itemsCountSelect.value = '2';
    this.config.digits = 1;
    this.digitsSelect.value = '1';

    if (this.config.operation === 'add') {
      this.setupProblemWithNumbers([4, 3], 'add');
    } else {
      this.setupProblemWithNumbers([8, 5], 'sub'); // 8 - 5 = 3 per user's prompt example
    }
  }

  generateNewProblem() {
    const { operation, itemsCount, digits } = this.config;
    let numbers = [];

    if (operation === 'add') {
      for (let i = 0; i < itemsCount; i++) {
        numbers.push(this.getRandomNumber(digits));
      }
    } else {
      // Subtraction: ensure numbers[0] >= sum of others so young learners don't get negative results
      const rest = [];
      for (let i = 1; i < itemsCount; i++) {
        rest.push(this.getRandomNumber(digits));
      }
      const sumRest = rest.reduce((a, b) => a + b, 0);

      // Generate first number such that num1 >= sumRest
      let firstNum = this.getRandomNumber(digits);
      if (digits === 1) {
        // For 1-digit subtraction: make sure firstNum >= sumRest and <= 10
        if (sumRest >= 9) {
          // adjust rest
          rest.forEach((_, idx) => rest[idx] = Math.max(1, Math.floor(8 / (itemsCount - 1))));
          const newSum = rest.reduce((a, b) => a + b, 0);
          firstNum = Math.min(10, newSum + Math.floor(Math.random() * (10 - newSum + 1)));
        } else {
          firstNum = Math.min(10, sumRest + Math.floor(Math.random() * (10 - sumRest + 1)));
        }
      } else {
        if (firstNum < sumRest) {
          firstNum = sumRest + Math.floor(Math.random() * 20) + 1;
        }
      }

      numbers = [firstNum, ...rest];
    }

    this.setupProblemWithNumbers(numbers, operation);
  }

  getRandomNumber(digitsSetting) {
    if (digitsSetting === 1) {
      // 1 digit (1 ~ 9, or up to 10)
      return Math.floor(Math.random() * 9) + 1;
    } else if (digitsSetting === 2) {
      // 2 digits (10 ~ 99)
      return Math.floor(Math.random() * 90) + 10;
    } else if (digitsSetting === 3) {
      // 3 digits (100 ~ 999)
      return Math.floor(Math.random() * 900) + 100;
    } else {
      // Random / Unlimited (1 ~ 3 digits mixed)
      const choice = Math.floor(Math.random() * 3) + 1;
      return this.getRandomNumber(choice);
    }
  }

  setupProblemWithNumbers(numbers, operation) {
    let correctAnswer = numbers[0];
    for (let i = 1; i < numbers.length; i++) {
      if (operation === 'add') {
        correctAnswer += numbers[i];
      } else {
        correctAnswer -= numbers[i];
      }
    }

    // Check Flash animation condition:
    // "只有在: 2個項目的數字且數字大小皆為10以內的情境; 至少要占整個UI的一半區域,來展示教學動畫"
    const isAnimationEligible = (
      numbers.length === 2 &&
      numbers[0] <= 10 &&
      numbers[1] <= 10
    );

    this.currentProblem = {
      numbers: numbers,
      operation: operation,
      correctAnswer: correctAnswer,
      isAnimationEligible: isAnimationEligible
    };

    this.renderProblemUI();

    // Adjust workspace layout:
    // If eligible, show animation theater and occupy >= 50%
    if (isAnimationEligible) {
      this.workspace.classList.remove('no-animation');
      this.workspace.classList.add('has-animation');
      window.flashAnimator.loadProblem(numbers[0], numbers[1], operation);
      // Requirement e: Animation defaults to paused until user clicks Play
    } else {
      this.workspace.classList.remove('has-animation');
      this.workspace.classList.add('no-animation');
      window.flashAnimator.pause();
    }

    // Reset user answer input
    this.userAnswerInput.value = '';
    this.userAnswerInput.focus();
    this.feedbackBanner.style.display = 'none';

    // Update grade badge recommendation
    this.updateGradeBadge();

    // Render vertical math breakdown (hide result initially)
    this.renderColumnMath(false);
  }

  renderProblemUI() {
    const { numbers, operation } = this.currentProblem;
    const opSymbol = operation === 'add' ? '＋' : '－';

    let html = '';
    numbers.forEach((num, idx) => {
      if (idx > 0) {
        html += `<span class="op-symbol">${opSymbol}</span>`;
      }
      html += `<span>${num}</span>`;
    });

    this.horizontalProblemEl.innerHTML = html;
  }

  updateGradeBadge() {
    const { numbers, isAnimationEligible } = this.currentProblem;
    const maxVal = Math.max(...numbers);

    if (isAnimationEligible) {
      this.gradeTag.textContent = '🌟 幼稚園大班 ~ 國小一年級 (啟動 Flash 趣味動畫教學)';
      this.gradeTag.style.background = '#fff3bf';
      this.gradeTag.style.color = '#d9480f';
      this.gradeTag.style.borderColor = '#fcc419';
    } else if (maxVal < 100) {
      this.gradeTag.textContent = '📘 國小一 ~ 二年級 (二位數加減練習)';
      this.gradeTag.style.background = '#e7f5ff';
      this.gradeTag.style.color = '#1864ab';
      this.gradeTag.style.borderColor = '#74c0fc';
    } else {
      this.gradeTag.textContent = '🎓 國小三 ~ 六年級 (三位數加減/多項運算挑戰)';
      this.gradeTag.style.background = '#f3f0ff';
      this.gradeTag.style.color = '#5f3dc4';
      this.gradeTag.style.borderColor = '#d0bfff';
    }
  }

  renderColumnMath(showResult = false) {
    const { numbers, operation, correctAnswer } = this.currentProblem;
    const opSymbol = operation === 'add' ? '＋' : '－';

    // Provide vertical calculation view especially helpful for 2 items multi-digit
    if (numbers.length === 2) {
      const resultCell = showResult 
        ? `<span style="color: #2b8a3e;">${correctAnswer}</span>`
        : `<span style="color: #e8590c;">？</span>`;

      let tableHtml = `<table class="vertical-calc-table">`;
      tableHtml += `<tr><td class="op-cell"></td><td>${numbers[0]}</td></tr>`;
      tableHtml += `<tr><td class="op-cell">${opSymbol}</td><td class="border-bottom-line">${numbers[1]}</td></tr>`;
      tableHtml += `<tr><td class="op-cell"></td><td>${resultCell}</td></tr>`;
      tableHtml += `</table>`;

      // Educational tips for carrying/borrowing
      let note = '';
      if (showResult) {
        if (operation === 'add') {
          const d1 = numbers[0] % 10;
          const d2 = numbers[1] % 10;
          if (d1 + d2 >= 10) {
            note = `<p style="margin-top: 10px; font-size: 0.9rem; color: #e03131; text-align: center;">💡 個位數相加 ${d1} ＋ ${d2} ＝ ${d1 + d2}，滿十要向前一位（十位）進 1 喔！</p>`;
          }
        } else {
          const d1 = numbers[0] % 10;
          const d2 = numbers[1] % 10;
          if (d1 < d2) {
            note = `<p style="margin-top: 10px; font-size: 0.9rem; color: #e03131; text-align: center;">💡 個位數 ${d1} 不夠減 ${d2}，需要向十位數借 1 當作 10 喔！</p>`;
          }
        }
      } else {
        note = `<p style="margin-top: 10px; font-size: 0.88rem; color: #868e96; text-align: center;">💭 請先動動腦輸入答案，送出後會揭曉直式運算提示喔！</p>`;
      }

      this.columnMathBody.innerHTML = tableHtml + note;
    } else {
      // Step by step left-to-right breakdown for 3 or 4 numbers
      if (!showResult) {
        this.columnMathBody.innerHTML = `<div style="font-size: 1rem; color: #868e96; text-align: center; padding: 8px;">💭 請先在上方輸入答案，送出後將顯示多項式逐步解析！</div>`;
        return;
      }

      let stepsHtml = `<div style="font-size: 1.1rem; line-height: 1.8; color: #343a40;">`;
      stepsHtml += `<strong>循序運算步驟：</strong><br>`;
      let currentVal = numbers[0];
      for (let i = 1; i < numbers.length; i++) {
        const nextVal = numbers[i];
        const nextResult = operation === 'add' ? (currentVal + nextVal) : (currentVal - nextVal);
        stepsHtml += `第 ${i} 步：${currentVal} ${opSymbol} ${nextVal} ＝ <strong>${nextResult}</strong><br>`;
        currentVal = nextResult;
      }
      stepsHtml += `最終結果 ＝ <strong style="color: #2b8a3e; font-size: 1.3rem;">${currentVal}</strong></div>`;
      this.columnMathBody.innerHTML = stepsHtml;
    }
  }

  checkAnswer() {
    const valText = this.userAnswerInput.value.trim();
    if (valText === '') {
      alert('請先輸入你的答案喔！');
      this.userAnswerInput.focus();
      return;
    }

    const userAnswer = parseInt(valText, 10);
    const isCorrect = (userAnswer === this.currentProblem.correctAnswer);

    this.stats.total++;
    if (isCorrect) {
      this.stats.correct++;
      this.stats.streak++;
      window.flashAnimator.playSound('fanfare');
      this.showFeedback(true);
      // Reveal column math
      this.renderColumnMath(true);

      // If Flash animation is active, unlock and reveal Step 4 celebration!
      if (this.currentProblem.isAnimationEligible) {
        window.flashAnimator.unlockAndRevealAnswer();
      }
    } else {
      this.stats.streak = 0;
      window.flashAnimator.playSound('woosh');
      this.showFeedback(false);
    }

    this.updateStatsUI();
    this.addHistoryRecord(userAnswer, isCorrect);
  }

  showFeedback(isCorrect) {
    this.feedbackBanner.style.display = 'flex';
    const { numbers, operation, correctAnswer } = this.currentProblem;
    const opSymbol = operation === 'add' ? '＋' : '－';
    const formulaStr = numbers.join(` ${opSymbol} `) + ` ＝ ${correctAnswer}`;

    if (isCorrect) {
      this.feedbackBanner.className = 'feedback-banner correct';
      this.feedbackIcon.textContent = '🎉';
      this.feedbackTitle.textContent = '答對了！太棒了！⭐⭐⭐';
      this.feedbackDesc.textContent = `恭喜你！${formulaStr}`;
    } else {
      this.feedbackBanner.className = 'feedback-banner wrong';
      this.feedbackIcon.textContent = '💪';
      this.feedbackTitle.textContent = '再想一想，加油！';
      this.feedbackDesc.textContent = `正確答案是：${formulaStr}。點選下方「查看直式算則解析」可以看解題提示喔！`;
    }
  }

  updateStatsUI() {
    this.streakCountEl.textContent = this.stats.streak;
    this.correctCountEl.textContent = this.stats.correct;
    this.totalAttemptedEl.textContent = this.stats.total;
  }

  addHistoryRecord(userAnswer, isCorrect) {
    const { numbers, operation, correctAnswer } = this.currentProblem;
    const opSymbol = operation === 'add' ? '＋' : '－';
    const formula = numbers.join(` ${opSymbol} `);

    this.history.unshift({
      index: this.stats.total,
      formula: formula,
      userAnswer: userAnswer,
      correctAnswer: correctAnswer,
      isCorrect: isCorrect
    });

    this.renderHistory();
  }

  renderHistory() {
    this.historyCountEl.textContent = this.history.length;

    if (this.history.length === 0) {
      this.historyTableBody.innerHTML = `
        <tr class="empty-row"><td colspan="5">尚未開始練習，送出答案後會記錄在這裡喔！</td></tr>
      `;
      return;
    }

    let rowsHtml = '';
    this.history.forEach((item) => {
      const statusClass = item.isCorrect ? 'correct' : 'wrong';
      const statusText = item.isCorrect ? '✅ 答對' : '❌ 答錯';

      rowsHtml += `
        <tr>
          <td>#${item.index}</td>
          <td><strong>${item.formula}</strong></td>
          <td>${item.userAnswer}</td>
          <td style="color: #2b8a3e; font-weight: 700;">${item.correctAnswer}</td>
          <td><span class="status-tag ${statusClass}">${statusText}</span></td>
        </tr>
      `;
    });

    this.historyTableBody.innerHTML = rowsHtml;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.mathApp = new MathApp();
  });
} else {
  window.mathApp = new MathApp();
}
