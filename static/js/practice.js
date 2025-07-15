// Add base URL configuration
const BASE_URL = window.location.hostname === 'zdotapps.com' 
    ? 'https://zdotapps.com/spellingbee'
    : 'http://127.0.0.1:8000/spellingbee';
const API_BASE_URL = `${BASE_URL}/api`;

let words = [];
let currentWordIndex = 0;
let currentWord = '';
let timeLeft = 15;
let timerInterval = null;
let selectedVoice = null;
let correctWords = 0;
let incorrectWords = 0;

document.addEventListener('DOMContentLoaded', async () => {
    if(document.querySelector('.practice-container')) {
        await initializePractice();
        
        // Add event listeners
        document.getElementById('speakBtn')?.addEventListener('click', speakWord);
        document.getElementById('submitBtn')?.addEventListener('click', checkAnswer);
        document.getElementById('nextBtn')?.addEventListener('click', moveToNextWord);
        document.getElementById('wordInput')?.addEventListener('input', handleInput);
    }
});

async function initializePractice() {
    try {
        const response = await fetch(`${API_BASE_URL}/get-practice-words/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.words || !Array.isArray(data.words) || data.words.length === 0) {
            throw new Error('No practice words available');
        }
        
        words = data.words;
        await loadNewWord();
        
        // Initialize speech synthesis
        if ('speechSynthesis' in window) {
            speechSynthesis.onvoiceschanged = () => {
                const voices = speechSynthesis.getVoices();
                selectedVoice = voices.find(voice => voice.lang === 'en-US') || voices[0];
            };
            speechSynthesis.getVoices();
        }
    } catch (error) {
        console.error('Error initializing practice:', error);
        alert('Error loading practice words. Please try again later.');
    }
}

function loadNewWord() {
    if (currentWordIndex >= words.length) {
        showResults();
        return;
    }

    currentWord = words[currentWordIndex];
    document.getElementById('wordCounter').textContent = `Word ${currentWordIndex + 1} of ${words.length}`;
    
    // Reset UI state
    const wordInput = document.getElementById('wordInput');
    if (wordInput) {
        wordInput.value = '';
        wordInput.disabled = true;
    }
    
    document.getElementById('speakBtn').disabled = false;
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('nextBtn').disabled = true;
    
    // Reset timer
    clearInterval(timerInterval);
    timeLeft = 15;
    updateTimerDisplay();
    
    // Hide previous result
    const resultElement = document.getElementById('result');
    if (resultElement) {
        resultElement.style.display = 'none';
    }
}

function speakWord() {
    if (!currentWord || !('speechSynthesis' in window)) return;
    
    // Cancel any ongoing speech
    speechSynthesis.cancel();
    
    // Start timer when word is spoken
    clearInterval(timerInterval);
    timeLeft = 15;
    timerInterval = setInterval(updateTimer, 1000);
    
    const utterance = new SpeechSynthesisUtterance(currentWord);
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
    
    // Enable input after speaking
    const wordInput = document.getElementById('wordInput');
    if (wordInput) {
        wordInput.disabled = false;
        wordInput.focus();
    }
}

function updateTimer() {
    if (timeLeft > 0) {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft === 0) {
            clearInterval(timerInterval);
            checkAnswer();
        }
    }
}

function updateTimerDisplay() {
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        timerElement.textContent = timeLeft;
    }
}

function handleInput(event) {
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = !event.target.value.trim();
    }
}

function checkAnswer() {
    clearInterval(timerInterval);
    
    const input = document.getElementById('wordInput');
    const userAnswer = input.value.trim().toLowerCase();
    const isCorrect = userAnswer === currentWord.toLowerCase();
    
    // Update counters
    if (isCorrect) {
        correctWords++;
    } else {
        incorrectWords++;
    }
    
    // Update UI
    input.disabled = true;
    document.getElementById('speakBtn').disabled = true;
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('nextBtn').disabled = false;
    
    // Show result
    const resultElement = document.getElementById('result');
    resultElement.textContent = isCorrect ? 'Correct!' : `Incorrect. The word was: ${currentWord}`;
    resultElement.className = `alert ${isCorrect ? 'alert-success' : 'alert-danger'}`;
    resultElement.style.display = 'block';
}

function moveToNextWord() {
    currentWordIndex++;
    loadNewWord();
}

function showResults() {
    document.querySelector('.practice-container').innerHTML = `
        <div class="text-center">
            <h2>Practice Complete!</h2>
            <p>Total Words: ${words.length}</p>
            <p>Correct Words: ${correctWords}</p>
            <p>Incorrect Words: ${incorrectWords}</p>
            <button class="btn btn-primary mt-3" onclick="window.location.href='${BASE_URL}'">Return to Home</button>
        </div>
    `;
}