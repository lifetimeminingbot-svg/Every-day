import { db } from './firebase.js';

const ROUTINE_KEY = 'everyday_routine_tasks_v1';
const HISAB_KEY = 'everyday_routine_hisab_v1';
const BUDGET_KEY = 'everyday_routine_budget_v1';

let currentLang = 'bn';
let currentFreqFilter = 'all';
let currentHisabFilter = 'all';

let routines = loadJson(ROUTINE_KEY, []);
let entries = loadJson(HISAB_KEY, []);
let monthlyBudget = Number(localStorage.getItem(BUDGET_KEY) || 0);

function loadJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function saveRoutines() {
    localStorage.setItem(ROUTINE_KEY, JSON.stringify(routines));
}

function saveHisab() {
    localStorage.setItem(HISAB_KEY, JSON.stringify(entries));
}

function formatMoney(num) {
    const val = Number(num || 0);
    return `৳ ${val.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')}`;
}

function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

function getTimeGreeting(lang) {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return lang === 'bn' ? 'শুভ সকাল' : 'Good Morning';
    if (hour >= 12 && hour < 17) return lang === 'bn' ? 'শুভ দুপুর' : 'Good Afternoon';
    if (hour >= 17 && hour < 21) return lang === 'bn' ? 'শুভ সন্ধ্যা' : 'Good Evening';
    return lang === 'bn' ? 'শুভ রাত্রি' : 'Good Night';
}

function updateGreeting() {
    const badge = document.getElementById('greetingBadge');
    if (badge) badge.textContent = getTimeGreeting(currentLang);
}

function updateDateDisplay() {
    const dateEl = document.getElementById('currentDateDisplay');
    if (!dateEl) return;

    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = now.toLocaleDateString(currentLang === 'bn' ? 'bn-BD' : 'en-US', options);
}

function freqLabel(freq) {
    const map = {
        bn: { daily: 'দৈনিক', weekly: 'সাপ্তাহিক', monthly: 'মাসিক', custom: 'কাস্টম' },
        en: { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', custom: 'Custom' }
    };
    return map[currentLang][freq] || freq;
}

function hisabTypeLabel(type) {
    const map = {
        bn: {
            expense: 'ব্যয়',
            income: 'আয়',
            savings: 'সঞ্চয়',
            borrowed: 'ধার নিয়েছি',
            lent: 'ধার দিয়েছি'
        },
        en: {
            expense: 'Expense',
            income: 'Income',
            savings: 'Savings',
            borrowed: 'Borrowed',
            lent: 'Lent'
        }
    };
    return map[currentLang][type] || type;
}

function renderRoutines() {
    const total = routines.length;
    const completedCount = routines.filter(r => r.completed).length;

    const homeCountEl = document.getElementById('homeTaskCount');
    if (homeCountEl) homeCountEl.textContent = `${completedCount} / ${total}`;

    const statsEl = document.getElementById('routineStatsText');
    if (statsEl) {
        statsEl.textContent = currentLang === 'bn'
            ? `মোট কাজ: ${total} | সম্পন্ন: ${completedCount}`
            : `Total: ${total} | Completed: ${completedCount}`;
    }

    const previewEl = document.getElementById('homeRoutinePreview');
    if (previewEl) {
        const pending = routines.filter(r => !r.completed).slice(0, 3);
        if (pending.length === 0) {
            previewEl.innerHTML = `<div class="empty-state">${
                currentLang === 'bn'
                    ? 'কোনো পেন্ডিং কাজ নেই। "নতুন রুটিন" বাটনে ক্লিক করে কাজ যোগ করুন।'
                    : 'No pending tasks. Click "Add Routine" to add a task.'
            }</div>`;
        } else {
            previewEl.innerHTML = pending.map(item => `
                <div class="task-item">
                    <div class="task-left">
                        <button class="task-check-btn" data-toggle-id="${item.id}" aria-label="Complete"></button>
                        <div>
                            <div class="task-title">${escapeHtml(item.title)}</div>
                            <div class="task-meta">
                                <span class="freq-pill">${freqLabel(item.freq)}</span>
                                ${item.time ? `<span>⏰ ${escapeHtml(item.time)}</span>` : ''}
                                ${item.customLabel ? `<span>🏷️ ${escapeHtml(item.customLabel)}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    const activeListEl = document.getElementById('activeTasksList');
    const completedListEl = document.getElementById('completedTasksList');

    const filtered = currentFreqFilter === 'all'
        ? routines
        : routines.filter(r => r.freq === currentFreqFilter);

    const activeItems = filtered.filter(r => !r.completed);
    const completedItems = filtered.filter(r => r.completed);

    if (activeListEl) {
        activeListEl.innerHTML = activeItems.length === 0
            ? `<div class="empty-state">${currentLang === 'bn' ? 'এই ক্যাটাগরিতে কোনো চলমান কাজ নেই।' : 'No active tasks in this category.'}</div>`
            : activeItems.map(item => renderTaskRow(item, false)).join('');
    }

    if (completedListEl) {
        completedListEl.innerHTML = completedItems.length === 0
            ? `<div class="empty-state">${currentLang === 'bn' ? 'এখনো কোনো কাজ সম্পন্ন হয়নি।' : 'No completed tasks yet.'}</div>`
            : completedItems.map(item => renderTaskRow(item, true)).join('');
    }
}

function renderTaskRow(item, isDone) {
    return `
        <div class="task-item">
            <div class="task-left">
                <button class="task-check-btn ${isDone ? 'checked' : ''}" data-toggle-id="${item.id}" aria-label="Toggle">
                    ${isDone ? '<i class="ph-bold ph-check"></i>' : ''}
                </button>
                <div>
                    <div class="task-title ${isDone ? 'done-text' : ''}">${escapeHtml(item.title)}</div>
                    <div class="task-meta">
                        <span class="freq-pill">${freqLabel(item.freq)}</span>
                        ${item.time ? `<span>⏰ ${escapeHtml(item.time)}</span>` : ''}
                        ${item.customLabel ? `<span>🏷️ ${escapeHtml(item.customLabel)}</span>` : ''}
                    </div>
                </div>
            </div>
            <button class="delete-task-btn" data-delete-id="${item.id}" title="Delete">
                <i class="ph ph-trash"></i>
            </button>
        </div>
    `;
}

function renderHisab() {
    const today = getTodayStr();
    const currentMonthPrefix = today.slice(0, 7);

    const incomeTotal = entries.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0);
    const expenseTotal = entries.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0);
    const savingsTotal = entries.filter(e => e.type === 'savings').reduce((s, e) => s + Number(e.amount), 0);
    const borrowedTotal = entries.filter(e => e.type === 'borrowed').reduce((s, e) => s + Number(e.amount), 0);
    const lentTotal = entries.filter(e => e.type === 'lent').reduce((s, e) => s + Number(e.amount), 0);

    const balance = incomeTotal + borrowedTotal - expenseTotal - savingsTotal - lentTotal;
    const todayExpense = entries
        .filter(e => e.type === 'expense' && e.date === today)
        .reduce((s, e) => s + Number(e.amount), 0);

    const monthExpense = entries
        .filter(e => e.type === 'expense' && String(e.date || '').startsWith(currentMonthPrefix))
        .reduce((s, e) => s + Number(e.amount), 0);

    // Update Home Dashboard
    const homeExpEl = document.getElementById('homeTodayExpense');
    if (homeExpEl) homeExpEl.textContent = formatMoney(todayExpense);

    const homeHisabSummary = document.getElementById('homeHisabSummary');
    if (homeHisabSummary) {
        homeHisabSummary.textContent = currentLang === 'bn'
            ? `আজকের খরচ: ${formatMoney(todayExpense)} | ব্যালেন্স: ${formatMoney(balance)}`
            : `Today Expense: ${formatMoney(todayExpense)} | Balance: ${formatMoney(balance)}`;
    }

    // Update Hisab Metrics
    const incEl = document.getElementById('totalIncomeVal');
    const expEl = document.getElementById('totalExpenseVal');
    const balEl = document.getElementById('netBalanceVal');
    const savEl = document.getElementById('savingsAmountVal');
    const borEl = document.getElementById('borrowedVal');
    const lentEl = document.getElementById('lentVal');

    if (incEl) incEl.textContent = formatMoney(incomeTotal);
    if (expEl) expEl.textContent = formatMoney(expenseTotal);
    if (balEl) balEl.textContent = formatMoney(balance);
    if (savEl) savEl.textContent = formatMoney(savingsTotal);
    if (borEl) borEl.textContent = formatMoney(borrowedTotal);
    if (lentEl) lentEl.textContent = formatMoney(lentTotal);

    // Budget Status & Bar
    const budgetText = document.getElementById('budgetStatusText');
    const budgetBar = document.getElementById('budgetProgressBar');
    if (budgetText && budgetBar) {
        if (monthlyBudget > 0) {
            const pct = Math.min(100, Math.round((monthExpense / monthlyBudget) * 100));
            budgetText.textContent = currentLang === 'bn'
                ? `খরচ ${formatMoney(monthExpense)} / ${formatMoney(monthlyBudget)} (${pct}%)`
                : `Spent ${formatMoney(monthExpense)} / ${formatMoney(monthlyBudget)} (${pct}%)`;
            budgetBar.style.width = `${pct}%`;
        } else {
            budgetText.textContent = currentLang === 'bn' ? 'বাজেট সেট করা হয়নি' : 'Monthly budget not set';
            budgetBar.style.width = '0%';
        }
    }

    // Filtered List & Report Badge
    const listEl = document.getElementById('hisabList');
    const badgeEl = document.getElementById('reportSummaryBadge');

    const filtered = currentHisabFilter === 'all'
        ? entries
        : entries.filter(e => e.type === currentHisabFilter);

    if (badgeEl) {
        badgeEl.textContent = currentLang === 'bn'
            ? `${filtered.length} এন্ট্রি`
            : `${filtered.length} entries`;
    }

    if (listEl) {
        if (filtered.length === 0) {
            listEl.innerHTML = `<div class="empty-state">${
                currentLang === 'bn'
                    ? 'কোনো হিসাব পাওয়া যায়নি। "নতুন হিসাব" বাটনে চাপুন।'
                    : 'No entries found. Click "Add Entry" to add one.'
            }</div>`;
        } else {
            listEl.innerHTML = filtered.map(item => `
                <div class="task-item">
                    <div class="task-left">
                        <div>
                            <div class="task-title">${escapeHtml(item.note)}</div>
                            <div class="task-meta">
                                <span class="freq-pill">${hisabTypeLabel(item.type)}</span>
                                <span>📅 ${escapeHtml(item.date || '')}</span>
                            </div>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="amt-badge amt-${item.type}">${formatMoney(item.amount)}</span>
                        <button class="delete-task-btn" data-delete-hisab="${item.id}" title="Delete">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str || '');
    return div.innerHTML;
}

function switchTab(tabName) {
    const homeView = document.getElementById('homeView');
    const routineView = document.getElementById('routineView');
    const hisabView = document.getElementById('hisabView');
    const navItems = document.querySelectorAll('.nav-item');

    const phaseMap = {
        bn: {
            services: 'Phase 11 & 12-এ সেবাসমূহ যুক্ত হবে',
            profile: 'Phase 8-এ লগইন ও প্রোফাইল যুক্ত হবে'
        },
        en: {
            services: 'Services will be added in Phases 11 & 12',
            profile: 'Login & Profile will be added in Phase 8'
        }
    };

    if (tabName === 'home' || tabName === 'routine' || tabName === 'hisab') {
        navItems.forEach(n => n.classList.toggle('active', n.getAttribute('data-tab') === tabName));
        homeView.classList.toggle('active', tabName === 'home');
        routineView.classList.toggle('active', tabName === 'routine');
        hisabView.classList.toggle('active', tabName === 'hisab');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        showToast(phaseMap[currentLang][tabName] || 'Coming soon');
    }
}

function setupRoutineSystem() {
    const openBtn = document.getElementById('openAddRoutineBtn');
    const cancelBtn = document.getElementById('cancelRoutineBtn');
    const form = document.getElementById('routineForm');
    const freqSelect = document.getElementById('taskFreq');
    const customGroup = document.getElementById('customTagGroup');
    const clearDoneBtn = document.getElementById('clearCompletedBtn');
    const goRoutineBtn = document.getElementById('goToRoutineBtn');

    if (openBtn && form) {
        openBtn.addEventListener('click', () => {
            form.classList.remove('hidden');
            document.getElementById('taskTitle')?.focus();
        });
    }

    if (cancelBtn && form) {
        cancelBtn.addEventListener('click', () => {
            form.reset();
            customGroup.style.display = 'none';
            form.classList.add('hidden');
        });
    }

    if (freqSelect && customGroup) {
        freqSelect.addEventListener('change', () => {
            customGroup.style.display = freqSelect.value === 'custom' ? 'flex' : 'none';
        });
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('taskTitle').value.trim();
            if (!title) return;

            routines.unshift({
                id: Date.now().toString(),
                title,
                freq: document.getElementById('taskFreq').value,
                time: document.getElementById('taskTime').value,
                customLabel: document.getElementById('taskCustomLabel').value.trim(),
                completed: false
            });

            saveRoutines();
            renderRoutines();
            form.reset();
            customGroup.style.display = 'none';
            form.classList.add('hidden');
            showToast(currentLang === 'bn' ? 'নতুন রুটিন যুক্ত হয়েছে' : 'New routine added');
        });
    }

    document.querySelectorAll('#routineTabs .filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#routineTabs .filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFreqFilter = tab.getAttribute('data-freq');
            renderRoutines();
        });
    });

    document.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('[data-toggle-id]');
        if (toggleBtn) {
            const id = toggleBtn.getAttribute('data-toggle-id');
            routines = routines.map(r => r.id === id ? { ...r, completed: !r.completed } : r);
            saveRoutines();
            renderRoutines();
            return;
        }

        const delBtn = e.target.closest('[data-delete-id]');
        if (delBtn) {
            const id = delBtn.getAttribute('data-delete-id');
            routines = routines.filter(r => r.id !== id);
            saveRoutines();
            renderRoutines();
            showToast(currentLang === 'bn' ? 'রুটিন মুছে ফেলা হয়েছে' : 'Routine deleted');
        }
    });

    if (clearDoneBtn) {
        clearDoneBtn.addEventListener('click', () => {
            routines = routines.filter(r => !r.completed);
            saveRoutines();
            renderRoutines();
            showToast(currentLang === 'bn' ? 'সম্পন্ন কাজগুলো মুছে ফেলা হয়েছে' : 'Completed tasks cleared');
        });
    }

    if (goRoutineBtn) {
        goRoutineBtn.addEventListener('click', () => switchTab('routine'));
    }
}

function setupHisabSystem() {
    const openBtn = document.getElementById('openAddHisabBtn');
    const cancelBtn = document.getElementById('cancelHisabBtn');
    const form = document.getElementById('hisabForm');
    const dateInput = document.getElementById('hisabDate');
    const goHisabBtn = document.getElementById('goToHisabBtn');

    const editBudgetBtn = document.getElementById('editBudgetBtn');
    const cancelBudgetBtn = document.getElementById('cancelBudgetBtn');
    const saveBudgetBtn = document.getElementById('saveBudgetBtn');
    const budgetBox = document.getElementById('budgetBox');
    const budgetInput = document.getElementById('monthlyBudgetInput');

    if (dateInput) dateInput.value = getTodayStr();

    if (openBtn && form) {
        openBtn.addEventListener('click', () => {
            form.classList.remove('hidden');
            if (dateInput && !dateInput.value) dateInput.value = getTodayStr();
            document.getElementById('hisabAmount')?.focus();
        });
    }

    if (cancelBtn && form) {
        cancelBtn.addEventListener('click', () => {
            form.reset();
            if (dateInput) dateInput.value = getTodayStr();
            form.classList.add('hidden');
        });
    }

    if (editBudgetBtn && budgetBox) {
        editBudgetBtn.addEventListener('click', () => {
            budgetBox.classList.remove('hidden');
            if (budgetInput) budgetInput.value = monthlyBudget || '';
        });
    }

    if (cancelBudgetBtn && budgetBox) {
        cancelBudgetBtn.addEventListener('click', () => budgetBox.classList.add('hidden'));
    }

    if (saveBudgetBtn && budgetInput) {
        saveBudgetBtn.addEventListener('click', () => {
            monthlyBudget = Math.max(0, Number(budgetInput.value || 0));
            localStorage.setItem(BUDGET_KEY, String(monthlyBudget));
            budgetBox.classList.add('hidden');
            renderHisab();
            showToast(currentLang === 'bn' ? 'মাসিক বাজেট আপডেট হয়েছে' : 'Monthly budget updated');
        });
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const amount = Number(document.getElementById('hisabAmount').value);
            const note = document.getElementById('hisabNote').value.trim();
            const type = document.getElementById('hisabType').value;
            const date = document.getElementById('hisabDate').value || getTodayStr();

            if (!amount || amount <= 0 || !note) return;

            entries.unshift({
                id: Date.now().toString(),
                type,
                amount,
                note,
                date
            });

            saveHisab();
            renderHisab();
            form.reset();
            if (dateInput) dateInput.value = getTodayStr();
            form.classList.add('hidden');
            showToast(currentLang === 'bn' ? 'হিসাবে যুক্ত হয়েছে' : 'Entry saved');
        });
    }

    document.querySelectorAll('#hisabFilterTabs .filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#hisabFilterTabs .filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentHisabFilter = tab.getAttribute('data-htype');
            renderHisab();
        });
    });

    document.addEventListener('click', (e) => {
        const delHisabBtn = e.target.closest('[data-delete-hisab]');
        if (delHisabBtn) {
            const id = delHisabBtn.getAttribute('data-delete-hisab');
            entries = entries.filter(item => item.id !== id);
            saveHisab();
            renderHisab();
            showToast(currentLang === 'bn' ? 'এন্ট্রি মুছে ফেলা হয়েছে' : 'Entry deleted');
        }
    });

    if (goHisabBtn) {
        goHisabBtn.addEventListener('click', () => switchTab('hisab'));
    }
}

function setupLanguageToggle() {
    const langBtn = document.getElementById('langToggleBtn');
    if (!langBtn) return;

    langBtn.addEventListener('click', () => {
        currentLang = currentLang === 'bn' ? 'en' : 'bn';
        document.documentElement.lang = currentLang;

        document.querySelectorAll('[data-bn]').forEach(el => {
            el.textContent = el.getAttribute(`data-${currentLang}`);
        });

        updateGreeting();
        updateDateDisplay();
        renderRoutines();
        renderHisab();
        showToast(currentLang === 'bn' ? 'ভাষা বাংলায় পরিবর্তন করা হয়েছে' : 'Language switched to English');
    });
}

function setupQuickActions() {
    const quickMessages = {
        bn: {
            shopping: 'বাজার লিস্ট ফিচার Phase 5-এ চালু হবে',
            emergency: 'জরুরি সাহায্য ডিরেক্টরি Phase 11-এ চালু হবে'
        },
        en: {
            shopping: 'Shopping List launches in Phase 5',
            emergency: 'Emergency Help launches in Phase 11'
        }
    };

    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.getAttribute('data-quick');
            if (key === 'routine') {
                switchTab('routine');
                setTimeout(() => {
                    document.getElementById('routineForm')?.classList.remove('hidden');
                    document.getElementById('taskTitle')?.focus();
                }, 100);
            } else if (key === 'expense') {
                switchTab('hisab');
                setTimeout(() => {
                    document.getElementById('hisabForm')?.classList.remove('hidden');
                    document.getElementById('hisabAmount')?.focus();
                }, 100);
            } else {
                showToast(quickMessages[currentLang][key] || 'Coming soon');
            }
        });
    });
}

function setupNotificationsPanel() {
    const notifBtn = document.getElementById('notifBtn');
    const notifPanel = document.getElementById('notifPanel');
    const closeBtn = document.getElementById('closeNotifBtn');

    if (!notifBtn || !notifPanel || !closeBtn) return;

    notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = notifPanel.classList.toggle('open');
        notifPanel.setAttribute('aria-hidden', String(!isOpen));
    });

    closeBtn.addEventListener('click', () => {
        notifPanel.classList.remove('open');
        notifPanel.setAttribute('aria-hidden', 'true');
    });

    document.addEventListener('click', (e) => {
        if (!notifPanel.contains(e.target) && !notifBtn.contains(e.target)) {
            notifPanel.classList.remove('open');
            notifPanel.setAttribute('aria-hidden', 'true');
        }
    });
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            switchTab(item.getAttribute('data-tab'));
        });
    });
}

function showToast(message) {
    const toast = document.getElementById('toastBox');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');

    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

document.addEventListener('DOMContentLoaded', () => {
    updateGreeting();
    updateDateDisplay();
    setupLanguageToggle();
    setupQuickActions();
    setupNotificationsPanel();
    setupNavigation();
    setupRoutineSystem();
    setupHisabSystem();
    renderRoutines();
    renderHisab();
});
