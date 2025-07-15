// Add base URL configuration
const BASE_URL = window.location.hostname === 'zdotapps.com' 
    ? 'https://zdotapps.com/spellingbee'
    : 'http://127.0.0.1:8000/spellingbee';
const API_BASE_URL = `${BASE_URL}/api`;

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication first
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = `${BASE_URL}/login/`;
        return;
    }

    // Load initial leaderboard
    loadLeaderboard('all');

    // Add click handlers for timeframe buttons
    document.querySelectorAll('.timeframe-selector button').forEach(button => {
        button.addEventListener('click', (e) => {
            // Update active button
            document.querySelectorAll('.timeframe-selector button').forEach(btn => 
                btn.classList.remove('active'));
            e.target.classList.add('active');

            // Load leaderboard for selected timeframe
            loadLeaderboard(e.target.dataset.timeframe);
        });
    });
});

async function loadLeaderboard(timeframe) {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = `${BASE_URL}/login/`;
            return;
        }

        const response = await fetch(`${API_BASE_URL}/leaderboard-api/?timeframe=${timeframe}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('userName');
                window.location.href = `${BASE_URL}/login/`;
                return;
            }
            throw new Error('Failed to fetch leaderboard');
        }
        
        const data = await response.json();
        if (!data.leaderboard) {
            throw new Error('Invalid leaderboard data');
        }
        displayLeaderboard(data.leaderboard, timeframe);
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        // Show error message in the table
        const tbody = document.getElementById('leaderboardBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="alert alert-info">
                        Failed to load leaderboard. Please try again later.
                    </div>
                </td>
            </tr>
        `;
    }
}

function displayLeaderboard(leaderboard, timeframe) {
    const tbody = document.getElementById('leaderboardBody');
    
    if (leaderboard.length === 0) {
        // Show appropriate message based on timeframe
        const message = getEmptyMessage(timeframe);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="alert alert-info">
                        ${message}
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = leaderboard.map((player, index) => `
        <tr class="${getRowClass(index)}">
            <td>${index + 1}</td>
            <td>${player.name}</td>
            <td>${player.total_score}</td>
            <td>${player.games_played}</td>
            <td>${player.avg_score}</td>
            <td>${player.highest_score}</td>
        </tr>
    `).join('');
}

function getEmptyMessage(timeframe) {
    switch(timeframe) {
        case 'today':
            return "No games played today yet. Be the first to play!";
        case 'week':
            return "No games played this week. Start playing to see your name here!";
        case 'month':
            return "No games played this month. Time to break the silence!";
        default:
            return "No games played yet. Be the first to make history!";
    }
}

function getRowClass(index) {
    return index === 0 ? 'table-gold' :
           index === 1 ? 'table-silver' :
           index === 2 ? 'table-bronze' :
           '';
}