const BASE_URL = window.location.hostname === 'zdotapps.com' 
    ? 'https://zdotapps.com/spellingbee'
    : 'http://127.0.0.1:8000/spellingbee';
const API_BASE_URL = `${BASE_URL}/api`;

function showError(message) {
    const errorDiv = document.getElementById('authError');
    errorDiv.textContent = message;
    errorDiv.classList.remove('d-none');
}

// Handle registration
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        showError('Passwords do not match!');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/register-api/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                name, 
                email, 
                password,
                username: email
            })
        });

        const data = await response.json();
        if (response.ok) {
            alert('Registration successful! Please login.');
            window.location.replace(`${BASE_URL}/login/`);
        } else {
            showError(data.error || 'Registration failed');
        }
    } catch (error) {
        showError('Registration failed. Please try again.');
    }
});

// Handle login
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/login-api/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (response.ok) {
            // Store token and user info
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userName', data.name);
            
            // Store initial game data
            if (data.words) {
                localStorage.setItem('gameData', JSON.stringify({
                    words: data.words,
                    sentences: data.sentences,
                    timer: data.seconds
                }));
            }

            // Redirect to gameplay
            window.location.replace(`${BASE_URL}/gameplay/`);
        } else {
            showError(data.error || 'Invalid credentials');
            localStorage.removeItem('authToken');
            localStorage.removeItem('userName');
            localStorage.removeItem('gameData');
        }
    } catch (error) {
        showError('Login failed. Please try again.');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userName');
        localStorage.removeItem('gameData');
    }
});