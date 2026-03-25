/* 
  ELEVATE - Modern Habit Tracker
  Core Logic implementation 
*/

// Application State
const state = {
    user: null,
    habits: [],
    history: {}, // { "YYYY-MM-DD": [habitId1, habitId2] }
    currentFilter: 'all',
    currentDate: new Date(),
    calendarDate: new Date()
};

// Default Habits
const defaultHabits = [
    { id: '1', name: 'Drink 2L Water', category: 'health', emoji: '💧', createdAt: new Date().toISOString() },
    { id: '2', name: '30 Min Exercise', category: 'health', emoji: '🏃‍♂️', createdAt: new Date().toISOString() },
    { id: '3', name: 'Eat 2 Fruits', category: 'health', emoji: '🍎', createdAt: new Date().toISOString() },
    { id: '4', name: 'Read 20 Pages', category: 'study', emoji: '📚', createdAt: new Date().toISOString() },
    { id: '5', name: 'Learn New Concept', category: 'study', emoji: '🧠', createdAt: new Date().toISOString() },
    { id: '6', name: 'Code for 1 Hour', category: 'study', emoji: '💻', createdAt: new Date().toISOString() },
    { id: '7', name: '10 Min Meditation', category: 'personal', emoji: '🧘', createdAt: new Date().toISOString() },
    { id: '8', name: 'Journal', category: 'personal', emoji: '📓', createdAt: new Date().toISOString() },
    { id: '9', name: 'Wake Up early', category: 'personal', emoji: '🌅', createdAt: new Date().toISOString() }
];

// Badge Definitions
const badges = [
    { id: 'first_habit', name: 'First Step', desc: 'Completed your first habit', icon: '🌱', threshold: 1, type: 'total' },
    { id: 'streak_3', name: 'On Fire', desc: 'Maintained a 3-day streak', icon: '🔥', threshold: 3, type: 'streak' },
    { id: 'streak_7', name: 'Unstoppable', desc: 'Maintained a 7-day streak', icon: '⚡', threshold: 7, type: 'streak' },
    { id: 'streak_30', name: 'Legend', desc: 'Maintained a 30-day streak', icon: '👑', threshold: 30, type: 'streak' },
    { id: 'health_hero', name: 'Health Hero', desc: 'Completed 10 health habits', icon: '💪', threshold: 10, type: 'cat_health' },
    { id: 'study_star', name: 'Scholar', desc: 'Completed 10 study habits', icon: '🎓', threshold: 10, type: 'cat_study' }
];

// Utility functions
const formatDate = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    // Add timezone offset to avoid previous day issue
    const offset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d - offset)).toISOString().slice(0, 10);
    return localISOTime;
};
const getTodayStr = () => formatDate(state.currentDate);
const generateId = () => Math.random().toString(36).substr(2, 9);

// Data Persistence
function loadData() {
    const savedUser = localStorage.getItem('elevate_user');
    const savedHabits = localStorage.getItem('elevate_habits');
    const savedHistory = localStorage.getItem('elevate_history');

    if (savedUser) state.user = JSON.parse(savedUser);
    if (savedHabits) {
        state.habits = JSON.parse(savedHabits);
    } else {
        state.habits = [...defaultHabits];
        saveData();
    }
    if (savedHistory) state.history = JSON.parse(savedHistory);
}

function saveData() {
    localStorage.setItem('elevate_user', JSON.stringify(state.user));
    localStorage.setItem('elevate_habits', JSON.stringify(state.habits));
    localStorage.setItem('elevate_history', JSON.stringify(state.history));
}

// Logic - Progress & Streaks
function getHabitStreak(habitId) {
    let streak = 0;
    let d = new Date(state.currentDate);
    // if not done today, start checking from yesterday
    let todayStr = formatDate(d);
    let todayDone = (state.history[todayStr] || []).includes(habitId);

    if (todayDone) {
        streak = 1;
        d.setDate(d.getDate() - 1);
    } else {
        d.setDate(d.getDate() - 1);
        let ydayStr = formatDate(d);
        if (!(state.history[ydayStr] || []).includes(habitId)) {
            return 0; // neither today nor yesterday
        }
    }

    // Check past days
    while (true) {
        let checkDayStr = formatDate(d);
        if ((state.history[checkDayStr] || []).includes(habitId)) {
            streak++;
            d.setDate(d.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

function getLongestStreak() {
    if (state.habits.length === 0) return 0;
    let maxStreak = 0;
    state.habits.forEach(h => {
        let s = getHabitStreak(h.id);
        if (s > maxStreak) maxStreak = s;
    });
    return maxStreak;
}

function getCompletionRate() {
    // Total possible: # habits * days since track start
    // We'll calculate 7-day completion rate instead for better UX
    if (state.habits.length === 0) return 0;

    let totalPossible = 0;
    let totalCompleted = 0;

    let d = new Date(state.currentDate);
    for (let i = 0; i < 7; i++) {
        let dStr = formatDate(d);
        totalPossible += state.habits.length;
        totalCompleted += (state.history[dStr] || []).length;
        d.setDate(d.getDate() - 1);
    }

    if (totalPossible === 0) return 0;
    return Math.round((totalCompleted / totalPossible) * 100);
}

// Check if user unlocked badges
function checkBadges() {
    if (!state.user.badges) state.user.badges = [];

    let newlyUnlocked = false;
    let maxS = getLongestStreak();
    let historyVals = Object.values(state.history);
    let totalDone = historyVals.reduce((acc, arr) => acc + arr.length, 0);

    // Calc category totals
    let healthTotal = 0, studyTotal = 0;
    historyVals.forEach(arr => {
        arr.forEach(hid => {
            let h = state.habits.find(hx => hx.id === hid);
            if (h) {
                if (h.category === 'health') healthTotal++;
                if (h.category === 'study') studyTotal++;
            }
        });
    });

    badges.forEach(b => {
        if (!state.user.badges.includes(b.id)) {
            let unlocked = false;
            if (b.type === 'total' && totalDone >= b.threshold) unlocked = true;
            if (b.type === 'streak' && maxS >= b.threshold) unlocked = true;
            if (b.type === 'cat_health' && healthTotal >= b.threshold) unlocked = true;
            if (b.type === 'cat_study' && studyTotal >= b.threshold) unlocked = true;

            if (unlocked) {
                state.user.badges.push(b.id);
                newlyUnlocked = true;
                showToast(`New badge unlocked: ${b.name}! 🏆`);
            }
        }
    });

    if (newlyUnlocked) saveData();
}

// UI Controllers
function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMsg').innerText = msg;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function updateStats() {
    document.getElementById('longestStreakLabel').innerText = getLongestStreak();
    document.getElementById('completionRateLabel').innerText = getCompletionRate() + '%';

    // Daily progress
    let todayStr = getTodayStr();
    let todayDone = (state.history[todayStr] || []).length;
    let total = state.habits.length;
    let pct = total === 0 ? 0 : (todayDone / total) * 100;

    document.getElementById('dailyProgressBar').style.width = pct + '%';
    document.getElementById('progressText').innerText = `${todayDone} / ${total} Completed`;

    let moti = document.getElementById('progressMotivational');
    if (total === 0) moti.innerText = "Add a habit to get started!";
    else if (pct === 0) moti.innerText = "Let's get started today!";
    else if (pct < 50) moti.innerText = "You're on your way!";
    else if (pct < 100) moti.innerText = "Almost there, keep going!";
    else moti.innerText = "Perfect day! You crushed it! 🎉";
}

function renderHabits() {
    const list = document.getElementById('habitList');
    const emptyState = document.getElementById('emptyHabitsState');
    let todayStr = getTodayStr();

    list.innerHTML = '';

    let filteredHabits = state.habits;
    if (state.currentFilter !== 'all') {
        filteredHabits = state.habits.filter(h => h.category === state.currentFilter);
    }

    if (filteredHabits.length === 0) {
        list.classList.add('hidden');
        emptyState.classList.remove('hidden');
    } else {
        list.classList.remove('hidden');
        emptyState.classList.add('hidden');

        filteredHabits.forEach(habit => {
            let isDone = (state.history[todayStr] || []).includes(habit.id);
            let streak = getHabitStreak(habit.id);

            let card = document.createElement('div');
            card.className = `habit-card cat-${habit.category} ${isDone ? 'completed' : ''}`;

            card.innerHTML = `
                <button class="check-btn" onclick="toggleHabit('${habit.id}')">
                    <i class="fa-solid fa-check"></i>
                </button>
                <div class="habit-icon">${habit.emoji}</div>
                <div class="habit-info">
                    <div class="habit-title">${habit.name}</div>
                    <div class="habit-meta">
                        <span class="category-badge">${habit.category}</span>
                        <span class="streak-indicator ${streak > 0 ? 'active-streak' : ''}">
                            <i class="fa-solid fa-fire"></i> ${streak}
                        </span>
                    </div>
                </div>
                <div class="habit-actions">
                    <button class="icon-btn" onclick="editHabit('${habit.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="icon-btn danger" onclick="deleteHabit('${habit.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            list.appendChild(card);
        });
    }
}

function renderCalendar() {
    const list = document.getElementById('calendarDays');
    list.innerHTML = '';

    let m = state.calendarDate.getMonth();
    let y = state.calendarDate.getFullYear();

    document.getElementById('monthYearDisplay').innerText = state.calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    let firstDay = new Date(y, m, 1).getDay();
    let daysInMonth = new Date(y, m + 1, 0).getDate();

    // Padding spaces
    for (let i = 0; i < firstDay; i++) {
        let el = document.createElement('div');
        el.className = 'calendar-day empty';
        list.appendChild(el);
    }

    let today = new Date();

    for (let i = 1; i <= daysInMonth; i++) {
        let d = new Date(y, m, i);
        let dStr = formatDate(d);

        let doneArr = state.history[dStr] || [];
        let totalH = state.habits.length;

        let classes = ['calendar-day'];
        if (d.toDateString() === today.toDateString()) classes.push('today');

        if (totalH > 0 && doneArr.length > 0) {
            if (doneArr.length >= totalH) classes.push('day-status-full');
            else classes.push('day-status-partial');
        }

        let el = document.createElement('div');
        el.className = classes.join(' ');
        el.innerText = i;
        list.appendChild(el);
    }
}

function renderBadges() {
    const grid = document.getElementById('badgesGrid');
    grid.innerHTML = '';

    let userBadges = state.user.badges || [];

    badges.forEach(b => {
        let isUnlocked = userBadges.includes(b.id);

        let div = document.createElement('div');
        div.className = `badge-card ${isUnlocked ? 'unlocked' : 'locked'}`;
        div.innerHTML = `
            <div class="badge-icon">${b.icon}</div>
            <h3 class="badge-title">${b.name}</h3>
            <p class="badge-desc">${b.desc}</p>
        `;
        grid.appendChild(div);
    });
}

// Actions
window.toggleHabit = (id) => {
    let todayStr = getTodayStr();
    if (!state.history[todayStr]) state.history[todayStr] = [];

    let idx = state.history[todayStr].indexOf(id);
    if (idx > -1) {
        state.history[todayStr].splice(idx, 1);
        showToast("Habit unchecked.");
    } else {
        state.history[todayStr].push(id);
        // Play small audio or visual cue (handled in css)
    }

    saveData();
    renderHabits();
    updateStats();
    checkBadges();
};

window.deleteHabit = (id) => {
    if (confirm("Are you sure you want to delete this habit? All history will be lost.")) {
        state.habits = state.habits.filter(h => h.id !== id);
        // clean history
        Object.keys(state.history).forEach(day => {
            state.history[day] = state.history[day].filter(hid => hid !== id);
        });
        saveData();
        renderHabits();
        updateStats();
        showToast("Habit deleted");
    }
};

window.editHabit = (id) => {
    let h = state.habits.find(x => x.id === id);
    if (h) {
        document.getElementById('habitId').value = h.id;
        document.getElementById('habitName').value = h.name;
        document.getElementById('habitEmoji').value = h.emoji;
        document.getElementById('habitCategory').value = h.category;
        document.getElementById('modalTitle').innerText = "Edit Habit";
        document.getElementById('habitModal').classList.add('active');
    }
};

// Initialization and Event Listeners
function init() {
    loadData();

    const loginOverlay = document.getElementById('loginOverlay');
    const appContainer = document.getElementById('appContainer');

    if (state.user && state.user.name) {
        startApp();
    } else {
        loginOverlay.classList.add('active');
        appContainer.classList.add('hidden');
    }

    // Login
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('usernameInput').value.trim();
        if (username) {
            state.user = { name: username, avatar: username.charAt(0).toUpperCase(), badges: [] };
            saveData();
            startApp();
        }
    });

    // Date display
    let options = { weekday: 'long', month: 'long', day: 'numeric' };
    document.getElementById('currentDateDisplay').innerText = state.currentDate.toLocaleDateString('en-US', options);

    // Filter clicks
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.currentFilter = e.target.getAttribute('data-filter');
            renderHabits();
        });
    });

    // Modal Handle
    const modal = document.getElementById('habitModal');
    const openModalBtn = document.getElementById('addHabitBtnTop');
    const openModalBtnEmpty = document.getElementById('emptyAddHabitBtn');

    const openModal = () => {
        document.getElementById('habitForm').reset();
        document.getElementById('habitId').value = "";
        document.getElementById('modalTitle').innerText = "Add New Habit";
        modal.classList.add('active');
    };

    openModalBtn.addEventListener('click', openModal);
    openModalBtnEmpty.addEventListener('click', openModal);

    document.querySelectorAll('.close-modal').forEach(b => {
        b.addEventListener('click', () => modal.classList.remove('active'));
    });

    // Save Habit
    document.getElementById('habitForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('habitId').value;
        const name = document.getElementById('habitName').value.trim();
        const emoji = document.getElementById('habitEmoji').value;
        const category = document.getElementById('habitCategory').value;

        if (id) {
            let h = state.habits.find(x => x.id === id);
            h.name = name; h.emoji = emoji; h.category = category;
            showToast("Habit updated");
        } else {
            state.habits.push({ id: generateId(), name, emoji, category, createdAt: new Date().toISOString() });
            showToast("Habit created");
        }

        saveData();
        renderHabits();
        updateStats();
        modal.classList.remove('active');
    });

    // Tabs
    document.querySelectorAll('.main-nav li').forEach(li => {
        li.addEventListener('click', (e) => {
            document.querySelectorAll('.main-nav li').forEach(l => l.classList.remove('active'));
            const target = e.currentTarget;
            target.classList.add('active');

            let tab = target.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.add('hidden'));
            document.getElementById('tab-' + tab).classList.remove('hidden');

            if (tab === 'calendar') renderCalendar();
            if (tab === 'achievements') renderBadges();
        });
    });

    // Calendar navigation
    document.getElementById('prevMonth').addEventListener('click', () => {
        state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
        renderCalendar();
    });
    document.getElementById('nextMonth').addEventListener('click', () => {
        state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
        renderCalendar();
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        if (confirm("Are you sure you want to log out? All data will be kept on this device.")) {
            state.user = null;
            saveData();
            location.reload();
        }
    });
}

function startApp() {
    document.getElementById('loginOverlay').classList.remove('active');
    document.getElementById('appContainer').classList.remove('hidden');

    document.getElementById('userNameDisplay').innerText = state.user.name;
    document.getElementById('userAvatar').innerText = state.user.name.charAt(0).toUpperCase();

    renderHabits();
    updateStats();
    checkBadges();
}

window.addEventListener('DOMContentLoaded', init);
