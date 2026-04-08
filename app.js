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

let totalSessionWords = 0;
let answeredCount = 0;
let currentWord = null;
let currentBankKey = null;
let isAnimating = false;
let userMemory = {};
let sessionStats = createEmptySessionStats();
const loadedBanks = {};
let sessionBank = [];
let sessionWordMeta = {};
let isLoadingBank = false;
let storageReady = false;

const MAX_SESSION_WORDS = 10;
const MASTERED_SCORE = 4;
const REVIEW_SCORE = 0;
const ROUND_SIZE = 10;
const RETRY_DELAY_ROUNDS = 2;
const REPEAT_COOLDOWN_ROUNDS = 5;
const POOL_WEIGHTS = {
  new: 90,
  learning: 5,
  review: 5
};

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
    if (titleEl) {
      const titleTextEl = titleEl.querySelector("span:last-child");
      if (titleTextEl) {
        titleTextEl.textContent = bankMeta.label;
      } else {
        titleEl.textContent = bankMeta.label;
      }
    }
    if (descEl) descEl.textContent = bankMeta.description;
  });

  if (appVersionEl) {
    appVersionEl.textContent = `\u7248\u672c ${APP_VERSION}`;
  }

  document.querySelector(".app-subtitle").textContent = "\u9078\u64c7\u4eca\u5929\u7684\u7df4\u7fd2\u984c\u5eab";
  document.getElementById("stats-title").textContent = "\u5b78\u7fd2\u9032\u5ea6\u7e3d\u89bd";
  document.getElementById("btn-reset-progress").textContent = "\u91cd\u8a2d\u9032\u5ea6";
  document.querySelector("[for='remaining-count']");
  btnBack.textContent = "\u8fd4\u56de\u9996\u9801";
  document.querySelector(".progress-text").childNodes[0].textContent = "\u5269\u9918: ";
  btnLevelBack.textContent = "\u56de\u5230\u9996\u9801";
  levelCompleteOverlay.querySelector("h2").textContent = "\u672c\u8f2a\u5b8c\u6210";

  const labels = document.querySelectorAll(".stat-label");
  if (labels[0]) labels[0].textContent = "\u5df2\u5b78\u55ae\u5b57";
  if (labels[1]) labels[1].textContent = "\u7e3d\u6b63\u7b54\u7387";
  if (labels[2]) labels[2].textContent = "\u5df2\u638c\u63e1";
  if (labels[3]) labels[3].textContent = "\u5f85\u8907\u7fd2";
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
    label: "\u672a\u77e5\u984c\u5eab",
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
      ? "\u958b\u59cb\u4efb\u4e00\u984c\u5eab\u5f8c\uff0c\u9019\u88e1\u6703\u986f\u793a\u4f60\u6700\u9700\u8981\u52a0\u5f37\u7684\u55ae\u5b57\u3002"
      : "\u6b63\u5728\u521d\u59cb\u5316\u672c\u6a5f\u8cc7\u6599\u5eab...";
    return;
  }

  statsFootnoteEl.textContent = `\u76ee\u524d\u6700\u9700\u8981\u8907\u7fd2: ${focusWords.join("\u3001")}`;
}

async function resetProgress() {
  const shouldReset = window.confirm("\u78ba\u5b9a\u8981\u91cd\u8a2d\u5b78\u7fd2\u9032\u5ea6\u55ce\uff1f\u9019\u500b\u52d5\u4f5c\u7121\u6cd5\u5fa9\u539f\u3002");
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
  const remaining = Math.max(totalSessionWords - answeredCount, 0);
  remainingCountEl.textContent = remaining;
  const completed = answeredCount;
  const percentage = totalSessionWords === 0 ? 0 : (completed / totalSessionWords) * 100;
  progressBar.style.width = `${percentage}%`;
}

function getCurrentRound() {
  return Math.floor(answeredCount / ROUND_SIZE) + 1;
}

function getWordMeta(word) {
  if (!sessionWordMeta[word]) {
    sessionWordMeta[word] = {
      seenInSession: 0,
      lastRoundAsked: 0,
      retryRound: 0
    };
  }
  return sessionWordMeta[word];
}

function classifyEntryPool(entry, meta, memoryEntry) {
  if (memoryEntry.seen === 0 || (memoryEntry.seen <= 1 && meta.seenInSession === 0)) {
    return "new";
  }
  if (memoryEntry.score < MASTERED_SCORE) {
    return "learning";
  }
  return "review";
}

function pickByUrgency(pool) {
  if (pool.length === 0) return null;
  const sorted = [...pool].sort((a, b) => getLearningUrgency(a) - getLearningUrgency(b));
  const candidateWindow = sorted.slice(0, Math.min(12, sorted.length));
  return candidateWindow[Math.floor(Math.random() * candidateWindow.length)];
}

function pickWeightedPool(availablePools) {
  const weights = availablePools.map(poolName => POOL_WEIGHTS[poolName] || 0);
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return availablePools[0];

  let roll = Math.random() * total;
  for (let i = 0; i < availablePools.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) {
      return availablePools[i];
    }
  }
  return availablePools[availablePools.length - 1];
}

function pickNextWord() {
  if (sessionBank.length === 0) return null;

  const round = getCurrentRound();
  const blockedByRule = [];
  const eligible = sessionBank.filter(entry => {
    if (currentWord && entry.word === currentWord.word) {
      return false;
    }

    const meta = getWordMeta(entry.word);
    const blockedByCooldown = meta.lastRoundAsked > 0 && (round - meta.lastRoundAsked) < REPEAT_COOLDOWN_ROUNDS;
    const blockedByRetryDelay = meta.retryRound > 0 && round < meta.retryRound;

    if (blockedByCooldown || blockedByRetryDelay) {
      blockedByRule.push(entry);
      return false;
    }
    return true;
  });

  const candidateSet = eligible.length > 0 ? eligible : blockedByRule;
  if (candidateSet.length === 0) return null;

  const retryReady = candidateSet.filter(entry => {
    const meta = getWordMeta(entry.word);
    return meta.retryRound > 0 && round >= meta.retryRound;
  });

  if (retryReady.length > 0 && Math.random() < 0.6) {
    return pickByUrgency(retryReady);
  }

  const pools = {
    new: [],
    learning: [],
    review: []
  };

  candidateSet.forEach(entry => {
    const meta = getWordMeta(entry.word);
    const memoryEntry = ensureWordMemory(entry.word);
    const pool = classifyEntryPool(entry, meta, memoryEntry);
    pools[pool].push(entry);
  });

  const availablePools = Object.keys(pools).filter(poolName => pools[poolName].length > 0);
  if (availablePools.length === 0) {
    return pickByUrgency(candidateSet);
  }

  const selectedPool = pickWeightedPool(availablePools);
  return pickByUrgency(pools[selectedPool]);
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
  const merged = [...preferredPool, ...sameBankPool];
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
    statsFootnoteEl.textContent = `\u6b63\u5728\u8f09\u5165 ${getBankMeta(bankKey).label}...`;
  } else {
    renderStatsPanel();
  }
}

async function initSession(bankKey) {
  if (isLoadingBank || !storageReady) return;

  currentBankKey = bankKey;
  sessionStats = createEmptySessionStats();
  sessionStats.bankKey = bankKey;
  answeredCount = 0;
  currentWord = null;
  sessionWordMeta = {};

  try {
    setLoadingState(true, bankKey);

    const bank = await loadBank(bankKey);
    sessionBank = [...bank].sort((a, b) => getLearningUrgency(a) - getLearningUrgency(b));
    totalSessionWords = Math.min(MAX_SESSION_WORDS, sessionBank.length);
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
    window.alert("\u984c\u5eab\u8f09\u5165\u5931\u6557\uff0c\u8acb\u900f\u904e GitHub Pages \u6216\u672c\u6a5f\u4f3a\u670d\u5668\u958b\u555f\u7db2\u7ad9\u3002");
    setLoadingState(false, bankKey);
    return;
  }

  setLoadingState(false, bankKey);
}

function nextQuestion() {
  if (answeredCount >= totalSessionWords) {
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

  currentWord = pickNextWord();
  if (!currentWord) {
    answeredCount = totalSessionWords;
    updateProgressUI();
    progressBar.style.width = "100%";
    renderSessionSummary();
    setTimeout(() => {
      levelCompleteOverlay.classList.remove("hidden");
      levelCompleteOverlay.classList.add("show");
    }, 500);
    return;
  }
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
  const roundForThisQuestion = getCurrentRound();
  sessionStats.attempts += 1;

  const allBtns = optionsContainer.querySelectorAll(".option-btn");
  const meta = getWordMeta(currentWord.word);

  if (meta.seenInSession > 0) {
    sessionStats.retriedWords.add(currentWord.displayWord || currentWord.word);
  }
  meta.seenInSession += 1;
  meta.lastRoundAsked = roundForThisQuestion;

  if (isCorrect) {
    sessionStats.correct += 1;
    btn.classList.add("correct");
    showFeedback(true);
    applyAnswerToMemory(currentWord, true);
    meta.retryRound = 0;
  } else {
    sessionStats.wrong += 1;
    btn.classList.add("wrong");

    allBtns.forEach(optionBtn => {
      if (optionBtn.dataset.value === currentWord.mean) {
        optionBtn.classList.add("correct");
      }
      optionBtn.disabled = true;
    });

    showFeedback(false);
    applyAnswerToMemory(currentWord, false);
    meta.retryRound = roundForThisQuestion + RETRY_DELAY_ROUNDS;
  }

  answeredCount += 1;

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

  levelSummaryText.textContent = `${getBankMeta(sessionStats.bankKey).label} \u672c\u8f2a\u5b8c\u6210\uff0c\u6b63\u7b54\u7387 ${accuracy}%\u3002`;

  const reviewList = Array.from(sessionStats.reviewWords).slice(0, 3);
  const masteredCount = sessionStats.masteredThisSession.size;
  const retriedCount = sessionStats.retriedWords.size;

  sessionSummary.innerHTML = `
    <div class="summary-chip">
      <span>\u7b54\u5c0d</span>
      <strong>${sessionStats.correct}</strong>
    </div>
    <div class="summary-chip">
      <span>\u7b54\u932f</span>
      <strong>${sessionStats.wrong}</strong>
    </div>
    <div class="summary-chip">
      <span>\u91cd\u7df4</span>
      <strong>${retriedCount}</strong>
    </div>
    <div class="summary-chip">
      <span>\u638c\u63e1</span>
      <strong>${masteredCount}</strong>
    </div>
    <p class="session-summary-note">${
      reviewList.length > 0
        ? `\u5efa\u8b70\u4e0b\u6b21\u5148\u8907\u7fd2: ${reviewList.join("\u3001")}`
        : "\u9019\u4e00\u8f2a\u6c92\u6709\u7279\u5225\u9700\u8981\u7acb\u5373\u56de\u982d\u8907\u7fd2\u7684\u55ae\u5b57\u3002"
    }</p>
  `;

  renderStatsPanel();
}

function showFeedback(isCorrect) {
  overlay.classList.remove("hidden");
  overlay.classList.add("show");

  if (isCorrect) {
    feedbackText.textContent = "\u7b54\u5c0d";
    feedbackText.className = "feedback-content feedback-correct";
  } else {
    feedbackText.textContent = "\u7b54\u932f";
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
    statsFootnoteEl.textContent = "\u672c\u6a5f\u8cc7\u6599\u5eab\u521d\u59cb\u5316\u5931\u6557\u3002";
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
