// Elements
const menuContainer = document.getElementById('menu-container');
const quizHeader = document.getElementById('quiz-header');
const quizContainer = document.getElementById('quiz-container');

const wordEl = document.getElementById('target-word');
const phoneticEl = document.getElementById('phonetic');
const optionsContainer = document.getElementById('options-container');

const btnSpeak = document.getElementById('btn-speak');
const btnBack = document.getElementById('btn-back');
const overlay = document.getElementById('feedback-overlay');
const feedbackText = document.getElementById('feedback-text');
const glassCard = document.querySelector('.quiz-container .glass-card');

const progressBar = document.getElementById('progress-bar');
const remainingCountEl = document.getElementById('remaining-count');
const levelCompleteOverlay = document.getElementById('level-complete-overlay');
const btnLevelBack = document.getElementById('btn-level-back');

// State
let sessionQueue = [];       // Queue of words for the current session
let totalSessionWords = 0;   // The starting count for the session
let currentWord = null;
let isAnimating = false;
let userMemory = {};

// Load memory from LocalStorage
try {
  const saved = localStorage.getItem('vocabMemory');
  if (saved) {
    userMemory = JSON.parse(saved);
  }
} catch (e) {
  console.log('Error loading memory:', e);
}

function saveMemory() {
  localStorage.setItem('vocabMemory', JSON.stringify(userMemory));
}

// --- Flow Control ---

document.querySelectorAll('.menu-card').forEach(card => {
  card.addEventListener('click', () => {
    const bankKey = card.getAttribute('data-bank');
    initSession(bankKey);
  });
});

btnBack.addEventListener('click', showMenu);
btnLevelBack.addEventListener('click', () => {
  levelCompleteOverlay.classList.remove('show');
  levelCompleteOverlay.classList.add('hidden');
  showMenu();
});

function showMenu() {
  quizHeader.classList.add('hidden');
  quizContainer.classList.add('hidden');
  menuContainer.classList.remove('hidden');
}

function initSession(bankKey) {
  const bank = vocabularyBanks[bankKey];
  
  // Sort bank by proficiency (lowest first) + random variation
  let sortedBank = [...bank].sort((a, b) => {
    let profA = userMemory[a.word] || 0;
    let profB = userMemory[b.word] || 0;
    // adding some randomness so it's not strictly deterministic
    return (profA - profB) + (Math.random() - 0.5);
  });

  // Pick up to 10 words
  sessionQueue = sortedBank.slice(0, 10);
  totalSessionWords = sessionQueue.length;

  // UI transition
  menuContainer.classList.add('hidden');
  quizHeader.classList.remove('hidden');
  quizContainer.classList.remove('hidden');
  
  updateProgressUI();
  nextQuestion();
}

function updateProgressUI() {
  remainingCountEl.textContent = sessionQueue.length;
  const completed = totalSessionWords - sessionQueue.length;
  const percentage = (completed / totalSessionWords) * 100;
  progressBar.style.width = `${percentage}%`;
}


// --- Quiz Logic ---

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

function getRandomDistractors(count, excludeMean) {
  let filtered = distractorBank.filter(d => d !== excludeMean);
  // Optional: add more semantic distractors from the whole vocabulary pool
  let allMeans = [];
  for (const b in vocabularyBanks) {
      allMeans = allMeans.concat(vocabularyBanks[b].map(v => v.mean));
  }
  let uniqueMeans = [...new Set(allMeans)].filter(m => m !== excludeMean);
  
  filtered = filtered.concat(uniqueMeans);
  return shuffle(filtered).slice(0, count);
}

function nextQuestion() {
  if (sessionQueue.length === 0) {
    // Level Complete!
    updateProgressUI();
    progressBar.style.width = '100%';
    setTimeout(() => {
      levelCompleteOverlay.classList.remove('hidden');
      levelCompleteOverlay.classList.add('show');
    }, 500);
    return;
  }

  isAnimating = false;
  
  // Reset animation for next card
  glassCard.style.animation = 'none';
  void glassCard.offsetWidth; // trigger reflow
  glassCard.style.animation = 'slideIn 0.4s ease-out';

  // Pop the first word from the queue
  currentWord = sessionQueue[0];
  
  wordEl.textContent = currentWord.word;
  phoneticEl.textContent = currentWord.phonetic;
  
  const wrongs = getRandomDistractors(3, currentWord.mean);
  const options = shuffle([...wrongs, currentWord.mean]);
  
  optionsContainer.innerHTML = '';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.onclick = () => handleOptionClick(btn, opt === currentWord.mean);
    optionsContainer.appendChild(btn);
  });
  
  updateProgressUI();
}

function speakWord() {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(currentWord.word);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }
}

btnSpeak.addEventListener('click', speakWord);

function handleOptionClick(btn, isCorrect) {
  if (isAnimating) return;
  isAnimating = true;

  speakWord();

  const allBtns = document.querySelectorAll('.option-btn');
  
  // Initialize memory tracker if needed
  if (userMemory[currentWord.word] === undefined) {
      userMemory[currentWord.word] = 0;
  }

  if (isCorrect) {
    btn.classList.add('correct');
    showFeedback(true);
    
    // Proficiency logic
    userMemory[currentWord.word] += 1;
    saveMemory();
    
    // Remove from queue
    sessionQueue.shift();
    
  } else {
    btn.classList.add('wrong');
    allBtns.forEach(b => {
      if (b.textContent === currentWord.mean) {
        b.classList.add('correct');
      }
    });
    showFeedback(false);

    // Proficiency logic
    userMemory[currentWord.word] -= 1;
    saveMemory();
    
    // Move to back of the queue (re-try later in this session)
    const failedWord = sessionQueue.shift();
    sessionQueue.push(failedWord);
  }

  setTimeout(() => {
    overlay.classList.remove('show');
    overlay.classList.add('hidden');
    nextQuestion();
  }, 1500);
}

function showFeedback(isCorrect) {
  overlay.classList.remove('hidden');
  overlay.classList.add('show');
  
  if (isCorrect) {
    feedbackText.textContent = "CORRECT";
    feedbackText.className = "feedback-content feedback-correct";
  } else {
    feedbackText.textContent = "WRONG";
    feedbackText.className = "feedback-content feedback-wrong";
  }
}
