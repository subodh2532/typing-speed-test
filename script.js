const TEST_DURATION = 60;
const RESULTS_LIMIT = 5;
const STORAGE_KEYS = {
  results: "typing-test-results",
  streak: "typing-test-streak",
  soundEnabled: "typing-test-sound",
  theme: "typing-test-theme"
};

const paragraphs = [
  { id: 1, difficulty: "easy", text: "Small daily habits often create the biggest improvements over time, especially when practice feels simple enough to repeat." },
  { id: 2, difficulty: "easy", text: "Reading clear words aloud can improve typing rhythm because your hands begin to follow a steady pattern." },
  { id: 3, difficulty: "easy", text: "A calm posture, relaxed shoulders, and light key presses usually lead to better endurance during a speed test." },
  { id: 4, difficulty: "easy", text: "Simple exercises done consistently can sharpen focus and make each session feel more controlled and less rushed." },
  { id: 5, difficulty: "medium", text: "Designers and developers both benefit from quick iteration, because ideas become useful only after they survive real interaction and feedback." },
  { id: 6, difficulty: "medium", text: "Typing accurately under pressure requires attention to punctuation, spacing, and the discipline to correct mistakes before they multiply." },
  { id: 7, difficulty: "medium", text: "Strong concentration is not about forcing speed at every moment, but about maintaining a reliable tempo from start to finish." },
  { id: 8, difficulty: "medium", text: "The most effective practice routines balance short bursts of intensity with enough recovery to keep technique stable and repeatable." },
  { id: 9, difficulty: "hard", text: "While ambitious goals can energize practice, measurable progress usually comes from noticing subtle inefficiencies and refining them with deliberate repetition." },
  { id: 10, difficulty: "hard", text: "Complex sentences with commas, semicolons, and shifting rhythm demand composure, because speed without control quickly collapses into preventable errors." },
  { id: 11, difficulty: "hard", text: "A skilled typist learns to recover from disruption without panic, recalibrating finger placement and attention before momentum is permanently lost." },
  { id: 12, difficulty: "hard", text: "Consistency matters most when fatigue appears, since accurate keystrokes near the end of a session reveal whether technique is truly dependable." }
];

const state = {
  startTime: 0,
  timeLeft: TEST_DURATION,
  isRunning: false,
  typedText: "",
  typedEntries: [],
  mistakes: 0,
  correctChars: 0,
  currentParagraph: null,
  intervalId: null,
  lastInputLength: 0,
  pendingInputType: null
};

const elements = {
  landingScreen: document.getElementById("landingScreen"),
  testScreen: document.getElementById("testScreen"),
  resultScreen: document.getElementById("resultScreen"),
  difficultySelect: document.getElementById("difficultySelect"),
  soundToggle: document.getElementById("soundToggle"),
  themeToggle: document.getElementById("themeToggle"),
  themeIcon: document.querySelector(".theme-icon"),
  startButton: document.getElementById("startButton"),
  retryButton: document.getElementById("retryButton"),
  newTestButton: document.getElementById("newTestButton"),
  streakValue: document.getElementById("streakValue"),
  bestWpmValue: document.getElementById("bestWpmValue"),
  timerValue: document.getElementById("timerValue"),
  wpmValue: document.getElementById("wpmValue"),
  accuracyValue: document.getElementById("accuracyValue"),
  errorsValue: document.getElementById("errorsValue"),
  progressBar: document.getElementById("progressBar"),
  difficultyBadge: document.getElementById("difficultyBadge"),
  paragraphCounter: document.getElementById("paragraphCounter"),
  paragraphDisplay: document.getElementById("paragraphDisplay"),
  typingInput: document.getElementById("typingInput"),
  finalWpm: document.getElementById("finalWpm"),
  finalAccuracy: document.getElementById("finalAccuracy"),
  finalErrors: document.getElementById("finalErrors"),
  finalTime: document.getElementById("finalTime"),
  historyList: document.getElementById("historyList")
};

function getStoredResults() {
  const stored = localStorage.getItem(STORAGE_KEYS.results);
  try {
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveResults(results) {
  localStorage.setItem(STORAGE_KEYS.results, JSON.stringify(results.slice(0, RESULTS_LIMIT)));
}

function getStoredStreak() {
  return Number(localStorage.getItem(STORAGE_KEYS.streak)) || 0;
}

function setStoredStreak(value) {
  localStorage.setItem(STORAGE_KEYS.streak, String(value));
}

function getSoundEnabled() {
  return localStorage.getItem(STORAGE_KEYS.soundEnabled) === "true";
}

function setSoundEnabled(enabled) {
  localStorage.setItem(STORAGE_KEYS.soundEnabled, String(enabled));
}

function getTheme() {
  return localStorage.getItem(STORAGE_KEYS.theme) || "dark";
}

function setTheme(theme) {
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  elements.themeIcon.innerHTML = theme === "dark" ? "&#9728;" : "&#9790;";
}

function switchScreen(target) {
  [elements.landingScreen, elements.testScreen, elements.resultScreen].forEach((screen) => {
    screen.classList.toggle("active", screen === target);
  });
}

function getParagraphPool(difficulty) {
  return paragraphs.filter((paragraph) => paragraph.difficulty === difficulty);
}

function chooseParagraph(difficulty) {
  const pool = getParagraphPool(difficulty);
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

function renderParagraph() {
  const chars = state.currentParagraph.text.split("");
  elements.paragraphDisplay.innerHTML = chars
    .map((char) => `<span>${char === " " ? "&nbsp;" : escapeHtml(char)}</span>`)
    .join("");

  const firstCharacter = elements.paragraphDisplay.querySelector("span");
  if (firstCharacter) {
    firstCharacter.classList.add("current");
  }
}

function escapeHtml(char) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };
  return map[char] || char;
}

function resetState() {
  clearInterval(state.intervalId);
  state.startTime = 0;
  state.timeLeft = TEST_DURATION;
  state.isRunning = false;
  state.typedText = "";
  state.typedEntries = [];
  state.mistakes = 0;
  state.correctChars = 0;
  state.intervalId = null;
  state.lastInputLength = 0;
  state.pendingInputType = null;
}

function startNewTest(useExistingDifficulty = true) {
  resetState();
  const difficulty = useExistingDifficulty ? elements.difficultySelect.value : "medium";
  if (!useExistingDifficulty) {
    elements.difficultySelect.value = difficulty;
  }

  state.currentParagraph = chooseParagraph(difficulty);
  elements.difficultyBadge.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  elements.paragraphCounter.textContent = `Paragraph ${state.currentParagraph.id}`;
  elements.typingInput.value = "";
  elements.typingInput.maxLength = state.currentParagraph.text.length;
  renderParagraph();
  updateStats();
  switchScreen(elements.testScreen);
  window.requestAnimationFrame(() => elements.typingInput.focus());
}

function startTimer() {
  if (state.isRunning) {
    return;
  }

  state.isRunning = true;
  state.startTime = Date.now();
  state.intervalId = window.setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
    state.timeLeft = Math.max(TEST_DURATION - elapsedSeconds, 0);
    updateStats();

    if (state.timeLeft <= 0) {
      finishTest();
    }
  }, 100);
}

function calculateMetrics() {
  const typedChars = state.typedEntries.length;
  const elapsedSeconds = state.isRunning
    ? Math.max((Date.now() - state.startTime) / 1000, 1)
    : TEST_DURATION - state.timeLeft || 1;
  const elapsedMinutes = elapsedSeconds / 60;
  const wpm = elapsedMinutes > 0 ? Math.round((state.correctChars / 5) / elapsedMinutes) : 0;
  const accuracy = typedChars > 0 ? Math.max(0, Math.round((state.correctChars / typedChars) * 100)) : 100;
  const progress = state.currentParagraph
    ? Math.min((typedChars / state.currentParagraph.text.length) * 100, 100)
    : 0;

  return {
    typedChars,
    elapsedSeconds,
    wpm: Number.isFinite(wpm) ? wpm : 0,
    accuracy: Number.isFinite(accuracy) ? accuracy : 100,
    progress
  };
}

function updateStats() {
  const { wpm, accuracy, progress } = calculateMetrics();
  elements.timerValue.textContent = String(state.timeLeft);
  elements.wpmValue.textContent = String(wpm);
  elements.accuracyValue.textContent = `${accuracy}%`;
  elements.errorsValue.textContent = String(state.mistakes);
  elements.progressBar.style.width = `${progress}%`;
}

function updateCharacterStates() {
  const spans = elements.paragraphDisplay.querySelectorAll("span");
  let correctCount = 0;
  let mistakes = 0;

  spans.forEach((span, index) => {
    span.className = "";
    const entry = state.typedEntries[index];

    if (!entry) {
      return;
    }

    if (entry.isCorrect) {
      span.classList.add("correct");
      correctCount += 1;
    } else {
      span.classList.add("incorrect");
      mistakes += 1;
    }
  });

  const currentIndex = Math.min(state.typedEntries.length, spans.length - 1);
  if (spans[currentIndex]) {
    spans[currentIndex].classList.add("current");
  }

  state.correctChars = correctCount;
  state.mistakes = mistakes;
}

function syncTypedState() {
  state.typedText = state.typedEntries.map((entry) => entry.typed).join("");
  state.lastInputLength = state.typedEntries.length;
  elements.typingInput.value = state.typedText;
  updateCharacterStates();
  updateStats();
}

function playKeySound() {
  if (!elements.soundToggle.checked) {
    return;
  }

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    return;
  }

  if (!playKeySound.context) {
    playKeySound.context = new AudioContext();
  }

  const ctx = playKeySound.context;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  // A tiny oscillator pulse keeps the feature lightweight and fully offline.
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.value = 620;
  gain.gain.value = 0.015;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.03);
}

function addTypedCharacter(char) {
  if (!state.currentParagraph || state.typedEntries.length >= state.currentParagraph.text.length) {
    return;
  }

  if (!state.isRunning) {
    startTimer();
  }

  const expectedChar = state.currentParagraph.text[state.typedEntries.length];
  state.typedEntries.push({
    typed: char,
    expected: expectedChar,
    isCorrect: char === expectedChar
  });
  playKeySound();
  syncTypedState();

  if (state.typedEntries.length === state.currentParagraph.text.length) {
    finishTest();
  }
}

function removeTypedCharacters(count = 1) {
  if (count <= 0) {
    return;
  }

  state.typedEntries.splice(Math.max(state.typedEntries.length - count, 0), count);
  syncTypedState();
}

function handleTypingKeydown(event) {
  if (!state.currentParagraph || !elements.testScreen.classList.contains("active")) {
    return;
  }

  if ((event.ctrlKey || event.metaKey || event.altKey) && event.key !== "Backspace") {
    return;
  }

  if (event.key === "Backspace") {
    event.preventDefault();
    removeTypedCharacters(1);
    return;
  }

  if (event.key.length !== 1) {
    return;
  }

  event.preventDefault();
  addTypedCharacter(event.key);
}

function handleBeforeInput(event) {
  state.pendingInputType = event.inputType || null;
}

function handleTypingInput() {
  if (!state.currentParagraph || !elements.testScreen.classList.contains("active")) {
    return;
  }

  const domValue = elements.typingInput.value;
  const previousValue = state.typedText;
  const pendingInputType = state.pendingInputType;
  state.pendingInputType = null;

  if (domValue === previousValue) {
    return;
  }

  if (pendingInputType === "deleteContentBackward" || domValue.length < previousValue.length) {
    removeTypedCharacters(previousValue.length - domValue.length || 1);
    return;
  }

  if (domValue.startsWith(previousValue) && domValue.length > previousValue.length) {
    const appendedText = domValue.slice(previousValue.length);
    appendedText.split("").forEach((char) => addTypedCharacter(char));
    return;
  }

  // Mobile keyboards can replace the field content during autocorrect/composition.
  // Rebuild from the longest shared prefix to keep the test aligned to the prompt.
  let sharedPrefixLength = 0;
  while (
    sharedPrefixLength < previousValue.length &&
    sharedPrefixLength < domValue.length &&
    previousValue[sharedPrefixLength] === domValue[sharedPrefixLength]
  ) {
    sharedPrefixLength += 1;
  }

  state.typedEntries = state.typedEntries.slice(0, sharedPrefixLength);
  const appendedText = domValue.slice(sharedPrefixLength);
  appendedText.split("").forEach((char) => {
    if (state.typedEntries.length < state.currentParagraph.text.length) {
      const expectedChar = state.currentParagraph.text[state.typedEntries.length];
      state.typedEntries.push({
        typed: char,
        expected: expectedChar,
        isCorrect: char === expectedChar
      });
    }
  });
  syncTypedState();
}

function finishTest() {
  if (!state.currentParagraph) {
    return;
  }

  clearInterval(state.intervalId);
  state.intervalId = null;

  if (state.isRunning) {
    const elapsedSeconds = Math.max(Math.round((Date.now() - state.startTime) / 1000), 1);
    state.timeLeft = Math.max(TEST_DURATION - elapsedSeconds, 0);
  }

  state.isRunning = false;
  updateStats();

  const { wpm, accuracy, elapsedSeconds } = calculateMetrics();
  const result = {
    wpm,
    accuracy,
    mistakes: state.mistakes,
    timeTaken: Math.min(elapsedSeconds, TEST_DURATION),
    date: Date.now()
  };

  const existingResults = getStoredResults();
  saveResults([result, ...existingResults]);

  const nextStreak = accuracy >= 90 && wpm > 0 ? getStoredStreak() + 1 : 0;
  setStoredStreak(nextStreak);

  elements.finalWpm.textContent = String(result.wpm);
  elements.finalAccuracy.textContent = `${result.accuracy}%`;
  elements.finalErrors.textContent = String(result.mistakes);
  elements.finalTime.textContent = `${result.timeTaken}s`;

  renderHistory();
  renderLandingStats();
  switchScreen(elements.resultScreen);
}

function renderHistory() {
  const results = getStoredResults();
  if (results.length === 0) {
    elements.historyList.innerHTML = '<div class="history-empty">No tests saved yet. Finish a run to build your recent history.</div>';
    return;
  }

  elements.historyList.innerHTML = results
    .map((result) => {
      const date = new Date(result.date);
      return `
        <article class="history-item">
          <div>
            <span>WPM</span>
            <strong>${result.wpm}</strong>
          </div>
          <div>
            <span>Accuracy</span>
            <strong>${result.accuracy}%</strong>
          </div>
          <div>
            <span>Errors</span>
            <strong>${result.mistakes}</strong>
          </div>
          <div>
            <span>Date</span>
            <strong>${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderLandingStats() {
  const results = getStoredResults();
  const bestWpm = results.reduce((max, item) => Math.max(max, item.wpm), 0);
  elements.streakValue.textContent = String(getStoredStreak());
  elements.bestWpmValue.textContent = String(bestWpm);
}

function preventClipboardActions(event) {
  event.preventDefault();
}

function handleKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r") {
    event.preventDefault();
    if (elements.testScreen.classList.contains("active")) {
      startNewTest(true);
    }
  }
}

function returnToLanding() {
  resetState();
  switchScreen(elements.landingScreen);
}

function initialize() {
  applyTheme(getTheme());
  elements.soundToggle.checked = getSoundEnabled();
  renderLandingStats();
  renderHistory();

  elements.startButton.addEventListener("click", () => startNewTest(true));
  elements.retryButton.addEventListener("click", () => startNewTest(true));
  elements.newTestButton.addEventListener("click", returnToLanding);

  elements.soundToggle.addEventListener("change", (event) => {
    setSoundEnabled(event.target.checked);
  });

  elements.themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("dark") ? "light" : "dark";
    applyTheme(nextTheme);
    setTheme(nextTheme);
  });

  elements.typingInput.addEventListener("keydown", handleTypingKeydown);
  elements.typingInput.addEventListener("beforeinput", handleBeforeInput);
  elements.typingInput.addEventListener("input", handleTypingInput);
  elements.typingInput.addEventListener("paste", preventClipboardActions);
  elements.typingInput.addEventListener("copy", preventClipboardActions);
  elements.typingInput.addEventListener("cut", preventClipboardActions);
  elements.typingInput.addEventListener("drop", preventClipboardActions);

  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("contextmenu", preventClipboardActions);
}

initialize();
