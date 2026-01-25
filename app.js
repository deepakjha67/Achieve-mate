
// Helper function to generate default lecture lists dynamically
function generateDefaultLectures(count) {
    return Array.from({ length: count }, (_, i) => ({
        id: Date.now() + i + Math.random(), // Unique ID
        title: `Lecture ${i + 1}`,
        done: false
    }));
}

window.appData = {
    // PRE-ADDED COURSES (User can delete these later)
    playlists: [
        {
            id: 101, // Static ID
            name: "Python Mastery",
            source: "YouTube",
            link: "https://www.youtube.com/playlist?list=PLsyeobzWxl7poL9JTVyndKe62ieoN-MZ3",
            videos: generateDefaultLectures(125) // Generates 125 lectures automatically
        },
        {
            id: 102,
            name: "Next js",
            source: "YouTube",
            link: "https://www.youtube.com/playlist?list=PLinedj3B30sDP2CHN5P0lDD64yYZ0Nn4J",
            videos: generateDefaultLectures(17) // Generates 17 lectures automatically
        }
    ],

    // PRE-ADDED GOALS FOR TODAY
    dailyGoals: [
        {
            id: 201,
            text: "Finish Maths chapter 2",
            done: false,
            date: new Date().toDateString() // Sets date to "Today" automatically
        },
        {
            id: 202,
            text: "Python Basics",
            done: false,
            date: new Date().toDateString()
        }
    ],

    // Standard App Defaults
    streak: 0, lastActive: null, history: {},
    focusLogs: [], totalFocusTime: 0, isNewUser: true, xp: 0, level: 1,
    focusEndTime: null, currentFocusTask: null, currentFocusDuration: 25,
    isPaused: false, remainingTimeOnPause: 0
};

let currentBadgeFilter = 'all';
let currentCourseFilter = 'all';
let calDate = new Date();
let focusInterval = null;
let currentTab = 'dashboard';
let openPlaylistId = null;


window.checkAuth = function (callback) {
    if (window.isUserLoggedIn && window.isUserLoggedIn()) {
        if (callback) callback();
        return true;
    } else {
        window.openAuthModal('login');
        return false;
    }
}


window.enableNotifications = function () {
    if (!("Notification" in window)) {
        alert("This browser does not support desktop notifications");
    } else if (Notification.permission === "granted") {
        window.showToast("Notifications already enabled!", "success");
        // Test notification
        new Notification("Achieve-mate", { body: "You're all set! We'll remind you at 8 AM & 8 PM." });
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(function (permission) {
            if (permission === "granted") {
                new Notification("Achieve-mate", { body: "Notifications enabled! We'll remind you at 8 AM/PM.", icon: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/check.svg" });
            }
        });
    }
}

function checkReminders() {
    const now = new Date();
    const hour = now.getHours();


    const today = now.toDateString();
    const key = `reminder_${today}_${hour}`;

    if (localStorage.getItem(key)) return; // Already notified this hour

    if (Notification.permission === "granted") {
        if (hour === 8) {
            new Notification("Good Morning!", {
                body: "☀️ Start your day by adding your goals for today! Keep your streak alive.",
                icon: "icon-192.png"
            });
            localStorage.setItem(key, 'true');
        } else if (hour === 20) { // 8 PM
            new Notification("Evening Check-in", {
                body: "🌙 Have you finished your tasks? Update your progress now!",
                icon: "icon-192.png"
            });
            localStorage.setItem(key, 'true');
        }
    }
}

setInterval(checkReminders, 10000);

window.togglePasswordVisibility = function () {
    const input = document.getElementById('auth-password');
    const icon = document.getElementById('togglePassword');
    if (input.type === "password") { input.type = "text"; icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
    else { input.type = "password"; icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
}

function init() {

    const local = localStorage.getItem('achieveMate_v12');
    if (local) {
        try {
            const saved = JSON.parse(local);
            window.appData = { ...window.appData, ...saved };
        } catch (e) {
            console.error("Data Parse Error", e);
        }
    }
    if (!window.appData.xp) window.appData.xp = 0;
    if (!window.appData.level) window.appData.level = 1;

    if (window.appData.isNewUser) document.getElementById('welcome-overlay').classList.add('active');


    const today = new Date().toDateString();
    const hasGoals = window.appData.dailyGoals.some(g => g.date === today);
    if (!hasGoals && !window.appData.isNewUser) {
        setTimeout(() => document.getElementById('morningPromptModal').classList.add('active'), 1000);
    }


    if (window.appData.focusEndTime || (window.appData.isPaused && window.appData.remainingTimeOnPause > 0)) {
        resumeFullScreenFocus();
    } else {
        window.appData.focusEndTime = null;
    }

    updateGreeting();
    refreshUI();
    updateActiveTabUI('dashboard');


}

window.closeWelcomeGuide = function () {
    document.getElementById('welcome-overlay').classList.remove('active');
    window.appData.isNewUser = false;
    window.saveData();
}

window.refreshUI = function () {
    renderGoals();
    renderConsistencyGraph();
    renderPlaylists();
    renderAchievements();
    renderCalendar();
    renderFocusHistory();
    updateXP();
    const streakEl = document.getElementById('headerStreak');
    if (streakEl) streakEl.textContent = window.appData.streak;
}

window.saveData = function () {
    localStorage.setItem('achieveMate_v12', JSON.stringify(window.appData));
    if (window.saveCloudData) window.saveCloudData();
}

function addXP(amount) {
    window.appData.xp += amount;
    if (window.appData.xp < 0) window.appData.xp = 0;

    if (amount > 0) {
        const float = document.createElement('div');
        float.className = 'floating-xp';
        float.textContent = `+${amount} XP`;
        float.style.left = '50%';
        float.style.top = '50%';
        float.style.transform = 'translate(-50%, -50%)';
        document.body.appendChild(float);
        setTimeout(() => float.remove(), 1500);

        const newLevel = Math.floor(window.appData.xp / 500) + 1;
        if (newLevel > window.appData.level) {
            window.appData.level = newLevel;
            window.showToast(`🎉 Level Up! You are now Level ${newLevel}`, 'success');
            triggerConfetti();
        }
    } else {
        const currentLevel = Math.floor(window.appData.xp / 500) + 1;
        if (currentLevel < window.appData.level) window.appData.level = currentLevel;
    }
    updateXP();
    window.saveData();
}

function updateXP() {
    const xp = window.appData.xp || 0;
    const level = window.appData.level || 1;
    const nextLevelXP = level * 500;
    const currentLevelStart = (level - 1) * 500;
    const progress = ((xp - currentLevelStart) / 500) * 100;
    const clampedProgress = Math.max(0, Math.min(100, progress));

    const titleEl = document.getElementById('levelTitle');
    if (titleEl) titleEl.textContent = level;

    const xpDisplayEl = document.getElementById('xpDisplay');
    if (xpDisplayEl) xpDisplayEl.textContent = `${xp} XP`;

    const nextEl = document.getElementById('xpToNext');
    if (nextEl) nextEl.textContent = `${nextLevelXP - xp} XP to Level ${level + 1}`;

    const circleFg = document.getElementById('levelCircleFg');
    if (circleFg) {
        const offset = 283 - (283 * clampedProgress / 100);
        circleFg.style.strokeDasharray = '283';
        circleFg.style.strokeDashoffset = offset;
    }

    const dashLevelEl = document.getElementById('dashboardLevelDisplay');
    if (dashLevelEl) dashLevelEl.textContent = level;
    const dashXpEl = document.getElementById('dashboardXPDisplay');
    if (dashXpEl) dashXpEl.textContent = `${xp} XP`;
    const dashBarEl = document.getElementById('dashboardLevelBar');
    if (dashBarEl) dashBarEl.style.width = `${clampedProgress}%`;
    if (dashBarEl) dashBarEl.style.backgroundColor = "var(--primary)";

    const quoteEl = document.getElementById('motivationalQuote');
    if (quoteEl) {
        const quotes = [
            "Keep growing!", "You're doing great!", "Consistent effort pays off.",
            "Level up your skills!", "Almost there!", "Stay focused, stay sharp.",
            "Success is a journey.", "One step at a time."
        ];
        quoteEl.textContent = quotes[level % quotes.length];
    }
}


window.switchTab = function (id) {
    currentTab = id;
    document.querySelectorAll('.view-section').forEach(e => e.style.display = 'none');
    const view = document.getElementById(id + '-view');
    if (view) view.style.display = 'block';
    updateActiveTabUI(id);
}

function updateActiveTabUI(id) {
    document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(e => e.classList.remove('active'));
    const pcNav = document.getElementById('nav-' + id);
    const mobNav = document.getElementById('mob-' + id);
    if (pcNav) pcNav.classList.add('active');
    if (mobNav) mobNav.classList.add('active');
}

window.openAuthModal = function (mode = 'signup') {
    document.getElementById('auth-overlay').style.display = 'flex';
    window.toggleAuthMode(mode);
}

window.toggleAuthMode = function (mode) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + mode).classList.add('active');

    const container = document.getElementById('authTabsContainer');
    const btn = document.getElementById('auth-btn');
    const fp = document.getElementById('forgot-pass-container');
    const switchSignup = document.getElementById('switch-to-signup');
    const switchLogin = document.getElementById('switch-to-login');

    if (mode === 'signup') {
        container.classList.add('signup-active');
        btn.textContent = "Create Account";
        fp.style.visibility = 'hidden';
        switchSignup.style.display = 'none';
        switchLogin.style.display = 'block';
    } else {
        container.classList.remove('signup-active');
        btn.textContent = "Login";
        fp.style.visibility = 'visible';
        switchSignup.style.display = 'block';
        switchLogin.style.display = 'none';
    }
}


window.addGoal = function () {
    const txt = document.getElementById('newGoalInput').value.trim();
    if (!txt) return;
    window.appData.dailyGoals.push({ id: Date.now(), text: txt, done: false, date: new Date().toDateString() });
    document.getElementById('newGoalInput').value = '';
    window.saveData();
    window.refreshUI();
    renderManageGoalsList();
}

window.toggleGoal = function (id) {
    const g = window.appData.dailyGoals.find(x => x.id === id);
    if (g) {
        g.done = !g.done;
        const xpAmount = 20;
        if (g.done) {
            triggerConfetti();
            updateStreak();
            addXP(xpAmount);
            logActivity('Goal', g.text, xpAmount);
        } else {
            addXP(-xpAmount);
            unlogActivity('Goal', g.text);
        }
        window.saveData();
        window.refreshUI();
    }
}

window.deleteGoal = function (id) {
    window.appData.dailyGoals = window.appData.dailyGoals.filter(x => x.id !== id);
    window.saveData();
    window.refreshUI();
    renderManageGoalsList();
}

function renderGoals() {
    const today = new Date().toDateString();
    const list = document.getElementById('dashboardGoalsList');
    const goals = window.appData.dailyGoals.filter(g => g.date === today);
    const emptyMsg = document.getElementById('emptyGoalsMsg');

    if (list) {
        list.innerHTML = '';
        if (goals.length === 0) {
            if (emptyMsg) emptyMsg.style.display = 'block';
        } else {
            if (emptyMsg) emptyMsg.style.display = 'none';
            goals.forEach(g => {
                const div = document.createElement('div');
                div.className = `priority-item ${g.done ? 'checked' : ''}`;
                div.onclick = () => window.toggleGoal(g.id);
                div.innerHTML = `<div class="priority-checkbox">${g.done ? '<i class="fas fa-check"></i>' : ''}</div><div class="priority-text">${g.text}</div>`;
                list.appendChild(div);
            });
        }
    }
    const done = goals.filter(g => g.done).length;
    const pctEl = document.getElementById('goalPct');
    if (pctEl) pctEl.textContent = goals.length ? Math.round((done / goals.length) * 100) + '%' : '0%';
}

function renderManageGoalsList() {
    const today = new Date().toDateString();
    const list = document.getElementById('manageGoalsList');
    const goals = window.appData.dailyGoals.filter(g => g.date === today);
    if (list) {
        list.innerHTML = goals.map(g => `
            <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid var(--border);">
                <span>${g.text}</span>
                <button class="btn-icon-only" style="color:var(--danger)" onclick="deleteGoal(${g.id})"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');
    }
}

function renderConsistencyGraph() {
    const container = document.getElementById('consistencyGraph');
    if (!container) return;
    container.innerHTML = '';
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const goals = window.appData.dailyGoals.filter(g => g.date === d.toDateString());
        const pct = goals.length ? (goals.filter(g => g.done).length / goals.length) * 100 : 0;
        container.innerHTML += `<div class="graph-col"><div style="height:100%; width:10px; background:rgba(255,255,255,0.05); border-radius:10px; display:flex; align-items:flex-end;"><div class="graph-bar" style="height:${pct}%"></div></div><div class="graph-label">${days[d.getDay()]}</div></div>`;
    }
}


window.autoGenerateLectures = function (inputId, targetTextareaId) {
    const count = parseInt(document.getElementById(inputId).value);
    const textarea = document.getElementById(targetTextareaId);

    if (!count || count <= 0) {
        return;
    }

    let text = "";
    for (let i = 1; i <= count; i++) {
        text += `Lecture ${i}\n`;
    }

    textarea.value = text;
}

window.savePlaylist = function (e) {
    e.preventDefault();
    const videos = document.getElementById('plVideos').value.split('\n').filter(v => v.trim()).map(v => ({ id: Date.now() + Math.random(), title: v, done: false }));
    const link = document.getElementById('plLink').value;
    window.appData.playlists.push({ id: Date.now(), name: document.getElementById('plName').value, source: document.getElementById('plSource').value, link: link, videos });
    window.closeModal('addPlaylistModal');
    window.saveData();
    window.refreshUI();
}

window.openModal = function (id) {
    document.getElementById(id).classList.add('active');
    if (id === 'manageGoalsModal') renderManageGoalsList();
    if (id === 'addPlaylistModal') {
        document.getElementById('addCourseForm').reset();
        document.getElementById('plVideos').value = ""; // Clear manually
    }
}
window.closeModal = function (id) { document.getElementById(id).classList.remove('active'); }

window.toggleVideo = function (plId, vId, event) {
    const pl = window.appData.playlists.find(p => p.id === plId);
    const v = pl.videos.find(x => x.id === vId);
    v.done = !v.done;
    const xpAmount = 50;

    if (v.done) {
        triggerConfetti();
        updateStreak();
        addXP(xpAmount);
        logActivity('Study', `${pl.name}: ${v.title}`, xpAmount);
    } else {
        addXP(-xpAmount);
        unlogActivity('Study', `${pl.name}: ${v.title}`);
    }

    window.saveData();

    const btn = event ? event.currentTarget : null;
    if (btn) {
        if (v.done) btn.classList.add('checked'); else btn.classList.remove('checked');
        const checkIcon = btn.querySelector('.priority-checkbox');
        if (checkIcon) checkIcon.innerHTML = v.done ? '<i class="fas fa-check"></i>' : '';

        const card = btn.closest('.course-card');
        if (card) {
            const doneCount = pl.videos.filter(v => v.done).length;
            const totalCount = pl.videos.length;
            const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
            const bar = card.querySelector('.course-progress-area div div');
            const text = card.querySelector('.progress-text span:last-child');
            const meta = card.querySelector('.course-meta span');

            if (bar) bar.style.width = `${pct}%`;
            if (text) text.textContent = `${pct}%`;
            if (meta) meta.textContent = `${doneCount} / ${totalCount} Completed`;
        }
    }
}

window.openEditPlaylist = function (id) {
    const pl = window.appData.playlists.find(p => p.id === id);
    document.getElementById('editPlId').value = id;
    document.getElementById('editPlName').value = pl.name;
    document.getElementById('editPlLink').value = pl.link || '';
    document.getElementById('editPlVideos').value = pl.videos.map(v => v.title).join('\n');
    document.getElementById('genCountEdit').value = "";
    document.getElementById('editPlaylistModal').classList.add('active');
}

window.updatePlaylist = function () {
    const id = parseInt(document.getElementById('editPlId').value);
    const pl = window.appData.playlists.find(p => p.id === id);
    pl.name = document.getElementById('editPlName').value;
    pl.link = document.getElementById('editPlLink').value;
    const lines = document.getElementById('editPlVideos').value.split('\n').filter(v => v.trim());
    pl.videos = lines.map(title => {
        const existing = pl.videos.find(v => v.title === title);
        return existing ? existing : { id: Date.now() + Math.random(), title, done: false };
    });
    window.closeModal('editPlaylistModal'); window.saveData(); window.refreshUI();
}

window.deletePlaylist = function () {
    const id = parseInt(document.getElementById('editPlId').value);
    if (confirm("Delete this course?")) {
        window.appData.playlists = window.appData.playlists.filter(p => p.id !== id);
        window.closeModal('editPlaylistModal'); window.saveData(); window.refreshUI();
    }
}

window.filterCourses = function (filter, btn) {
    currentCourseFilter = filter;
    document.querySelectorAll('.course-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderPlaylists();
}

window.toggleAccordion = function (id) {
    openPlaylistId = openPlaylistId === id ? null : id;
    renderPlaylists();
}

function renderPlaylists() {
    const div = document.getElementById('playlistsContainer');
    if (!div) return;
    div.innerHTML = '';
    let totalV = 0, doneV = 0;
    let filteredList = window.appData.playlists;

    const searchTerm = document.getElementById('courseSearch')?.value.toLowerCase() || '';
    if (searchTerm) {
        filteredList = filteredList.filter(p => p.name.toLowerCase().includes(searchTerm));
    }

    if (currentCourseFilter === 'active') filteredList = filteredList.filter(p => { const d = p.videos.filter(v => v.done).length; return d > 0 && d < p.videos.length; });
    if (currentCourseFilter === 'completed') filteredList = filteredList.filter(p => { const d = p.videos.filter(v => v.done).length; return d === p.videos.length && p.videos.length > 0; });

    filteredList = [...filteredList].sort((a, b) => b.id - a.id);

    window.appData.playlists.forEach(pl => { totalV += pl.videos.length; doneV += pl.videos.filter(v => v.done).length; });
    const topicPct = document.getElementById('topicPct');
    if (topicPct) topicPct.textContent = totalV ? Math.round((doneV / totalV) * 100) + '%' : '0%';


    if (!searchTerm && window.appData.playlists.length === 0) {
        div.innerHTML += `
            <div class="add-course-card" onclick="openModal('addPlaylistModal')">
                <div class="add-course-icon"><i class="fas fa-plus-circle"></i></div>
                <div class="add-course-text">Create New Course</div>
            </div>
        `;
    }

    if (filteredList.length === 0 && searchTerm) { div.innerHTML += `<div style="text-align:center; color:var(--text-muted); grid-column: 1/-1; padding: 2rem;">No courses found.</div>`; return; }

    filteredList.forEach(pl => {
        const done = pl.videos.filter(v => v.done).length;
        const total = pl.videos.length;
        const pct = total ? Math.round((done / total) * 100) : 0;
        const linkBtn = pl.link ? `<a href="${pl.link}" target="_blank" class="course-edit-btn btn-link-external" onclick="event.stopPropagation()"><i class="fas fa-external-link-alt"></i></a>` : '';
        const isOpen = pl.id === openPlaylistId ? 'open' : '';

        div.innerHTML += `
            <div class="course-card">
                <div class="course-header" onclick="toggleAccordion(${pl.id})">
                    <div class="course-header-top">
                        <div class="course-title"><i class="fas fa-chevron-down" style="transform: ${isOpen ? 'rotate(180deg)' : 'rotate(0deg)'}"></i>${pl.name}</div>
                        <div class="course-badge">${pl.source}</div>
                    </div>
                    <div class="course-meta"><span>${done} / ${total} Completed</span></div>
                    <div class="course-actions-container">${linkBtn}<div class="course-edit-btn" onclick="event.stopPropagation(); openEditPlaylist(${pl.id})"><i class="fas fa-edit"></i></div></div>
                </div>
                <div class="course-progress-area">
                    <div style="height:6px; background:var(--bg-body); border-radius:3px; overflow:hidden;"><div style="height:100%; background:var(--success); width:${pct}%"></div></div>
                    <div class="progress-text"><span>Progress</span><span>${pct}%</span></div>
                </div>
                <div class="video-accordion ${isOpen}">
                    ${pl.videos.map(v => `<div class="priority-item ${v.done ? 'checked' : ''}" style="border-radius:0; border:none; border-bottom:1px solid var(--border);" onclick="toggleVideo(${pl.id}, ${v.id}, event)"><div class="priority-checkbox" style="width:18px; height:18px; font-size:10px;">${v.done ? '<i class="fas fa-check"></i>' : ''}</div><div class="priority-text" style="font-size:0.9rem;">${v.title}</div></div>`).join('')}
                </div>
            </div>`;
    });
}

window.filterBadges = function (cat, btn) {
    currentBadgeFilter = cat;
    document.querySelectorAll('.ach-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderAchievements();
}

const BADGES = [
    { id: 's3', cat: 'streak', n: 'Streak 3', d: '3 Day Streak', t: 3, c: d => d.streak },
    { id: 's7', cat: 'streak', n: 'Streak 7', d: '7 Day Streak', t: 7, c: d => d.streak },
    { id: 's30', cat: 'streak', n: 'Streak 30', d: '30 Day Streak', t: 30, c: d => d.streak },
    { id: 's50', cat: 'streak', n: 'Streak 50', d: '50 Day Streak', t: 50, c: d => d.streak },
    { id: 's100', cat: 'streak', n: 'Streak 100', d: '100 Day Streak', t: 100, c: d => d.streak },
    { id: 's150', cat: 'streak', n: 'Streak 150', d: '150 Day Streak', t: 150, c: d => d.streak },
    { id: 's200', cat: 'streak', n: 'Streak 200', d: '200 Day Streak', t: 200, c: d => d.streak },
    { id: 's365', cat: 'streak', n: 'Legend', d: '365 Day Streak', t: 365, c: d => d.streak },
    { id: 'c1', cat: 'playlist', n: 'Creator', d: 'Create 1 Course', t: 1, c: d => d.playlists.length },
    { id: 'f1', cat: 'playlist', n: 'Finisher', d: 'Finish 1 Course', t: 1, c: d => d.playlists.filter(p => p.videos.length > 0 && p.videos.every(v => v.done)).length },
    { id: 'f5', cat: 'playlist', n: 'Scholar', d: 'Finish 5 Courses', t: 5, c: d => d.playlists.filter(p => p.videos.length > 0 && p.videos.every(v => v.done)).length },
    { id: 'f10', cat: 'playlist', n: 'Master', d: 'Finish 10 Courses', t: 10, c: d => d.playlists.filter(p => p.videos.length > 0 && p.videos.every(v => v.done)).length },
    { id: 'f25', cat: 'playlist', n: 'Grandmaster', d: 'Finish 25 Courses', t: 25, c: d => d.playlists.filter(p => p.videos.length > 0 && p.videos.every(v => v.done)).length },
    { id: 't5', cat: 'focus', n: 'Focus 5', d: '5 Hours Focused', t: 300, c: d => (d.totalFocusTime || 0) },
    { id: 't10', cat: 'focus', n: 'Focus 10', d: '10 Hours Focused', t: 600, c: d => (d.totalFocusTime || 0) },
    { id: 't25', cat: 'focus', n: 'Focus 25', d: '25 Hours Focused', t: 1500, c: d => (d.totalFocusTime || 0) },
    { id: 't50', cat: 'focus', n: 'Focus 50', d: '50 Hours Focused', t: 3000, c: d => (d.totalFocusTime || 0) }
];

function renderAchievements() {
    const grid = document.getElementById('achievementsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    let mapped = BADGES.map(b => {
        const val = b.c(window.appData);
        const earned = val >= b.t;
        const pct = Math.min(100, Math.round((val / b.t) * 100));
        return { ...b, earned, val, pct };
    });
    mapped.sort((a, b) => b.earned - a.earned);
    if (currentBadgeFilter !== 'all') mapped = mapped.filter(b => b.cat === currentBadgeFilter);

    mapped.forEach(b => {
        grid.innerHTML += `
            <div class="ach-card ${b.earned ? 'earned' : ''}">
                <div class="ach-icon"><i class="fas ${b.cat === 'streak' ? 'fa-fire' : b.cat === 'focus' ? 'fa-clock' : 'fa-graduation-cap'}"></i></div>
                <div class="ach-info" style="flex:1">
                    <h4>${b.n}</h4>
                    <p>${b.d}</p>
                    ${!b.earned ? `<div class="ach-progress"><div class="ach-fill" style="width:${b.pct}%"></div></div>` : '<div style="font-size:0.7rem; color:var(--success); margin-top:4px;"><i class="fas fa-check"></i> Unlocked</div>'}
                </div>
            </div>`;
    });

    const earnedCount = mapped.filter(b => b.earned).length;
    const countEl = document.getElementById('badgeCount');
    if (countEl) countEl.textContent = `${earnedCount} / 17`;

    const lastEarned = mapped.find(b => b.earned);
    const recentEl = document.getElementById('recentBadgeContent');
    if (recentEl) {
        if (lastEarned) {
            recentEl.innerHTML = `<div style="display:flex; gap:15px; align-items:center;"><div style="font-size:2rem; color:var(--accent);"><i class="fas fa-trophy"></i></div><div><div style="font-weight:600">${lastEarned.n}</div><div style="font-size:0.8rem; color:var(--text-muted)">Unlocked</div></div></div>`;
        } else {
            recentEl.innerHTML = `<div style="color:var(--text-muted);">Keep working to unlock badges!</div>`;
        }
    }
}


window.changeMonth = function (dir) {
    calDate.setMonth(calDate.getMonth() + dir);
    renderCalendar();
}

function renderCalendar() {
    const y = calDate.getFullYear(), m = calDate.getMonth();
    const monthEl = document.getElementById('calMonthYear');
    if (monthEl) monthEl.textContent = calDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const grid = document.getElementById('calGrid');
    if (!grid) return;
    grid.innerHTML = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<div style="text-align:center; font-size:0.7rem; color:var(--text-muted);">${d}</div>`).join('');

    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) grid.innerHTML += `<div></div>`;

    for (let i = 1; i <= daysInMonth; i++) {
        const dString = new Date(y, m, i).toLocaleDateString('en-CA');
        const hasData = window.appData.history[dString] && window.appData.history[dString].length > 0; // Check if length > 0 because we might delete logs
        const isToday = new Date().toDateString() === new Date(y, m, i).toDateString();
        grid.innerHTML += `<div class="cal-day ${isToday ? 'today' : ''} ${hasData ? 'has-data' : ''}" onclick="showActivity('${dString}')">${i}${hasData ? '<div class="cal-dot"></div>' : ''}</div>`;
    }
}

window.showActivity = function (dateStr) {
    const dateEl = document.getElementById('selectedDateDisplay');
    if (dateEl) dateEl.textContent = new Date(dateStr).toDateString();
    const div = document.getElementById('activityLogContainer');
    const logs = window.appData.history[dateStr] || [];

    if (!logs.length) {
        div.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-muted);">No activity recorded for this date.</div>`;
        return;
    }

    const studies = logs.filter(l => l.type === 'Study');
    const goals = logs.filter(l => l.type === 'Goal');
    const focus = logs.filter(l => l.type === 'Focus');

    const studyGroups = {};
    studies.forEach(s => {
        let [course, ...topic] = s.title.split(':');
        topic = topic.join(':').trim();
        const xp = s.xp ? `<span class="xp-pill">+${s.xp} XP</span>` : '';
        if (!course) return;
        if (!studyGroups[course.trim()]) studyGroups[course.trim()] = [];
        studyGroups[course.trim()].push({ title: topic || "General Study", xp: xp });
    });

    let html = '';
    if (goals.length) html += `<div class="activity-group type-goal"><div class="group-header">Goals (${goals.length})</div><div class="group-items show">${goals.map(g => `<div>${g.title}</div>`).join('')}</div></div>`;
    for (const [course, items] of Object.entries(studyGroups)) {
        html += `<div class="activity-group type-study"><div class="group-header">${course} (${items.length})</div><div class="group-items show">${items.map(t => `<div>${t.title}</div>`).join('')}</div></div>`;
    }
    if (focus.length) html += `<div class="activity-group"><div class="group-header">Focus (${focus.length})</div><div class="group-items show">${focus.map(f => `<div>${f.title}</div>`).join('')}</div></div>`;

    div.innerHTML = html;
}

function logActivity(type, title, xp = 0) {
    const d = new Date().toLocaleDateString('en-CA');
    if (!window.appData.history[d]) window.appData.history[d] = [];


    const exists = window.appData.history[d].some(x => x.type === type && x.title === title);
    if (exists) return;

    window.appData.history[d].unshift({ type, title, xp, time: new Date().toLocaleTimeString() });
    renderCalendar();
}

function unlogActivity(type, title) {
    const d = new Date().toLocaleDateString('en-CA');
    if (window.appData.history[d]) {
        window.appData.history[d] = window.appData.history[d].filter(x => !(x.type === type && x.title === title));
        if (window.appData.history[d].length === 0) delete window.appData.history[d];
    }
    renderCalendar();
}


window.startFullScreenFocus = function () {
    const task = document.getElementById('focusTaskInput').value || "Deep Work";
    const mins = parseInt(document.getElementById('customFocusTime').value) || 25;


    const now = Date.now();
    const endTime = now + (mins * 60 * 1000);

    window.appData.focusEndTime = endTime;
    window.appData.currentFocusTask = task;
    window.appData.currentFocusDuration = mins;
    window.appData.isPaused = false;
    window.appData.remainingTimeOnPause = 0;

    window.saveData();
    resumeFullScreenFocus();
}

window.toggleFocusPause = function () {
    if (window.appData.isPaused) {

        window.appData.isPaused = false;

        window.appData.focusEndTime = Date.now() + window.appData.remainingTimeOnPause;
        window.appData.remainingTimeOnPause = 0;
        window.saveData();
        resumeFullScreenFocus();
    } else {

        window.appData.isPaused = true;
        const remaining = window.appData.focusEndTime - Date.now();
        window.appData.remainingTimeOnPause = remaining > 0 ? remaining : 0;
        window.saveData();


        if (focusInterval) clearInterval(focusInterval);


        document.getElementById('focusPauseBtn').textContent = "Start";
        document.getElementById('focusPauseBtn').classList.remove('btn-warning');
        document.getElementById('focusPauseBtn').classList.add('btn-success');

    }
}

function resumeFullScreenFocus() {
    const task = window.appData.currentFocusTask || "Deep Work";
    document.getElementById('overlayTask').textContent = task;
    document.getElementById('focus-overlay').classList.add('active');


    if (window.appData.isPaused) {
        document.getElementById('focusPauseBtn').textContent = "Start";
        document.getElementById('focusPauseBtn').classList.remove('btn-warning');
        document.getElementById('focusPauseBtn').classList.add('btn-success');

        const secs = Math.ceil(window.appData.remainingTimeOnPause / 1000);
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        document.getElementById('overlayTimer').textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
        return;
    }


    document.getElementById('focusPauseBtn').textContent = "Pause";
    document.getElementById('focusPauseBtn').classList.remove('btn-success');
    document.getElementById('focusPauseBtn').classList.add('btn-warning');

    if (focusInterval) clearInterval(focusInterval);

    focusInterval = setInterval(() => {
        const now = Date.now();
        const remaining = window.appData.focusEndTime - now;

        if (remaining <= 0) {
            window.completeFocusSession();
        } else {
            const secs = Math.ceil(remaining / 1000);
            const m = Math.floor(secs / 60);
            const s = secs % 60;
            document.getElementById('overlayTimer').textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
        }
    }, 1000);
}

window.completeFocusSession = function () {
    clearInterval(focusInterval);
    document.getElementById('overlayTimer').textContent = "0:00";

    if (window.appData.focusEndTime) {
        const mins = window.appData.currentFocusDuration || 25;
        const task = window.appData.currentFocusTask || "Deep Work";

        alert("Session Complete!");
        triggerConfetti();

        window.appData.totalFocusTime = (window.appData.totalFocusTime || 0) + mins;
        const xpAmount = mins * 5;
        addXP(xpAmount);

        window.appData.focusLogs.unshift({ date: new Date().toLocaleString(), task, duration: mins });
        logActivity('Focus', `${mins}m: ${task}`, xpAmount);

        window.appData.focusEndTime = null;
        window.appData.currentFocusTask = null;
        window.appData.isPaused = false;
        window.appData.remainingTimeOnPause = 0;

        window.saveData();
        window.refreshUI();
    }
    window.stopFullScreenFocus();
}

window.stopFullScreenFocus = function () {
    clearInterval(focusInterval);
    document.getElementById('focus-overlay').classList.remove('active');

    window.appData.focusEndTime = null;
    window.appData.isPaused = false;
    window.appData.remainingTimeOnPause = 0;
    window.saveData();
}

function renderFocusHistory() {
    const historyList = document.getElementById('focusHistoryList');
    if (historyList) {
        historyList.innerHTML = window.appData.focusLogs.map(f => `
            <div style="padding:10px; border-bottom:1px solid var(--border);">
                <div style="font-weight:600">${f.task}</div>
                <div style="font-size:0.8rem; color:var(--text-muted);">${f.duration}m • ${f.date}</div>
            </div>
        `).join('');
    }
}


function updateStreak() {
    const today = new Date().toDateString();
    if (window.appData.lastActive !== today) {
        const yest = new Date(); yest.setDate(yest.getDate() - 1);
        if (window.appData.lastActive === yest.toDateString()) window.appData.streak++;
        else window.appData.streak = 1;
        window.appData.lastActive = today;
    }
}

function updateGreeting() {
    const h = new Date().getHours();
    document.getElementById('greetingText').textContent = h < 12 ? "Good Morning!" : h < 18 ? "Good Afternoon!" : "Good Evening!";
    document.getElementById('dateDisplay').textContent = new Date().toDateString();
}

function triggerConfetti() {
    for (let i = 0; i < 30; i++) {
        const c = document.createElement('div'); c.className = 'confetti';
        c.style.left = Math.random() * 100 + 'vw'; c.style.backgroundColor = ['#f00', '#0f0', '#00f', '#ff0'][Math.floor(Math.random() * 4)];
        c.style.animation = `confetti ${1 + Math.random()}s linear`;
        document.body.appendChild(c); setTimeout(() => c.remove(), 2000);
    }
}

window.exportData = function () {
    const a = document.createElement('a'); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(window.appData));
    a.download = "achieve_backup.json"; document.body.appendChild(a); a.click(); a.remove();
}

window.importData = function (input) {
    const f = input.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = e => { try { window.appData = JSON.parse(e.target.result); window.saveData(); alert("Success"); } catch (e) { alert("Error"); } };
    r.readAsText(f);
}


if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('SW registered'))
            .catch(err => console.log('SW registration failed', err));
    });
}

init();