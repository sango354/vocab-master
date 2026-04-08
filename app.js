const menuContainer = document.getElementById("menu-container");
const quizHeader = document.getElementById("quiz-header");
const quizContainer = document.getElementById("quiz-container");
const wordEl = document.getElementById("target-word");
const phoneticEl = document.getElementById("phonetic");
const optionsContainer = document.getElementById("options-container");
const btnSpeak = document.getElementById("btn-speak");
const btnBack = document.getElementById("btn-back");
const overlay = document.getElementById("feedback-overlay");
const feedbackText = document.getElementById("feedback-text");
const glassCard = document.querySelector(".quiz-container .glass-card");
const progressBar = document.getElementById("progress-bar");
const remainingCountEl = document.getElementById("remaining-count");
const levelCompleteOverlay = document.getElementById("level-complete-overlay");
const btnLevelBack = document.getElementById("btn-level-back");
const levelSummaryText = document.getElementById("level-summary-text");
const sessionSummary = document.getElementById("session-summary");
const statStudiedEl = document.getElementById("stat-studied");
const statAccuracyEl = document.getElementById("stat-accuracy");
const statMasteredEl = document.getElementById("stat-mastered");
const statReviewEl = document.getElementById("stat-review");
const statsFootnoteEl = document.getElementById("stats-footnote");
const btnResetProgress = document.getElementById("btn-reset-progress");
const appVersionEl = document.getElementById("app-version");

let sessionQueue = [];
let totalSessionWords = 0;
let currentWord = null;
let currentBankKey = null;
let isAnimating = false;
let userMemory = {};
let sessionStats = createEmptySessionStats();
const loadedBanks = {};
let isLoadingBank = false;
let storageReady = false;

const MAX_SESSION_WORDS = 10;
const MASTERED_SCORE = 4;
const REVIEW_SCORE = 0;

function createEmptySessionStats() {
  return {
    bankKey: null,
    totalWords: 0,
    attempts: 0,
    correct: 0,
    wrong: 0,
    retriedWords: new Set(),
    masteredThisSession: new Set(),
    reviewWords: new Set()
  };
}

function normalizeMemoryEntry(word, entry) {
  if (typeof entry === "number") {
    return {
      word,
      score: entry,
      seen: Math.max(0, entry),
      correct: Math.max(0, entry),
      wrong: Math.max(0, -entry),
      streak: Math.max(0, entry),
      lastSeenAt: null,
      lastCorrectAt: null
    };
  }

  return {
    word,
    score: Number(entry?.score) || 0,
    seen: Number(entry?.seen) || 0,
    correct: Number(entry?.correct) || 0,
    wrong: Number(entry?.wrong) || 0,
    streak: Number(entry?.streak) || 0,
    lastSeenAt: entry?.lastSeenAt || null,
    lastCorrectAt: entry?.lastCorrectAt || null
  };
}

function normalizeBankEntry(bankKey, entry, index) {
  const normalizedWord = String(entry.word || "").trim();
  const fallbackId = `${bankKey}-${String(index + 1).padStart(4, "0")}`;

  return {
    id: entry.id || fallbackId,
    word: normalizedWord.toLowerCase(),
    displayWord: entry.displayWord || normalizedWord,
    phonetic: entry.phonetic || "",
    mean: entry.mean || "",
    meanZh: entry.meanZh || meanZhMap[entry.mean] || "",
    pos: entry.pos || "n.",
    level: entry.level || "core",
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    example: entry.example || "",
    exampleZh: entry.exampleZh || "",
    synonyms: Array.isArray(entry.synonyms) ? entry.synonyms : [],
    distractors: Array.isArray(entry.distractors) ? entry.distractors : [],
    source: entry.source || "internal",
    updatedAt: entry.updatedAt || "2026-04-08"
  };
}

function getMeaningLabel(mean, entry = null) {
  if (entry?.meanZh) return entry.meanZh;
  return meanZhMap[mean] || mean;
}

function updateBankCardText() {
  Object.entries(bankCatalog).forEach(([bankKey, bankMeta]) => {
    const titleEl = document.getElementById(`bank-title-${bankKey}`);
    const descEl = document.getElementById(`bank-desc-${bankKey}`);
    if (titleEl) titleEl.textContent = bankMeta.label;
    if (descEl) descEl.textContent = bankMeta.description;
  });

  if (appVersionEl) {
    appVersionEl.textContent = `Version ${APP_VERSION}`;
  }
}

async function loadMemory() {
  const progressEntries = await dbClient.getAllProgress();
  const normalized = {};
  progressEntries.forEach(entry => {
    normalized[entry.word] = normalizeMemoryEntry(entry.word, entry);
  });
  return normalized;
}

async function migrateLegacyLocalStorage() {
  try {
    const saved = localStorage.getItem("vocabMemory");
    if (!saved) return {};

    const parsed = JSON.parse(saved);
    const migrated = {};

    for (const [word, entry] of Object.entries(parsed)) {
      const normalized = normalizeMemoryEntry(word, entry);
      migrated[word] = normalized;
      await dbClient.setProgressEntry(normalized);
    }

    localStorage.removeItem("vocabMemory");
    return migrated;
  } catch (error) {
    console.error("Error migrating localStorage memory:", error);
    return {};
  }
}

function ensureWordMemory(word) {
  if (!userMemory[word]) {
    userMemory[word] = normalizeMemoryEntry(word, null);
  }
  return userMemory[word];
}

async function persistProgressEntry(entry) {
  userMemory[entry.word] = entry;
  if (!storageReady) return;

  try {
    await dbClient.setProgressEntry(entry);
  } catch (error) {
    console.error("Failed to persist progress entry:", error);
  }
}

function getLearningUrgency(wordObj) {
  const entry = ensureWordMemory(wordObj.word);
  const lastSeenGap = entry.lastSeenAt
    ? (Date.now() - new Date(entry.lastSeenAt).getTime()) / (1000 * 60 * 60 * 24)
    : 999;

  const noveltyBoost = entry.seen === 0 ? -3 : 0;
  const reviewBoost = entry.score <= REVIEW_SCORE ? -2 : 0;
  const recencyFactor = Math.min(lastSeenGap, 30) / 10;

  return entry.score - recencyFactor - noveltyBoost - reviewBoost - entry.streak * 0.3;
}

function getBankMeta(bankKey) {
  return bankCatalog[bankKey] || {
    label: "Unknown",
    path: null,
    version: 1
  };
}

function computeGlobalStats() {
  const entries = Object.values(userMemory);
  const studiedWords = entries.filter(entry => entry.seen > 0);
  const totalCorrect = entries.reduce((sum, entry) => sum + entry.correct, 0);
  const totalSeen = entries.reduce((sum, entry) => sum + entry.seen, 0);
  const mastered = entries.filter(entry => entry.score >= MASTERED_SCORE).length;
  const needsReview = entries.filter(entry => entry.seen > 0 && entry.score <= REVIEW_SCORE).length;

  return {
    studied: studiedWords.length,
    accuracy: totalSeen === 0 ? 0 : Math.round((totalCorrect / totalSeen) * 100),
    mastered,
    needsReview
  };
}

function getFocusWords(limit = 3) {
  return Object.values(userMemory)
    .filter(entry => entry.seen > 0)
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return b.wrong - a.wrong;
    })
    .slice(0, limit)
    .map(entry => entry.word);
}

function renderStatsPanel() {
  const stats = computeGlobalStats();
  statStudiedEl.textContent = stats.studied;
  statAccuracyEl.textContent = `${stats.accuracy}%`;
  statMasteredEl.textContent = stats.mastered;
  statReviewEl.textContent = stats.needsReview;

  const focusWords = getFocusWords();
  if (focusWords.length === 0) {
    statsFootnoteEl.textContent = storageReady
      ? "Your focus words will appear here after you start practicing."
      : "Initializing local database...";
    return;
  }

  statsFootnoteEl.textContent = `Focus: ${focusWords.join(", ")}`;
}

async function resetProgress() {
  const shouldReset = window.confirm("Reset your learning progress? This cannot be undone.");
  if (!shouldReset) return;

  userMemory = {};
  renderStatsPanel();

  try {
    await dbClient.clearProgress();
  } catch (error) {
    console.error("Failed to clear progress:", error);
  }
}

function updateProgressUI() {
  remainingCountEl.textContent = sessionQueue.length;
  const completed = totalSessionWords - sessionQueue.length;
  const percentage = totalSessionWords === 0 ? 0 : (completed / totalSessionWords) * 100;
  progressBar.style.width = `${percentage}%`;
}

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

async function loadBank(bankKey) {
  if (loadedBanks[bankKey]) {
    return loadedBanks[bankKey];
  }

  const bankMeta = getBankMeta(bankKey);
  if (!bankMeta.path) {
    throw new Error(`Unknown bank key: ${bankKey}`);
  }

  const cachedVersion = await dbClient.getMeta(`bankVersion:${bankKey}`);
  if (cachedVersion?.value === bankMeta.version) {
    const cachedEntries = await dbClient.getBankEntries(bankKey);
    if (cachedEntries.length > 0) {
      loadedBanks[bankKey] = cachedEntries.map(({ bankKey: _ignored, ...entry }) => entry);
      return loadedBanks[bankKey];
    }
  }

  const response = await fetch(bankMeta.path);
  if (!response.ok) {
    throw new Error(`Failed to load bank: ${bankMeta.path}`);
  }

  const bankData = await response.json();
  const normalizedEntries = bankData.map((entry, index) => normalizeBankEntry(bankKey, entry, index));
  await dbClient.replaceBankEntries(bankKey, normalizedEntries, bankMeta.version);
  loadedBanks[bankKey] = normalizedEntries;
  return normalizedEntries;
}

function buildDistractorPool(wordObj, bank) {
  const sameBankPool = bank
    .filter(item => item.id !== wordObj.id && item.pos === wordObj.pos)
    .map(item => ({
      value: item.mean,
      label: getMeaningLabel(item.mean, item)
    }));

  const preferredPool = Array.isArray(wordObj.distractors)
    ? wordObj.distractors.map(item => ({ value: item, label: getMeaningLabel(item) }))
    : [];

  const genericPool = (distractorBank[wordObj.pos] || []).map(item => ({
    value: item,
    label: getMeaningLabel(item)
  }));

  const merged = [...preferredPool, ...sameBankPool, ...genericPool];
  const deduped = [];
  const seen = new Set([wordObj.mean]);

  merged.forEach(option => {
    if (!option.value || seen.has(option.value)) return;
    seen.add(option.value);
    deduped.push(option);
  });

  return deduped;
}

function getRandomDistractors(count, wordObj, bank) {
  const pool = buildDistractorPool(wordObj, bank);
  if (pool.length >= count) {
    return shuffle(pool).slice(0, count);
  }

  const fallbackPool = bank
    .filter(item => item.id !== wordObj.id && item.mean !== wordObj.mean)
    .map(item => ({
      value: item.mean,
      label: getMeaningLabel(item.mean, item)
    }))
    .filter(option => !pool.some(item => item.value === option.value));

  return shuffle([...pool, ...fallbackPool]).slice(0, count);
}

function showMenu() {
  quizHeader.classList.add("hidden");
  quizContainer.classList.add("hidden");
  menuContainer.classList.remove("hidden");
  renderStatsPanel();
}

function setLoadingState(isLoading, bankKey = null) {
  isLoadingBank = isLoading;

  document.querySelectorAll(".menu-card").forEach(card => {
    const cardBankKey = card.getAttribute("data-bank");
    card.disabled = isLoading || !storageReady;
    if (isLoading && cardBankKey === bankKey) {
      card.classList.add("is-loading");
    } else {
      card.classList.remove("is-loading");
    }
  });

  if (isLoading && bankKey) {
    statsFootnoteEl.textContent = `Loading ${getBankMeta(bankKey).label}...`;
  } else {
    renderStatsPanel();
  }
}

async function initSession(bankKey) {
  if (isLoadingBank || !storageReady) return;

  currentBankKey = bankKey;
  sessionStats = createEmptySessionStats();
  sessionStats.bankKey = bankKey;

  try {
    setLoadingState(true, bankKey);

    const bank = await loadBank(bankKey);
    const sortedBank = [...bank].sort((a, b) => getLearningUrgency(a) - getLearningUrgency(b));

    sessionQueue = sortedBank.slice(0, Math.min(MAX_SESSION_WORDS, sortedBank.length));
    totalSessionWords = sessionQueue.length;
    sessionStats.totalWords = totalSessionWords;

    menuContainer.classList.add("hidden");
    quizHeader.classList.remove("hidden");
    quizContainer.classList.remove("hidden");

    levelCompleteOverlay.classList.remove("show");
    levelCompleteOverlay.classList.add("hidden");

    updateProgressUI();
    nextQuestion();
  } catch (error) {
    console.error(error);
    window.alert("Bank loading failed. Please open the site through GitHub Pages or a local server.");
    setLoadingState(false, bankKey);
    return;
  }

  setLoadingState(false, bankKey);
}

function nextQuestion() {
  if (sessionQueue.length === 0) {
    updateProgressUI();
    progressBar.style.width = "100%";
    renderSessionSummary();
    setTimeout(() => {
      levelCompleteOverlay.classList.remove("hidden");
      levelCompleteOverlay.classList.add("show");
    }, 500);
    return;
  }

  isAnimating = false;
  glassCard.style.animation = "none";
  void glassCard.offsetWidth;
  glassCard.style.animation = "slideIn 0.4s ease-out";

  currentWord = sessionQueue[0];
  const currentBank = loadedBanks[currentBankKey] || [];

  wordEl.textContent = currentWord.displayWord || currentWord.word;
  phoneticEl.textContent = `${currentWord.phonetic}  ${currentWord.pos}`;

  const distractors = getRandomDistractors(3, currentWord, currentBank);
  const options = shuffle([
    ...distractors,
    { value: currentWord.mean, label: getMeaningLabel(currentWord.mean, currentWord) }
  ]).slice(0, 4);

  optionsContainer.innerHTML = "";
  options.forEach(option => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = option.label;
    btn.dataset.value = option.value;
    btn.onclick = () => handleOptionClick(btn, option.value === currentWord.mean);
    optionsContainer.appendChild(btn);
  });

  updateProgressUI();
}

function speakWord() {
  if (!currentWord || !("speechSynthesis" in window)) return;

  const utterance = new SpeechSynthesisUtterance(currentWord.displayWord || currentWord.word);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function applyAnswerToMemory(wordObj, isCorrect) {
  const entry = ensureWordMemory(wordObj.word);
  const timestamp = new Date().toISOString();

  entry.seen += 1;
  entry.lastSeenAt = timestamp;

  if (isCorrect) {
    entry.correct += 1;
    entry.score += entry.streak >= 2 ? 2 : 1;
    entry.streak += 1;
    entry.lastCorrectAt = timestamp;
  } else {
    entry.wrong += 1;
    entry.score = Math.max(-3, entry.score - 2);
    entry.streak = 0;
  }

  persistProgressEntry(entry);

  if (entry.score >= MASTERED_SCORE) {
    sessionStats.masteredThisSession.add(wordObj.displayWord || wordObj.word);
  }

  if (entry.score <= REVIEW_SCORE) {
    sessionStats.reviewWords.add(wordObj.displayWord || wordObj.word);
  }
}

function handleOptionClick(btn, isCorrect) {
  if (isAnimating) return;
  isAnimating = true;

  speakWord();
  sessionStats.attempts += 1;

  const allBtns = document.querySelectorAll(".option-btn");

  if (isCorrect) {
    sessionStats.correct += 1;
    btn.classList.add("correct");
    showFeedback(true);
    applyAnswerToMemory(currentWord, true);
    sessionQueue.shift();
  } else {
    sessionStats.wrong += 1;
    sessionStats.retriedWords.add(currentWord.displayWord || currentWord.word);
    btn.classList.add("wrong");

    allBtns.forEach(optionBtn => {
      if (optionBtn.dataset.value === currentWord.mean) {
        optionBtn.classList.add("correct");
      }
      optionBtn.disabled = true;
    });

    showFeedback(false);
    applyAnswerToMemory(currentWord, false);

    const failedWord = sessionQueue.shift();
    sessionQueue.push(failedWord);
  }

  allBtns.forEach(optionBtn => {
    optionBtn.disabled = true;
  });

  setTimeout(() => {
    overlay.classList.remove("show");
    overlay.classList.add("hidden");
    nextQuestion();
  }, 1300);
}

function renderSessionSummary() {
  const accuracy = sessionStats.attempts === 0
    ? 0
    : Math.round((sessionStats.correct / sessionStats.attempts) * 100);

  levelSummaryText.textContent = `${getBankMeta(sessionStats.bankKey).label} complete. Accuracy ${accuracy}%.`;

  const reviewList = Array.from(sessionStats.reviewWords).slice(0, 3);
  const masteredCount = sessionStats.masteredThisSession.size;
  const retriedCount = sessionStats.retriedWords.size;

  sessionSummary.innerHTML = `
    <div class="summary-chip">
      <span>Correct</span>
      <strong>${sessionStats.correct}</strong>
    </div>
    <div class="summary-chip">
      <span>Wrong</span>
      <strong>${sessionStats.wrong}</strong>
    </div>
    <div class="summary-chip">
      <span>Retried</span>
      <strong>${retriedCount}</strong>
    </div>
    <div class="summary-chip">
      <span>Mastered</span>
      <strong>${masteredCount}</strong>
    </div>
    <p class="session-summary-note">${
      reviewList.length > 0
        ? `Review next: ${reviewList.join(", ")}`
        : "No urgent review words from this session."
    }</p>
  `;

  renderStatsPanel();
}

function showFeedback(isCorrect) {
  overlay.classList.remove("hidden");
  overlay.classList.add("show");

  if (isCorrect) {
    feedbackText.textContent = "CORRECT";
    feedbackText.className = "feedback-content feedback-correct";
  } else {
    feedbackText.textContent = "WRONG";
    feedbackText.className = "feedback-content feedback-wrong";
  }
}

async function bootstrapApp() {
  try {
    updateBankCardText();
    await dbClient.open();
    userMemory = await loadMemory();

    if (Object.keys(userMemory).length === 0) {
      const migratedMemory = await migrateLegacyLocalStorage();
      if (Object.keys(migratedMemory).length > 0) {
        userMemory = migratedMemory;
      }
    }

    storageReady = true;
    renderStatsPanel();
    setLoadingState(false);
  } catch (error) {
    console.error("Failed to initialize IndexedDB:", error);
    statsFootnoteEl.textContent = "Failed to initialize local database.";
  }
}

renderStatsPanel();
updateBankCardText();

document.querySelectorAll(".menu-card").forEach(card => {
  card.addEventListener("click", () => {
    const bankKey = card.getAttribute("data-bank");
    initSession(bankKey);
  });
});

btnBack.addEventListener("click", showMenu);
btnSpeak.addEventListener("click", speakWord);
btnResetProgress.addEventListener("click", () => {
  resetProgress();
});
btnLevelBack.addEventListener("click", () => {
  levelCompleteOverlay.classList.remove("show");
  levelCompleteOverlay.classList.add("hidden");
  showMenu();
});

bootstrapApp();
