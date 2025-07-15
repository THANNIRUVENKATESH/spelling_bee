// Add base URL configuration
const BASE_URL = window.location.hostname === 'zdotapps.com' 
    ? 'https://zdotapps.com/spellingbee'
    : 'http://127.0.0.1:8000/spellingbee';
const API_BASE_URL = `${BASE_URL}/api`;

let words = [];
let currentWordIndex = 0;
let correctWords = 0;
let incorrectWords = 0;
let skippedWords = 0;
let currentWord = '';
let timeLeft = 15;
let timerInterval = null;
let timerStarted = false;
let selectedVoice = null;
let score = 0;
let wordStatuses = {};
let missedWords = {};
let isProcessingAnswer = false;
let isTimerActive = false;
let currentWordCompleted = false;
let wordAttempted = false;
let sentences = [];

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication first
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.replace(`${BASE_URL}/login/`);
        return;
    }

    if(document.querySelector('.game-container')) {
        initializeGame();
        
        // Add new button listeners
        document.getElementById('nextBtn')?.addEventListener('click', () => {
            if (!isTimerActive || timeLeft <= 0) {
                moveToNextWord();
                currentWordCompleted = false;
            }
        });
        
        document.getElementById('exitBtn')?.addEventListener('click', async () => {
            if (!isTimerActive) {
                await submitResults();
            }
        });
    }
});

function initializeGame() {
    if (!document.getElementById('wordCounter')) {
        const counterDiv = document.createElement('div');
        counterDiv.id = 'wordCounter';
        counterDiv.className = 'word-counter';
        document.querySelector('.game-container').insertBefore(
            counterDiv,
            document.querySelector('.word-display')
        );
    }
    loadNewWord();
    setupInputHandlers();
    
    // Initially disable all buttons except Hear Word
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('nextBtn').disabled = true;
    document.getElementById('exitBtn').disabled = true;
    
    // Initially disable input
    const input = document.getElementById('wordInput');
    if (input) {
        input.disabled = true;
    }
}

// Elements
const scoreElement = document.querySelector('.score-board');
const voiceSelect = document.getElementById('voiceSelect');

// Timer functions
function startTimer() {
    isTimerActive = true;
    document.getElementById('exitBtn').disabled = true;
    timeLeft = 15;
    updateTimerDisplay();
    clearTimer();

    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').textContent = timeLeft;
        
        const progress = (timeLeft / 15) * 283;
        document.querySelector('.timer-circle').style.strokeDashoffset = 283 - progress;
        
        if(timeLeft <= 5) {
            document.querySelector('.timer-container').classList.add('warning');
        }

        if(timeLeft <= 0) {
            clearInterval(timerInterval);
            isTimerActive = false;
            handleTimeoutOrIncorrect();
            showMessage('timeout');
            // Don't call loadNewWord here
        }
    }, 1000);
}

function clearTimer() {
    isTimerActive = false;
    if(timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay() {
    document.getElementById('timer').textContent = timeLeft;
    document.querySelector('.timer-circle').style.strokeDashoffset = '0';
    document.querySelector('.timer-container').classList.remove('warning');
}

function generateInputs(word) {
    const display = document.getElementById('wordDisplay');
    if (!display) return;
    
    // Clear any existing input
    display.innerHTML = '';
    
    // Create new input
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'wordInput';
    input.className = 'word-input';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.readOnly = true;
    
    display.appendChild(input);
    setupInputHandlers();
}

function showMessage(type) {
    const feedback = document.getElementById('feedbackMessage');
    const closeBtn = document.getElementById('closeFeedback');
    
    let message = '';
    if(type === 'correct') {
        message = '🎉 Correct! Well done!';
    } else if(type === 'timeout') {
        message = '⏰ Time Up! Try the word or click Next Word';
    } else {
        message = '❌ Incorrect! Try again!';
    }

    feedback.className = `feedback-message visible feedback-${type}`;
    feedback.innerHTML = `${message}<span id="closeFeedback">×</span>`;

    setTimeout(() => {
        feedback.className = 'feedback-message';
    }, 3000);
}

function setupInputHandlers() {
    const input = document.getElementById('wordInput');
    const submitBtn = document.getElementById('submitBtn');
    
    input.addEventListener('input', () => {
        // Enable submit button only when there's text in the input
        submitBtn.disabled = !input.value.trim();
    });
    
    input.addEventListener('keydown', (e) => {
        if(e.key === 'Enter' && !isProcessingAnswer && input.value.trim()) {
            e.preventDefault();
            checkAnswer();
        }
    });
}

function speakWord() {
    window.speechSynthesis.cancel();
    
    if (!timerStarted) {
        startTimer();
        timerStarted = true;
        wordAttempted = true;
    }
    
    const utterance = new SpeechSynthesisUtterance(currentWord);
    utterance.voice = selectedVoice;
    utterance.rate = 0.8;
    utterance.pitch = 1;
    
    utterance.onerror = (error) => {
        console.error('Speech error:', error);
    };

    window.speechSynthesis.speak(utterance);
    enableInputs();
}

function enableInputs() {
    const input = document.getElementById('wordInput');
    input.disabled = false;
    input.value = '';
    input.focus();
}

function disableInputs() {
    const input = document.getElementById('wordInput');
    input.disabled = true;
}

function checkAnswer() {
    if (isProcessingAnswer) {
        return;
    }

    isProcessingAnswer = true;
    const input = document.getElementById('wordInput');
    const answer = input.value.toLowerCase().trim();

    if(answer === currentWord) {
        if (timeLeft > 0) {
            // Only add score if answered within time
            score += timeLeft;
            scoreElement.textContent = `Score: ${score} 🏆`;
        }
        // Always mark as correct and remove from missed words
        correctWords++;
        wordStatuses[currentWord] = 'correct';
        delete missedWords[currentWord];
        
        clearTimer();
        showMessage('correct');
        
        input.classList.add('correct');
        setTimeout(() => {
            input.classList.remove('correct');
            moveToNextWord();
        }, 1000);
    } 
    else {
        document.getElementById('speakBtn').disabled = false;
        document.getElementById('submitBtn').disabled = false;
        document.getElementById('exitBtn').disabled = timeLeft <= 0;
        enableInputs();
        showMessage('incorrect');
        handleIncorrectAnswer(input);
        isProcessingAnswer = false;
    }
    currentWordCompleted = true;
}

function moveToNextWord() {
    currentWordIndex++;
    isProcessingAnswer = false;
    wordAttempted = false;
    
    if (currentWordIndex >= words.length) {
        submitResults();
        return;
    }
    
    loadNewWord();
    
    // Reset input state
    const input = document.getElementById('wordInput');
    if (input) {
        input.value = '';
        input.disabled = true;
    }
}



function handleIncorrectAnswer(input) {
    if (!wordStatuses[currentWord] || wordStatuses[currentWord] !== 'correct') {
        missedWords[currentWord] = true;
        wordStatuses[currentWord] = 'missed';
    }
    score = Math.max(0, score - 2);
    scoreElement.textContent = `Score: ${score}`;
    input.value = '';
    input.classList.remove('incorrect');
    if(timeLeft > 0) {
        input.focus();
    }
}

function handleTimeoutOrIncorrect() {
    if (wordAttempted) {
        if (!wordStatuses[currentWord] || wordStatuses[currentWord] !== 'correct') {
            missedWords[currentWord] = true;
            wordStatuses[currentWord] = 'missed';
        }
    }
    
    // Enable next word button and exit button after timeout
    document.getElementById('nextBtn').disabled = false;
    document.getElementById('exitBtn').disabled = false;
    document.getElementById('submitBtn').disabled = false;
    
    // Don't disable input on timeout
    const input = document.getElementById('wordInput');
    input.disabled = false;
    input.focus();
}

function calculateScore() {
    // Basic scoring: 10 points per correct word
    return correctWords * 10;
}

async function submitResults() {
    if (isProcessingAnswer) {
        return;
    }
    
    const finalScore = calculateScore();
    
    try {
        const response = await fetch(`${API_BASE_URL}/submit-results/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                score: finalScore,
                correct_words: correctWords,
                incorrect_words: incorrectWords,
                skipped_words: skippedWords
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Show results
        document.querySelector('.game-container').innerHTML = `
            <div class="results-container text-center">
                <h2>Game Results</h2>
                <p>Score: ${finalScore}</p>
                <p>Correct Words: ${correctWords}</p>
                <p>Incorrect Words: ${incorrectWords}</p>
                <p>Skipped Words: ${skippedWords}</p>
                <button class="btn btn-primary mt-3" onclick="window.location.href='${BASE_URL}'">Return to Home</button>
            </div>
        `;
    } catch (error) {
        console.error('Error submitting results:', error);
        alert('Error submitting results. Please try again.');
    }
}

// Helper function to get CSRF token
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function showScorecard() {
    const finalCorrectWords = Object.values(wordStatuses).filter(status => status === 'correct').length;
    // Only show words that were actually attempted and missed
    const missedWordsList = words.slice(0, currentWordIndex + 1)
        .filter(word => wordStatuses[word] === 'missed' && missedWords[word]);
    
    const scorecard = document.createElement('div');
    scorecard.className = 'scorecard';
    
    const starRating = getStarRating(score);
    const starsHtml = `
    <div class="stars-container">
        ${Array(3).fill(0).map((_, i) => `
            <div class="star ${i < starRating ? 'filled' : 'empty'}">
                <svg viewBox="0 0 51 48">
                    <path class="star-path" d="M25 2 L32 18 H48 L35 29 L40 46 L25 37 L10 46 L15 29 L2 18 H18 Z" />
                </svg>
            </div>
        `).join('')}
    </div>
`;

    let missedWordsHtml = '';
    if (missedWordsList.length > 0) {
        missedWordsHtml = `
            <div class="missed-words">
                <h3>Missed words:</h3>
                <ul>
                    ${missedWordsList.map(word => 
                        `<li><span class="word">${word}</span></li>`
                    ).join('')}
                </ul>
            </div>
        `;
    }

    scorecard.innerHTML = `
        ${starsHtml}
        <h2>Your Results</h2>
        <div class="score-details">
            <p>Total Score: ${score}</p>
            <p>Correct Words: ${finalCorrectWords}</p>
            <p>Missed Words: ${missedWordsList.length}</p>
            <p>Total Words Attempted: ${currentWordIndex}</p>
        </div>
        ${missedWordsHtml}
    `;

    const gameContainer = document.querySelector('.game-container');
    gameContainer.innerHTML = '';
    gameContainer.appendChild(scorecard);
}


function getStarRating(score) {
    if (score < 30) return 0;
    if (score >= 30 && score <= 70) return 1;
    if (score >= 71 && score <= 120) return 2;
    if (score > 120) return 3;
}

async function loadNewWord() {
    if (isProcessingAnswer) {
        return;
    }
    
    if (words.length === 0) {
        // Try to get words from localStorage first
        const gameData = localStorage.getItem('gameData');
        if (gameData) {
            const data = JSON.parse(gameData);
            words = data.words || [];
            sentences = data.sentences || [];
            if (words.length > 0) {
                currentWordIndex = 0;
                localStorage.removeItem('gameData'); // Clear stored data after using it
                return;
            }
        }

        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.replace(`${BASE_URL}/login/`);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/get-todays-words/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userName');
                    window.location.replace(`${BASE_URL}/login/`);
                    return;
                }
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.words || !Array.isArray(data.words)) {
                throw new Error('Invalid data format received from server');
            }

            words = data.words;
            sentences = data.sentences || [];
            
            if (words.length === 0) {
                alert('No words available for today!');
                return;
            }
            currentWordIndex = 0;
        } catch (error) {
            console.error('Error fetching words:', error);
            if (error.response?.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('userName');
                window.location.replace(`${BASE_URL}/login/`);
            } else {
                alert(error.message || 'Error loading words. Please try again later.');
            }
            return;
        }
    }

    if (currentWordIndex >= words.length) {
        submitResults();
        return;
    }

    currentWord = words[currentWordIndex];
    document.getElementById('wordCounter').textContent = `Word ${currentWordIndex + 1} of ${words.length}`;
    timerStarted = false;
    timeLeft = 15;
    updateTimerDisplay();
    generateInputs(currentWord);
    
    document.getElementById('speakBtn').disabled = false;
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('nextBtn').disabled = true;
    document.getElementById('exitBtn').disabled = currentWordIndex === 0;
    
    const input = document.getElementById('wordInput');
    if (input) {
        input.disabled = true;
    }
}

// Voice functions
function populateVoices() {
    const voices = window.speechSynthesis.getVoices();
    const savedVoiceURI = localStorage.getItem('selectedVoice');
    
    // Find the stored voice or default to first English voice
    selectedVoice = voices.find(voice => voice.voiceURI === savedVoiceURI) ||
                   voices.find(voice => voice.lang.startsWith('en'));
}

// Event listeners
document.getElementById('speakBtn').addEventListener('click', speakWord);
document.getElementById('submitBtn').addEventListener('click', checkAnswer);
document.getElementById('hintBtn').addEventListener('click', speakHint);
function speakHint() {
    const utterance = new SpeechSynthesisUtterance(sentences[currentWordIndex]);
    utterance.voice = selectedVoice;
    utterance.rate = 0.8;
    utterance.pitch = 1;

    utterance.onerror = (error) => {
        console.error('Speech error:', error);
    };
    window.speechSynthesis.speak(utterance);
}

// Initialize
if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = populateVoices;
}

// Initial load
loadNewWord();
setTimeout(populateVoices, 1000);

