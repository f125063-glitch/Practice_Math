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
      digits: 1,        // Default: 1 digit (e.g. 8 - 5, 9 - 2)
      mode: 'auto'      // Default: auto generate ('auto' or 'manual')
    };

    // Current Problem State
    this.currentProblem = {
      numbers: [8, 5],
      operation: 'sub',
      correctAnswer: 3,
      isAnimationEligible: true
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

    // Voice Input Elements & State
    this.btnVoiceInput = document.getElementById('btnVoiceInput');
    this.voiceStatusTip = document.getElementById('voiceStatusTip');
    this.recognition = null;
    this.isRecognizing = false;
    this._voiceTipTimer = null;
    this.micPermissionGranted = false;
    this.micPermissionRequested = false;

    this.bindEvents();
    this.init();
  }

  init() {
    // Proactively request and pre-authorize microphone permission by default directly
    this.requestDirectMicrophonePermission();
    this.setupDirectMicUnlock();

    // Render initial problem (Default: 2 numbers, 1 digit, subtraction, auto)
    this.generateNewProblem();
    this.updateKeyboardVisibility();
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
    this.userAnswerInput.addEventListener('focus', () => {
      this.updateKeyboardVisibility();
    });
    this.userAnswerInput.addEventListener('input', () => {
      this.userAnswerInput.value = this.userAnswerInput.value.replace(/[^\d\-]/g, '');
    });

    // Voice recognition answer input
    if (this.btnVoiceInput) {
      this.btnVoiceInput.addEventListener('click', () => {
        if (this.isRecognizing) {
          this.stopVoiceRecognition();
        } else {
          this.startVoiceRecognition();
        }
      });
    }

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
    this.updateKeyboardVisibility();
  }

  updateKeyboardVisibility() {
    const isManual = (this.config.mode === 'manual');
    const virtualNumpad = document.querySelector('.virtual-numpad');

    // Ensure answer input has inputmode="none" so mobile OS virtual keyboard is never shown
    if (this.userAnswerInput) {
      this.userAnswerInput.setAttribute('inputmode', 'none');
    }

    if (isManual) {
      document.body.classList.add('mode-manual');
      // In manual mode, do not show any keyboard interface (hide virtual numpad)
      if (virtualNumpad) {
        virtualNumpad.style.display = 'none';
      }
    } else {
      document.body.classList.remove('mode-manual');
      // In auto mode, virtual numpad is visible for on-screen number clicks
      if (virtualNumpad) {
        virtualNumpad.style.display = 'grid';
      }
    }
  }

  // ==========================================
  // Direct Microphone Permission Authorization
  // ==========================================
  async requestDirectMicrophonePermission() {
    if (this.micPermissionGranted || this.micPermissionRequested) return;
    this.micPermissionRequested = true;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.log('navigator.mediaDevices.getUserMedia is not available in current context (e.g. file:// or non-secure origin)');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.micPermissionGranted = true;
      // Immediately stop all tracks to avoid keeping the mic recording active in background
      stream.getTracks().forEach(track => track.stop());
      console.log('Microphone permission pre-authorized directly by default.');
    } catch (err) {
      console.warn('Direct microphone permission prompt result:', err.name, err.message);
      // Allow retry on user gesture if browser blocked unprompted request
      this.micPermissionRequested = false;
    }
  }

  setupDirectMicUnlock() {
    const unlockDirectMic = () => {
      if (!this.micPermissionGranted) {
        this.requestDirectMicrophonePermission();
      }
      ['click', 'touchstart', 'touchend', 'keydown'].forEach(evt => {
        document.removeEventListener(evt, unlockDirectMic, true);
      });
    };
    ['click', 'touchstart', 'touchend', 'keydown'].forEach(evt => {
      document.addEventListener(evt, unlockDirectMic, { capture: true, once: false });
    });

    if (navigator.permissions && navigator.permissions.query) {
      try {
        navigator.permissions.query({ name: 'microphone' }).then(status => {
          if (status.state === 'prompt') {
            this.requestDirectMicrophonePermission();
          } else if (status.state === 'granted') {
            this.micPermissionGranted = true;
          }
          status.onchange = () => {
            if (status.state === 'granted') {
              this.micPermissionGranted = true;
            }
          };
        }).catch(() => {});
      } catch (e) {}
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
        if (!confirm(`提示：目前設定的第一個數字 (${numbers[0]}) 小於後面數字的總和 (${sumOfRest})，結果會小於 0！國小數學通常建議大減小，確定要出這題嗎？`)) {
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
    if (this.isRecognizing) {
      this.stopVoiceRecognition();
    }
    if (this.voiceStatusTip) {
      this.voiceStatusTip.style.display = 'none';
    }

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
    this.updateKeyboardVisibility();
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
            note = `<p style="margin-top: 10px; font-size: 0.9rem; color: #e03131; text-align: center;">💡 個位數相加 ${d1} ＋ ${d2} ＝ ${d1 + d2}，滿十要向前一位（十位）進 1！</p>`;
          }
        } else {
          const d1 = numbers[0] % 10;
          const d2 = numbers[1] % 10;
          if (d1 < d2) {
            note = `<p style="margin-top: 10px; font-size: 0.9rem; color: #e03131; text-align: center;">💡 個位數 ${d1} 不夠減 ${d2}，需要向十位數借 1 當作 10！</p>`;
          }
        }
      } else {
        note = `<p style="margin-top: 10px; font-size: 0.88rem; color: #868e96; text-align: center;">💭 請先動動腦輸入答案，送出後會揭曉直式運算提示！</p>`;
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

  // ==========================================
  // Voice Recognition (語音辨識輸入答案)
  // ==========================================
  startVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.showVoiceStatus('⚠️ 您的瀏覽器不支援語音辨識功能，請直接使用虛擬數字鍵盤輸入！', 'warn', 4000);
      return;
    }

    try {
      if (this.recognition) {
        try { this.recognition.abort(); } catch (e) {}
      }

      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'zh-TW';
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 10;

      // Add speech grammar hint for numbers 0~10 if supported
      const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
      if (SpeechGrammarList) {
        try {
          const grammarList = new SpeechGrammarList();
          const grammar = '#JSGF V1.0; grammar numbers; public <number> = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 零 | 一 | 二 | 兩 | 三 | 四 | 五 | 六 | 七 | 八 | 九 | 十 | 等於 | 答案是 ;';
          grammarList.addFromString(grammar, 1);
          this.recognition.grammars = grammarList;
        } catch (e) {}
      }

      this.recognition.onstart = () => {
        this.isRecognizing = true;
        if (this.btnVoiceInput) {
          this.btnVoiceInput.classList.add('listening');
          this.btnVoiceInput.innerHTML = `<span class="voice-mic-icon">🔴</span><span class="voice-btn-text">聆聽中...</span>`;
        }
        this.showVoiceStatus('🎙️ 正在聆聽中... 請說出你的答案（例如：「3」、「等於五」）', 'info', 0);
      };

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        const candidates = [];

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            if (res[0] && res[0].transcript) {
              finalTranscript += res[0].transcript;
            }
            for (let j = 0; j < res.length; j++) {
              if (res[j] && res[j].transcript) {
                candidates.push(res[j].transcript.trim());
              }
            }
          } else {
            interimTranscript += res[0].transcript;
          }
        }

        if (interimTranscript) {
          this.showVoiceStatus(`🎙️ 聽到：「${interimTranscript}」...`, 'info', 0);
        }

        if (finalTranscript || candidates.length > 0) {
          if (finalTranscript && !candidates.includes(finalTranscript.trim())) {
            candidates.unshift(finalTranscript.trim());
          }

          const resolved = this.resolveBestSpokenAnswer(candidates);

          if (resolved !== null) {
            const parsedNum = resolved.number;
            const matchedText = resolved.transcript || finalTranscript;
            this.userAnswerInput.value = parsedNum;
            this.showVoiceStatus(`✅ 辨識成功：「${matchedText}」➔ 答案 ${parsedNum}！正在檢查...`, 'success', 2500);
            if (window.flashAnimator && window.flashAnimator.playSound) {
              window.flashAnimator.playSound('pop');
            }
            // Auto submit answer after a short pause so student sees the confirmed answer
            setTimeout(() => {
              this.checkAnswer();
            }, 500);
          } else {
            this.showVoiceStatus(`🤔 聽到「${finalTranscript || candidates[0]}」，未辨識出有效數字，請再試一次～`, 'warn', 3000);
          }
        }
      };

      this.recognition.onerror = (event) => {
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed') {
          this.showVoiceStatus('⚠️ 請允許瀏覽器存取麥克風權限才能語音答題喔！', 'error', 4500);
        } else if (event.error === 'no-speech') {
          this.showVoiceStatus('💭 沒有偵測到聲音，請點擊按鈕再試一次！', 'warn', 2500);
        } else if (event.error !== 'aborted') {
          this.showVoiceStatus(`⚠️ 辨識發生問題 (${event.error})，請再試一次`, 'warn', 2500);
        }
      };

      this.recognition.onend = () => {
        this.isRecognizing = false;
        if (this.btnVoiceInput) {
          this.btnVoiceInput.classList.remove('listening');
          this.btnVoiceInput.innerHTML = `<span class="voice-mic-icon">🎙️</span><span class="voice-btn-text">語音答題</span>`;
        }
      };

      this.recognition.start();
    } catch (e) {
      console.warn('SpeechRecognition start failed:', e);
      this.isRecognizing = false;
      if (this.btnVoiceInput) {
        this.btnVoiceInput.classList.remove('listening');
        this.btnVoiceInput.innerHTML = `<span class="voice-mic-icon">🎙️</span><span class="voice-btn-text">語音答題</span>`;
      }
    }
  }

  stopVoiceRecognition() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    this.isRecognizing = false;
    if (this.btnVoiceInput) {
      this.btnVoiceInput.classList.remove('listening');
      this.btnVoiceInput.innerHTML = `<span class="voice-mic-icon">🎙️</span><span class="voice-btn-text">語音答題</span>`;
    }
  }

  showVoiceStatus(message, type = 'info', autoHideDuration = 3000) {
    if (!this.voiceStatusTip) return;
    this.voiceStatusTip.textContent = message;
    this.voiceStatusTip.className = `voice-status-tip ${type}`;
    this.voiceStatusTip.style.display = 'block';

    if (this._voiceTipTimer) {
      clearTimeout(this._voiceTipTimer);
      this._voiceTipTimer = null;
    }

    if (autoHideDuration > 0) {
      this._voiceTipTimer = setTimeout(() => {
        if (this.voiceStatusTip) {
          this.voiceStatusTip.style.display = 'none';
        }
      }, autoHideDuration);
    }
  }

  // Homophones and near-homophones (especially 捲舌/不捲舌, zh/ch/sh vs z/c/s, Taiwan Mandarin accents)
  getHomophonesMap() {
    return {
      // 0: 零 (líng)
      '0': 0, '零': 0, '〇': 0, '○': 0, '林': 0, '菱': 0, '鈴': 0, '玲': 0, '鄰': 0, '邻': 0, '靈': 0, '灵': 0, '霖': 0, '凌': 0, '陵': 0, '領': 0, '领': 0, '令': 0, '另': 0,

      // 1: 一 (yī), 么 (yāo)
      '1': 1, '一': 1, '壹': 1, '么': 1, '依': 1, '醫': 1, '医': 1, '衣': 1, '伊': 1, '姨': 1, '移': 1, '儀': 1, '仪': 1, '疑': 1, '已': 1, '以': 1, '意': 1, '易': 1, '億': 1, '亿': 1, '亦': 1, '異': 1, '异': 1, '益': 1, '譯': 1, '译': 1, '逸': 1, '翼': 1, '妖': 1, '腰': 1,

      // 2: 二 (èr), 兩 (liǎng)
      '2': 2, '二': 2, '貳': 2, '贰': 2, '兩': 2, '两': 2, '兒': 2, '儿': 2, 'ㄦ': 2, '而': 2, '耳': 2, '餌': 2, '饵': 2, '餓': 2, '饿': 2, '惡': 2, '恶': 2, '俄': 2, '鵝': 2, '鹅': 2, '亮': 2, '輛': 2, '辆': 2, '量': 2, '涼': 2, '凉': 2,

      // 3: 三 (sān) - 捲舌/不捲舌: 山 (shān - user specified), 衫, 珊, 杉, 扇, 散, 傘, 參, 叁
      '3': 3, '三': 3, '參': 3, '参': 3, '叁': 3, '山': 3, '衫': 3, '珊': 3, '杉': 3, '扇': 3, '散': 3, '傘': 3, '伞': 3, '刪': 3, '删': 3, '姍': 3, '姗': 3, '煽': 3, '桑': 3, '傷': 3, '伤': 3, '商': 3,

      // 4: 四 (sì) - 捲舌/不捲舌: 是 (shì - user specified), 事, 市, 士, 世, 式, 視, 室, 試, 寺, 似, 肆, 賜, 死, 司, 思, 私, 斯
      '4': 4, '四': 4, '肆': 4, '是': 4, '事': 4, '市': 4, '士': 4, '世': 4, '式': 4, '視': 4, '视': 4, '室': 4, '試': 4, '试': 4, '寺': 4, '似': 4, '賜': 4, '赐': 4, '死': 4, '司': 4, '思': 4, '私': 4, '斯': 4, '絲': 4, '丝': 4, '飼': 4, '饲': 4, '刺': 4, '伺': 4,

      // 5: 五 (wǔ)
      '5': 5, '五': 5, '伍': 5, '武': 5, '午': 5, '舞': 5, '屋': 5, '烏': 5, '乌': 5, '物': 5, '誤': 5, '误': 5, '霧': 5, '雾': 5, '悟': 5, '無': 5, '无': 5, '吳': 5, '吴': 5, '侮': 5,

      // 6: 六 (liù)
      '6': 6, '六': 6, '陸': 6, '陆': 6, '溜': 6, '流': 6, '留': 6, '柳': 6, '樓': 6, '楼': 6, '露': 6, '路': 6, '綠': 6, '绿': 6, '碌': 6, '劉': 6, '刘': 6,

      // 7: 七 (qī)
      '7': 7, '七': 7, '柒': 7, '漆': 7, '期': 7, '妻': 7, '欺': 7, '奇': 7, '騎': 7, '骑': 7, '乞': 7, '氣': 7, '气': 7, '器': 7, '起': 7, '企': 7, '凄': 7, '淒': 7,

      // 8: 八 (bā)
      '8': 8, '八': 8, '捌': 8, '吧': 8, '爸': 8, '巴': 8, '拔': 8, '把': 8, '霸': 8, '芭': 8, '靶': 8, '發': 8, '发': 8,

      // 9: 九 (jiǔ)
      '9': 9, '九': 9, '玖': 9, '酒': 9, '久': 9, '韭': 9, '舅': 9, '就': 9, '救': 9, '舊': 9, '旧': 9, '糾': 9, '纠': 9,

      // 10: 十 (shí)
      '10': 10, '十': 10, '拾': 10, '石': 10, '時': 10, '时': 10, '食': 10, '實': 10, '实': 10, '識': 10, '识': 10, '什': 10, '史': 10, '使': 10, '始': 10
    };
  }

  // Parse candidate string with priority (1: Arabic 0~10, 1.5: standard Chinese 0~10, 2: Arabic >10, 2.5: Chinese >10, 3: homophones)
  parseCandidateWithPriority(text) {
    if (!text) return null;
    let raw = text.trim();
    let isNegative = false;
    if (/^(負|负|-)/.test(raw)) {
      isNegative = true;
      raw = raw.replace(/^(負|负|-)/, '').trim();
    }

    // Check 1: Direct Arabic numeral match (0~10 priority)
    const digitMatch = raw.match(/\d+/);
    if (digitMatch) {
      const val = parseInt(digitMatch[0], 10);
      const num = isNegative ? -val : val;
      // Requirement 1: Priority 1 if in 0~10 range, Priority 2 for other numbers
      const priority = (val >= 0 && val <= 10) ? 1 : 2;
      return { number: num, priority: priority };
    }

    let cleaned = raw;

    // Suffixes first: remove particles like 啦, 顆, 個, etc.
    cleaned = cleaned.replace(/(顆|个|個|隻|把|條|點|啦|呢|喔|啊|吧|！|。|\.)$/g, '').trim();

    // Prefixes with lookahead:
    // If phrase ends with '是', only strip '是' if there is content after it!
    const prefixPattern = /^(答案等於|答案為|答案是(?=.)|算出來等於|算出來是(?=.)|算出來|我覺得等於|我覺得是(?=.)|我覺得|我想等於|我想是(?=.)|我想|我猜等於|我猜是(?=.)|我猜|應該等於|應該是(?=.)|應該|結果等於|結果是(?=.)|結果|就是等於|就是|等於是(?=.)|等於|等于|答案)/;
    cleaned = cleaned.replace(prefixPattern, '').trim();

    // If "是" is followed by any character (and not alone), strip "是" as copula verb "is"
    cleaned = cleaned.replace(/^是(?=.)/, '').trim();

    // Check 2: Exact single standard Chinese digit
    const stdCnDigits = {
      '零': 0, '〇': 0, '○': 0, '0': 0,
      '一': 1, '壹': 1, '么': 1, '1': 1,
      '二': 2, '貳': 2, '兩': 2, '两': 2, '2': 2,
      '三': 3, '參': 3, '叁': 3, '3': 3,
      '四': 4, '肆': 4, '4': 4,
      '五': 5, '伍': 5, '5': 5,
      '六': 6, '陸': 6, '6': 6,
      '七': 7, '柒': 7, '7': 7,
      '八': 8, '捌': 8, '8': 8,
      '九': 9, '玖': 9, '9': 9,
      '十': 10, '拾': 10, '10': 10
    };

    if (stdCnDigits[cleaned] !== undefined) {
      const val = stdCnDigits[cleaned];
      return { number: isNegative ? -val : val, priority: 1.5 };
    }

    // Check 3: Standard multi-digit Chinese numbers (e.g. 十一 -> 11, 二十三 -> 23)
    if (/[百十]/.test(cleaned) || cleaned.length >= 2) {
      let total = 0;
      let hasMatched = false;
      let s = cleaned;

      const baiMatch = s.match(/([零一二兩两三四五六七八九])百/);
      if (baiMatch) {
        total += (stdCnDigits[baiMatch[1]] || 0) * 100;
        hasMatched = true;
        s = s.replace(/.*百/, '');
      }

      const shiMatch = s.match(/([零一二兩两三四五六七八九])?十/);
      if (shiMatch) {
        const mul = shiMatch[1] ? (stdCnDigits[shiMatch[1]] || 1) : 1;
        total += mul * 10;
        hasMatched = true;
        s = s.replace(/.*十/, '');
      }

      s = s.replace(/[零〇○O0o]/g, '');
      const unitMatch = s.match(/([一二兩两三四五六七八九])/);
      if (unitMatch) {
        total += stdCnDigits[unitMatch[1]] || 0;
        hasMatched = true;
      }

      if (hasMatched) {
        return { number: isNegative ? -total : total, priority: 2.5 };
      }
    }

    // Check 4: Homophone / near-homophone matching for 0~10 (e.g. 是->4, 山->3, 石->10, etc.)
    const homophones = this.getHomophonesMap();
    if (homophones[cleaned] !== undefined) {
      const val = homophones[cleaned];
      return { number: isNegative ? -val : val, priority: 3 };
    }

    // Check 5: Look for any homophone character contained in cleaned if short phrase
    for (let char of cleaned) {
      if (homophones[char] !== undefined) {
        const val = homophones[char];
        return { number: isNegative ? -val : val, priority: 4 };
      }
    }

    return null;
  }

  // Resolves the best answer among all recognition alternatives (prioritizing 0~10)
  resolveBestSpokenAnswer(candidates) {
    if (!candidates || candidates.length === 0) return null;

    let bestMatch = null;
    let bestPriority = 999;
    let bestTranscript = candidates[0];

    for (const text of candidates) {
      const res = this.parseCandidateWithPriority(text);
      if (res !== null && res.priority < bestPriority) {
        bestPriority = res.priority;
        bestMatch = res.number;
        bestTranscript = text;
        // Priority 1 is top priority (direct Arabic digit 0~10)
        if (bestPriority === 1) break;
      }
    }

    if (bestMatch !== null) {
      return {
        number: bestMatch,
        transcript: bestTranscript
      };
    }
    return null;
  }

  // Parse spoken Traditional Chinese / Mandarin phrases and numbers to integer
  parseSpokenAnswer(text) {
    const res = this.resolveBestSpokenAnswer([text]);
    return res ? res.number : null;
  }

  checkAnswer() {
    const valText = this.userAnswerInput.value.trim();
    if (valText === '') {
      alert('請先輸入你的答案！');
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
      this.feedbackDesc.textContent = `正確答案是：${formulaStr}。點選下方「查看直式算則解析」可以看解題提示！`;
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
        <tr class="empty-row"><td colspan="5">尚未開始練習，送出答案後會記錄在這裡！</td></tr>
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
