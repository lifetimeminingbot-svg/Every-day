import { db } from './firebase.js';

let currentLang = 'bn';

// 1. Live Date Display (Bangla & English)
function updateDateDisplay() {
    const dateEl = document.getElementById('currentDateDisplay');
    if (!dateEl) return;

    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    
    if (currentLang === 'bn') {
        dateEl.textContent = now.toLocaleDateString('bn-BD', options);
    } else {
        dateEl.textContent = now.toLocaleDateString('en-US', options);
    }
}

// 2. Real Language Switcher (Bangla <-> English)
function setupLanguageToggle() {
    const langBtn = document.getElementById('langToggleBtn');
    if (!langBtn) return;

    langBtn.addEventListener('click', () => {
        currentLang = currentLang === 'bn' ? 'en' : 'bn';
        
        // Update all elements with data-bn and data-en attributes
        document.querySelectorAll('[data-bn]').forEach(el => {
            el.textContent = el.getAttribute(`data-${currentLang}`);
        });

        updateDateDisplay();
        showToast(currentLang === 'bn' ? 'ভাষা বাংলায় পরিবর্তন করা হয়েছে' : 'Language switched to English');
    });
}

// 3. Bottom Navigation Handling (Honest Status Feedback)
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.getAttribute('data-tab');
            
            if (tab === 'home') {
                navItems.forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                // Transparent feedback for upcoming phases
                const phaseMap = {
                    'services': 'Phase 11 & 12-এ সেবাসমূহ যুক্ত হবে',
                    'routine': 'Phase 3-এ রুটিন সিস্টেম যুক্ত হবে',
                    'calendar': 'Phase 7-এ ক্যালেন্ডার ও রিমাইন্ডার যুক্ত হবে',
                    'profile': 'Phase 8-এ লগইন ও প্রোফাইল যুক্ত হবে'
                };
                showToast(phaseMap[tab] || 'শীঘ্রই আসছে...');
            }
        });
    });
}

// 4. Toast Notification Helper
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

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    updateDateDisplay();
    setupLanguageToggle();
    setupNavigation();
});
