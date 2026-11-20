import { db } from './firebase.js';

let currentLang = 'bn';

function getTimeGreeting(lang) {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
        return lang === 'bn' ? 'শুভ সকাল' : 'Good Morning';
    } else if (hour >= 12 && hour < 17) {
        return lang === 'bn' ? 'শুভ দুপুর' : 'Good Afternoon';
    } else if (hour >= 17 && hour < 21) {
        return lang === 'bn' ? 'শুভ সন্ধ্যা' : 'Good Evening';
    } else {
        return lang === 'bn' ? 'শুভ রাত্রি' : 'Good Night';
    }
}

function updateGreeting() {
    const badge = document.getElementById('greetingBadge');
    if (badge) {
        badge.textContent = getTimeGreeting(currentLang);
    }
}

function updateDateDisplay() {
    const dateEl = document.getElementById('currentDateDisplay');
    if (!dateEl) return;

    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = now.toLocaleDateString(currentLang === 'bn' ? 'bn-BD' : 'en-US', options);
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
        showToast(currentLang === 'bn' ? 'ভাষা বাংলায় পরিবর্তন করা হয়েছে' : 'Language switched to English');
    });
}

function setupQuickActions() {
    const quickMessages = {
        bn: {
            routine: 'নতুন রুটিন যোগ করার ফিচার Phase 3-এ চালু হবে',
            expense: 'খরচ যোগ করার ফিচার Phase 4-এ চালু হবে',
            shopping: 'বাজার লিস্ট ফিচার Phase 5-এ চালু হবে',
            emergency: 'জরুরি সাহায্য ডিরেক্টরি Phase 11-এ চালু হবে'
        },
        en: {
            routine: 'Add Routine feature launches in Phase 3',
            expense: 'Add Expense feature launches in Phase 4',
            shopping: 'Shopping List launches in Phase 5',
            emergency: 'Emergency Help launches in Phase 11'
        }
    };

    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.getAttribute('data-quick');
            showToast(quickMessages[currentLang][key] || 'Coming soon');
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
    const navItems = document.querySelectorAll('.nav-item');

    const phaseMap = {
        bn: {
            services: 'Phase 11 & 12-এ সেবাসমূহ যুক্ত হবে',
            routine: 'Phase 3-এ রুটিন সিস্টেম যুক্ত হবে',
            calendar: 'Phase 7-এ ক্যালেন্ডার ও রিমাইন্ডার যুক্ত হবে',
            profile: 'Phase 8-এ লগইন ও প্রোফাইল যুক্ত হবে'
        },
        en: {
            services: 'Services will be added in Phases 11 & 12',
            routine: 'Routine System will be added in Phase 3',
            calendar: 'Calendar & Reminders in Phase 7',
            profile: 'Login & Profile will be added in Phase 8'
        }
    };

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.getAttribute('data-tab');

            if (tab === 'home') {
                navItems.forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                showToast(phaseMap[currentLang][tab] || 'Coming soon');
            }
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
});
