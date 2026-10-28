/**
 * animation.js - Flash-like Interactive Math Teaching Animation Engine
 * Suitable for Kindergarten (大班) to Lower Elementary
 * Demonstrates 2-item addition and subtraction with numbers <= 10
 */

class FlashMathAnimator {
  constructor() {
    this.stage = document.getElementById('stageCanvasContainer');
    this.formulaBanner = document.getElementById('stageFormulaBanner');
    this.narratorText = document.getElementById('narratorText');
    this.btnPlayPause = document.getElementById('btnAnimPlayPause');
    this.themeSelect = document.getElementById('themeSelect');
    this.speedButtons = document.querySelectorAll('.btn-speed');

    this.currentProblem = null; // { num1, num2, op, result }
    this.currentStep = 0;
    this.totalSteps = 4;
    this.isPlaying = false;
    this.speedMultiplier = 1.0;
    this.timer = null;
    this.speechEnabled = true;

    // Theme assets
    this.themes = {
      apples: { icon: '🍎', name: '蘋果', color: '#ff6b6b' },
      stars: { icon: '⭐', name: '星星', color: '#ffd43b' },
      candies: { icon: '🍬', name: '糖果', color: '#ff922b' },
      basketball: { icon: '🏀', name: '籃球', color: '#fd7e14' },
      bears: { icon: '🏀', name: '籃球', color: '#fd7e14' }
    };
    this.currentTheme = 'apples';

    this.initAudio();
    this.bindEvents();
  }

  initAudio() {
    this.audioCtx = null;
    this.soundMuted = false;
    this.voices = [];
    this.hasUserInteracted = false;
    this._resumeInterval = null;
    this.initVoices();
    this.setupUserUnlock();
  }

  // Pre-load and listen for available system TTS voices (Android Chrome loads voices asynchronously)
  initVoices() {
    if ('speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices() || [];
      window.speechSynthesis.onvoiceschanged = () => {
        this.voices = window.speechSynthesis.getVoices() || [];
      };
    }
  }

  // Setup user gesture unlock on first touch/click (Crucial for Android Chrome & Sony Xperia)
  setupUserUnlock() {
    const unlock = () => {
      this.hasUserInteracted = true;
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.resume();
        if (!this.voices || this.voices.length === 0) {
          this.voices = window.speechSynthesis.getVoices() || [];
        }
      }
      ['click', 'touchstart', 'touchend', 'keydown'].forEach(evt => {
        document.removeEventListener(evt, unlock, true);
      });
    };
    ['click', 'touchstart', 'touchend', 'keydown'].forEach(evt => {
      document.addEventListener(evt, unlock, { capture: true, once: false });
    });
  }

  // Find best matching Traditional Chinese / Mandarin voice across Android (Google Speech Services), iOS, and PC
  getChineseVoice() {
    if (!this.voices || this.voices.length === 0) {
      if ('speechSynthesis' in window) {
        this.voices = window.speechSynthesis.getVoices() || [];
      }
    }
    const list = this.voices || [];
    if (list.length === 0) return null;

    // 1. Exact or common Taiwan / Traditional Chinese tags (Android uses cmn-Hant-TW or cmn-TW; iOS/PC uses zh-TW)
    let v = list.find(voice => /^(zh[-_]TW|cmn[-_]Hant[-_]TW|cmn[-_]TW)$/i.test(voice.lang));
    if (v) return v;

    // 2. Any voice mentioning Taiwan or TW in name or language
    v = list.find(voice => /TW|Taiwan/i.test((voice.lang || '') + ' ' + (voice.name || '')));
    if (v) return v;

    // 3. Hong Kong / Cantonese as fallback Chinese
    v = list.find(voice => /^(zh[-_]HK|yue[-_]Hant[-_]HK)$/i.test(voice.lang));
    if (v) return v;

    // 4. Any Mandarin / Chinese voice starting with zh or cmn
    v = list.find(voice => /^(zh|cmn)/i.test(voice.lang));
    if (v) return v;

    // 5. Any voice containing "chinese" or "mandarin" in name
    v = list.find(voice => /chinese|mandarin/i.test((voice.name || '') + ' ' + (voice.lang || '')));
    return v || null;
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Play synthesized retro Flash-like sound effects
  playSound(type) {
    if (this.soundMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'pop') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'woosh') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'ding') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'fanfare') {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
        notes.forEach((freq, idx) => {
          const noteOsc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          noteOsc.connect(noteGain);
          noteGain.connect(ctx.destination);
          const start = now + idx * 0.12;
          noteOsc.frequency.setValueAtTime(freq, start);
          noteGain.gain.setValueAtTime(0.2, start);
          noteGain.gain.exponentialRampToValueAtTime(0.01, start + 0.35);
          noteOsc.start(start);
          noteOsc.stop(start + 0.35);
        });
      }
    } catch (e) {
      console.warn('Audio playback not allowed yet or error:', e);
    }
  }

  speak(text, onEndCallback = null) {
    this.lastSpokenText = text;
    this.lastSpeechCallback = onEndCallback;

    if (!this.speechEnabled || !('speechSynthesis' in window)) {
      // If speech is disabled, fallback to delay proportional to text length
      const fallbackDelay = Math.max(2000, text.length * 150) / this.speedMultiplier;
      this.timer = setTimeout(() => {
        if (onEndCallback) onEndCallback();
      }, fallbackDelay);
      return;
    }

    const performSpeak = () => {
      try {
        // Ensure SpeechSynthesis is active and resumed (Android Chrome often suspends it)
        if ('speechSynthesis' in window) {
          window.speechSynthesis.resume();
        }

        const cleanText = this.formatSpeech(text);
        const utterance = new SpeechSynthesisUtterance(cleanText);

        // Assign matched voice and appropriate language tag
        const zhVoice = this.getChineseVoice();
        if (zhVoice) {
          utterance.voice = zhVoice;
          utterance.lang = zhVoice.lang || 'zh-TW';
        } else {
          utterance.lang = 'zh-TW';
        }

        // Differentiated speech rate for 慢速 vs 1.0x (keep in safe range 0.7~1.0 for Android TTS stability)
        utterance.rate = this.speedMultiplier <= 0.75 ? 0.72 : 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        let called = false;
        const finish = () => {
          if (called) return;
          called = true;
          window.__activeSpeechUtterance = null;
          if (this._resumeInterval) {
            clearInterval(this._resumeInterval);
            this._resumeInterval = null;
          }
          if (onEndCallback) {
            if (this.isPlaying) {
              // Pause slightly after reading before continuing to next step
              this.timer = setTimeout(() => {
                if (this.isPlaying) onEndCallback();
              }, 600 / this.speedMultiplier);
            } else {
              // When not playing (e.g. Step 0 intro narration), call callback immediately
              onEndCallback();
            }
          }
        };

        utterance.onend = finish;
        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis error:', e.error || e);
          // If utterance was intentionally canceled/interrupted by pause button, don't trigger callback
          if (e.error !== 'canceled' && e.error !== 'interrupted') {
            finish();
          }
        };

        // Workaround for Chrome/Android bug: prevent garbage collection of utterance mid-speech
        window.__activeSpeechUtterance = utterance;
        this.currentUtterance = utterance;

        window.speechSynthesis.speak(utterance);

        // Workaround for Chrome/Android bug where long speech pauses or freezes silently
        if (this._resumeInterval) clearInterval(this._resumeInterval);
        this._resumeInterval = setInterval(() => {
          if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
            window.speechSynthesis.resume();
          } else {
            clearInterval(this._resumeInterval);
            this._resumeInterval = null;
          }
        }, 800);

      } catch (e) {
        console.warn('Speech synthesis error in performSpeak:', e);
        if (onEndCallback) onEndCallback();
      }
    };

    // Sony Android & Chrome fix:
    // If speech is currently ongoing, cancel it, but WAIT 60ms before speaking again.
    // In Android Chrome, calling cancel() immediately followed synchronously by speak()
    // causes the native Android TTS binder to cancel the new utterance!
    if ('speechSynthesis' in window && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
      window.speechSynthesis.cancel();
      setTimeout(performSpeak, 60);
    } else {
      performSpeak();
    }
  }

  // Format mathematical symbols to natural spoken Mandarin
  formatSpeech(text) {
    let spoken = text;
    // Remove "喔" from all speech per requirement d
    spoken = spoken.replace(/喔/g, '');
    // Replace operators with Mandarin words
    spoken = spoken.replace(/－|-/g, ' 減 ');
    spoken = spoken.replace(/＋|\+/g, ' 加 ');
    spoken = spoken.replace(/＝|=/g, ' 等於 ');
    // Replace colons with comma for natural speech pause
    spoken = spoken.replace(/[：:]/g, '，');
    // Remove decorative emojis
    spoken = spoken.replace(/[🍎⭐🍬🐻🏀✨🎉❌💪💡📐🎲✏️👉⏮️⏭️▶️⏸️🔄💭]/g, '');

    // In slow mode, add natural breathing pauses to counting numbers
    if (this.speedMultiplier <= 0.75) {
      spoken = spoken.replace(/、/g, '…… ');
      spoken = spoken.replace(/！/g, '！ ');
      spoken = spoken.replace(/？/g, '？ ');
      spoken = spoken.replace(/，/g, '， ');
    }

    // Clean up multiple spaces
    spoken = spoken.replace(/\s+/g, ' ').trim();
    return spoken;
  }

  bindEvents() {
    this.btnPrev = document.getElementById('btnAnimPrev');
    this.btnNext = document.getElementById('btnAnimNext');

    this.btnPlayPause.addEventListener('click', () => {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    });

    const btnRestart = document.getElementById('btnAnimRestart');
    if (btnRestart) {
      btnRestart.addEventListener('click', () => {
        this.hasStepped = false;
        this.reset();
      });
    }

    document.getElementById('btnAnimNext').addEventListener('click', () => {
      this.nextStep();
    });

    document.getElementById('btnAnimPrev').addEventListener('click', () => {
      this.prevStep();
    });

    this.themeSelect.addEventListener('change', (e) => {
      this.currentTheme = e.target.value;
      this.renderCurrentStep();
    });

    this.speedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.speedButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.speedMultiplier = parseFloat(btn.dataset.speed);

        // Immediate feedback: if currently speaking or intro active, re-speak at new speed right away!
        if ('speechSynthesis' in window && this.lastSpokenText) {
          if (window.speechSynthesis.speaking || this.isSpeakingIntro || this.isPlaying) {
            window.speechSynthesis.cancel();
            if (this.timer) {
              clearTimeout(this.timer);
              this.timer = null;
            }
            setTimeout(() => {
              this.speak(this.lastSpokenText, this.lastSpeechCallback);
            }, 80);
          }
        }
      });
    });

    const speechBtn = document.getElementById('btnSpeechToggle');
    if (speechBtn) {
      speechBtn.addEventListener('click', () => {
        this.speechEnabled = !this.speechEnabled;
        const stateEl = document.getElementById('speechState');
        if (stateEl) stateEl.textContent = this.speechEnabled ? '開' : '關';
        if (!this.speechEnabled && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      });
    }
  }

  updateButtonStates() {
    if (!this.btnPrev) this.btnPrev = document.getElementById('btnAnimPrev');
    if (!this.btnPlayPause) this.btnPlayPause = document.getElementById('btnAnimPlayPause');

    // Requirement c: 當播放/唸到第二步時, “上一步”的按鈕才能使用(顏色也跟著恢復)
    // Requirement a: 旁白朗讀時，"上一步"反灰且無法使用
    if (this.currentStep >= 2 && !this.isSpeakingIntro) {
      this.btnPrev.disabled = false;
      this.btnPrev.classList.remove('btn-disabled');
    } else {
      this.btnPrev.disabled = true;
      this.btnPrev.classList.add('btn-disabled');
    }

    // Requirement a & b:
    // 當旁白開始朗讀的時候, “播放動畫”和"上一步"的按鈕要反灰且無法使用.
    // 當旁白朗讀結束後, “播放動畫”的按鈕才能使用(顏色也跟著恢復)
    if (this.isSpeakingIntro) {
      this.btnPlayPause.disabled = true;
      this.btnPlayPause.classList.add('btn-disabled');
    } else {
      this.btnPlayPause.disabled = false;
      this.btnPlayPause.classList.remove('btn-disabled');
    }

    // Requirement e: 當按下”上一步”或”下一步”後, “播放動畫"的文字敘述要變更為”繼續播放”, 直到按”重播"或”換下一題”才回復
    if (!this.isPlaying) {
      if (this.currentStep === 3 && !this.isAnswerRevealed) {
        this.btnPlayPause.textContent = '⏸️ 思考中（請於右側輸入答案）';
        this.btnPlayPause.style.background = 'linear-gradient(135deg, #ffa94d, #fd7e14)';
      } else if (this.currentStep >= this.totalSteps) {
        this.btnPlayPause.textContent = '🔄 重播動畫';
        this.btnPlayPause.style.background = 'linear-gradient(135deg, #20c997, #12b886)';
      } else if (this.hasStepped) {
        this.btnPlayPause.textContent = '▶️ 繼續播放';
        this.btnPlayPause.style.background = 'linear-gradient(135deg, #20c997, #12b886)';
      } else {
        this.btnPlayPause.textContent = '▶️ 播放動畫';
        this.btnPlayPause.style.background = 'linear-gradient(135deg, #20c997, #12b886)';
      }
    } else {
      this.btnPlayPause.textContent = '⏸️ 暫停播放';
      this.btnPlayPause.style.background = 'linear-gradient(135deg, #ffa94d, #fd7e14)';
    }
  }

  loadProblem(num1, num2, op) {
    this.currentProblem = {
      num1: parseInt(num1, 10),
      num2: parseInt(num2, 10),
      op: op, // 'add' or 'sub'
      result: op === 'add' ? (num1 + num2) : (num1 - num2)
    };
    this.totalSteps = 4;
    this.isAnswerRevealed = false;
    this.hasStepped = false;
    this.reset();
  }

  reset() {
    this.pause();
    this.currentStep = 0;
    this.hasStepped = false;
    this.isSpeakingIntro = true;
    this.updateFormulaBanner(false);
    this.updateButtonStates();
    this.executeCurrentStep();
  }

  play() {
    this.hasUserInteracted = true;
    if (this.isSpeakingIntro) return;

    if (this.currentStep === 3 && !this.isAnswerRevealed) {
      this.pause();
      const tip = '👉 請先在右邊輸入答案並點擊「確認送出」，才會公布第 4 步！';
      this.setNarrator(tip);
      this.speak('請先在右邊輸入答案！');
      return;
    }

    if (this.currentStep >= this.totalSteps) {
      this.currentStep = 0;
    }

    // Requirement b: 當旁白朗讀結束後, 此時按下“播放動畫”後, 要直接播放/唸第一步的內容
    if (this.currentStep === 0) {
      this.currentStep = 1;
    }

    this.isPlaying = true;
    this.updateButtonStates();
    this.executeCurrentStep();
  }

  pause() {
    this.isPlaying = false;
    if (this.currentStep > 0) {
      this.hasStepped = true;
    }
    this.updateButtonStates();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    // Requirement b: Stop speech immediately, don't keep playing or re-read!
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  nextStep() {
    if (this.currentStep === 3 && !this.isAnswerRevealed) {
      this.pause();
      const tip = '👉 請先在右邊輸入答案並點擊「確認送出」，才會公布第 4 步！';
      this.setNarrator(tip);
      this.speak('請先在右邊輸入答案！');
      return;
    }

    if (this.currentStep < this.totalSteps) {
      // Requirement e: 當按下”下一步”後, “播放動畫"的文字敘述要變更為”繼續播放”
      this.hasStepped = true;
      this.pause();
      this.currentStep++;
      this.updateButtonStates();
      this.executeCurrentStep();
    }
  }

  prevStep() {
    // Requirement c: 當播放/唸到第二步時, “上一步”的按鈕才能使用
    if (this.currentStep >= 2) {
      // Requirement e: 當按下”上一步”後, “播放動畫"的文字敘述要變更為”繼續播放”
      this.hasStepped = true;
      this.pause();
      this.currentStep--;
      this.updateButtonStates();
      this.executeCurrentStep();
    }
  }

  updateFormulaBanner(showResult = false) {
    if (!this.currentProblem) return;
    const { num1, num2, op, result } = this.currentProblem;
    const opChar = op === 'add' ? '＋' : '－';
    const resText = showResult ? result : '？';
    this.formulaBanner.textContent = `${num1} ${opChar} ${num2} ＝ ${resText}`;
  }

  executeCurrentStep() {
    this.updateButtonStates();
    this.renderCurrentStep();
  }

  onStepFinished() {
    if (!this.isPlaying) return;

    if (this.currentStep === 3) {
      // Step 3 reached & spoken completely -> Force auto pause until student inputs answer on the right
      this.pause();
      this.btnPlayPause.textContent = '⏸️ 思考中（請於右側輸入答案）';
      return;
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.updateButtonStates();
      this.executeCurrentStep();
    } else {
      this.pause();
      this.btnPlayPause.textContent = '🔄 重播動畫';
    }
  }

  unlockAndRevealAnswer() {
    this.isAnswerRevealed = true;
    this.pause();
    this.currentStep = 4;
    this.updateFormulaBanner(true);
    this.updateButtonStates();
    this.executeCurrentStep();
  }

  revealAnswer() {
    this.unlockAndRevealAnswer();
  }

  renderCurrentStep() {
    if (!this.currentProblem) return;

    const { num1, num2, op, result } = this.currentProblem;
    const theme = this.themes[this.currentTheme];

    this.stage.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'anim-stage-content';
    this.stage.appendChild(container);

    if (op === 'add') {
      this.renderAdditionStep(container, num1, num2, result, theme);
    } else {
      this.renderSubtractionStep(container, num1, num2, result, theme);
    }
  }

  // --- Addition Animation Steps ---
  renderAdditionStep(container, num1, num2, result, theme) {
    if (this.currentStep === 0) {
      // Step 0: Initial state - Opening narration
      this.updateFormulaBanner(false);
      const text = `我們要來算：${num1} 加 ${num2} 等於多少呢？準備好了嗎？點選播放一起看！`;
      this.setNarrator(text);
      this.playSound('ding');

      // Requirement a: 旁白朗讀時，“播放動畫”和"上一步"反灰且無法使用
      // 針對手機版 (如 Android/Sony)：若尚未有使用者手勢觸發，先不鎖定按鈕，等待使用者點擊播放以解鎖語音
      if (!this.hasUserInteracted) {
        this.isSpeakingIntro = false;
        this.updateButtonStates();
      } else {
        this.isSpeakingIntro = true;
        this.updateButtonStates();

        this.speak(text, () => {
          // Requirement b: 旁白朗讀結束後，“播放動畫”按鈕才能使用(顏色恢復)
          this.isSpeakingIntro = false;
          this.updateButtonStates();
        });
      }

      const previewBox = document.createElement('div');
      previewBox.innerHTML = `
        <div style="font-size: 2.2rem; font-weight: 900; color: #1864ab; text-align: center;">
          ${theme.icon} ${num1} 個 ＋ ${theme.icon} ${num2} 個 ＝ ？
        </div>
      `;
      container.appendChild(previewBox);

    } else if (this.currentStep === 1) {
      // Step 1: Group 1 appears
      this.updateFormulaBanner(false);
      const countList = Array.from({length: num1}, (_, i) => i + 1);
      const countStr = num1 === 0 ? '0 顆' : countList.join('、');
      const text = `第一步：先拿出 ${num1} 顆${theme.name}！我們來數：${countStr}！`;
      this.setNarrator(text);
      this.speak(text, () => this.onStepFinished());

      const group1 = this.createItemGroup(num1, theme.icon, 1, 'appear');
      container.appendChild(group1);

      this.staggerPopSound(num1);

    } else if (this.currentStep === 2) {
      // Step 2: Show addition and second group
      this.updateFormulaBanner(false);
      const text = `第二步：加上 ${num2} 顆${theme.name}！又來了 ${num2} 顆！`;
      this.setNarrator(text);
      this.speak(text, () => this.onStepFinished());

      const group1 = this.createItemGroup(num1, theme.icon, 1);
      const opEl = document.createElement('div');
      opEl.className = 'anim-operator';
      opEl.textContent = '＋';
      const group2 = this.createItemGroup(num2, theme.icon, 1, 'appear');

      container.appendChild(group1);
      container.appendChild(opEl);
      container.appendChild(group2);

      this.playSound('ding');
      this.staggerPopSound(num2);

    } else if (this.currentStep === 3) {
      // Step 3: Question step - Do NOT reveal result
      this.updateFormulaBanner(false);
      const text = `第三步：${num1} 加 ${num2} 合在一起總共有幾個呢？請數一數，也可以在右邊輸入答案！`;
      this.setNarrator(text);
      // Spoken text is 100% identical to UI narrator text
      this.speak(text, () => this.onStepFinished());

      const uncountedGroup = this.createUncountedItemGroup(result, theme.icon);
      container.appendChild(uncountedGroup);

      const hintEl = document.createElement('div');
      hintEl.style.cssText = 'width: 100%; text-align: center; font-size: 1.15rem; font-weight: 700; color: #1864ab; margin-top: 8px;';
      hintEl.textContent = '💭 數數看合在一起總共有幾個？請在右邊輸入答案！';
      container.appendChild(hintEl);

      this.playSound('ding');

    } else if (this.currentStep === 4) {
      // Step 4: Announce Answer!
      this.updateFormulaBanner(true);
      const text = `第四步：公布答案！一共有 ${result} 個！${num1} 加 ${num2} 等於 ${result}！🎉`;
      this.setNarrator(text);
      this.speak(text, () => this.onStepFinished());

      const combinedGroup = this.createItemGroup(result, theme.icon, 1);
      container.appendChild(combinedGroup);

      this.playSound('fanfare');
    }
  }

  // --- Subtraction Animation Steps ---
  renderSubtractionStep(container, num1, num2, result, theme) {
    if (this.currentStep === 0) {
      // Step 0: Initial state - Opening narration
      this.updateFormulaBanner(false);
      const text = `我們要來算：${num1} 減 ${num2} 等於多少呢？看減法是怎麼變少的！`;
      this.setNarrator(text);
      this.playSound('ding');

      // Requirement a: 旁白朗讀時，“播放動畫”和"上一步"反灰且無法使用
      // 針對手機版 (如 Android/Sony)：若尚未有使用者手勢觸發，先不鎖定按鈕，等待使用者點擊播放以解鎖語音
      if (!this.hasUserInteracted) {
        this.isSpeakingIntro = false;
        this.updateButtonStates();
      } else {
        this.isSpeakingIntro = true;
        this.updateButtonStates();

        this.speak(text, () => {
          // Requirement b: 旁白朗讀結束後，“播放動畫”按鈕才能使用(顏色恢復)
          this.isSpeakingIntro = false;
          this.updateButtonStates();
        });
      }

      const previewBox = document.createElement('div');
      previewBox.innerHTML = `
        <div style="font-size: 2.2rem; font-weight: 900; color: #d9480f; text-align: center;">
          原本有 ${theme.icon} ${num1} 個，要拿走 ${num2} 個，還剩多少呢？
        </div>
      `;
      container.appendChild(previewBox);

    } else if (this.currentStep === 1) {
      // Step 1: Initial full group
      this.updateFormulaBanner(false);
      const countList = Array.from({length: num1}, (_, i) => i + 1);
      const countStr = num1 === 0 ? '0 顆' : countList.join('、');
      const text = `第一步：原本一共有 ${num1} 顆${theme.name}！我們來數：${countStr}！`;
      this.setNarrator(text);
      this.speak(text, () => this.onStepFinished());

      const group = this.createItemGroup(num1, theme.icon, 1, 'appear');
      container.appendChild(group);

      this.staggerPopSound(num1);

    } else if (this.currentStep === 2) {
      // Step 2: Subtracting - Requirement f: "畫斜線"
      this.updateFormulaBanner(false);
      const text = `第二步：減掉 ${num2} 顆！我們把 ${num2} 顆拿走畫斜線！`;
      this.setNarrator(text);
      this.speak(text, () => this.onStepFinished());

      const group = document.createElement('div');
      group.className = 'anim-group';

      const remainCount = num1 - num2;
      for (let i = 1; i <= num1; i++) {
        const item = document.createElement('div');
        item.className = 'anim-item';
        item.textContent = theme.icon;

        const badge = document.createElement('span');
        badge.className = 'item-badge';
        badge.textContent = i;
        item.appendChild(badge);

        if (i > remainCount) {
          item.classList.add('crossed-out');
        }
        group.appendChild(item);
      }
      container.appendChild(group);

      this.playSound('woosh');

    } else if (this.currentStep === 3) {
      // Step 3: Question step - Split per request: "8減5剩下幾個?" (No result shown or spoken)
      this.updateFormulaBanner(false);
      const text = `第三步：${num1} 減 ${num2} 剩下幾個呢？請數一數，也可以在右邊輸入答案！`;
      this.setNarrator(text);
      // Spoken text is 100% identical to UI narrator text
      this.speak(text, () => this.onStepFinished());

      const uncountedGroup = this.createUncountedItemGroup(result, theme.icon);
      container.appendChild(uncountedGroup);

      const hintEl = document.createElement('div');
      hintEl.style.cssText = 'width: 100%; text-align: center; font-size: 1.15rem; font-weight: 700; color: #d9480f; margin-top: 8px;';
      hintEl.textContent = `💭 數數看剩下幾個？請在右邊輸入答案！`;
      container.appendChild(hintEl);

      this.playSound('ding');

    } else if (this.currentStep === 4) {
      // Step 4: Announce Answer per request: "公布答案: 剩下3個 ... 8減5等於3"
      this.updateFormulaBanner(true);
      const text = `第四步：公布答案！剩下 ${result} 個！${num1} 減 ${num2} 等於 ${result}！🎉`;
      this.setNarrator(text);
      this.speak(text, () => this.onStepFinished());

      const group = document.createElement('div');
      group.className = 'anim-group';
      for (let i = 1; i <= result; i++) {
        const item = document.createElement('div');
        item.className = 'anim-item highlight-count';
        item.textContent = theme.icon;
        const badge = document.createElement('span');
        badge.className = 'item-badge';
        badge.textContent = i;
        item.appendChild(badge);
        group.appendChild(item);
      }

      if (result === 0) {
        const zeroMsg = document.createElement('div');
        zeroMsg.style.fontSize = '1.8rem';
        zeroMsg.style.fontWeight = '900';
        zeroMsg.style.color = '#e03131';
        zeroMsg.textContent = '全部都拿走了，剩下 0 個！';
        group.appendChild(zeroMsg);
      }

      container.appendChild(group);
      this.playSound('fanfare');
    }
  }

  // Create items with '?' badges for thinking/question step without revealing count
  createUncountedItemGroup(count, icon) {
    const group = document.createElement('div');
    group.className = 'anim-group';

    if (count === 0) {
      const zeroEl = document.createElement('div');
      zeroEl.style.fontSize = '1.3rem';
      zeroEl.style.fontWeight = '700';
      zeroEl.style.color = '#868e96';
      zeroEl.textContent = '？ 顆 (空)';
      group.appendChild(zeroEl);
      return group;
    }

    for (let i = 0; i < count; i++) {
      const item = document.createElement('div');
      item.className = 'anim-item highlight-count';
      item.textContent = icon;

      const badge = document.createElement('span');
      badge.className = 'item-badge';
      badge.style.background = '#4dabf7';
      badge.textContent = '?';
      item.appendChild(badge);

      group.appendChild(item);
    }
    return group;
  }

  revealAnswer() {
    this.goToStep(4);
  }

  goToStep(step) {
    this.pause();
    this.currentStep = Math.min(step, this.totalSteps);
    this.renderCurrentStep();
  }

  createItemGroup(count, icon, startIdx = 1, extraClass = '') {
    const group = document.createElement('div');
    group.className = 'anim-group';

    if (count === 0) {
      const zeroEl = document.createElement('div');
      zeroEl.style.fontSize = '1.3rem';
      zeroEl.style.fontWeight = '700';
      zeroEl.style.color = '#868e96';
      zeroEl.textContent = '0 顆 (空)';
      group.appendChild(zeroEl);
      return group;
    }

    for (let i = 0; i < count; i++) {
      const item = document.createElement('div');
      item.className = `anim-item ${extraClass}`;
      item.textContent = icon;

      const badge = document.createElement('span');
      badge.className = 'item-badge';
      badge.textContent = startIdx + i;
      item.appendChild(badge);

      group.appendChild(item);
    }
    return group;
  }

  setNarrator(text) {
    this.narratorText.textContent = text;
  }

  staggerPopSound(count) {
    if (this.soundMuted || count <= 0) return;
    const interval = 120 / this.speedMultiplier;
    for (let i = 0; i < Math.min(count, 10); i++) {
      setTimeout(() => {
        this.playSound('pop');
      }, i * interval);
    }
  }

  staggerDingSound(count) {
    if (this.soundMuted || count <= 0) return;
    const interval = 150 / this.speedMultiplier;
    for (let i = 0; i < Math.min(count, 10); i++) {
      setTimeout(() => {
        this.playSound('ding');
      }, i * interval);
    }
  }
}

// Global instance initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.flashAnimator) {
      window.flashAnimator = new FlashMathAnimator();
    }
  });
} else {
  if (!window.flashAnimator) {
    window.flashAnimator = new FlashMathAnimator();
  }
}
