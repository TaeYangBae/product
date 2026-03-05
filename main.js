/**
 * Modern Notepad Application - Universal Cloud Sync Version (RTDB)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getDatabase, ref, push, set, update, remove, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyD7FhoguHrXtryx2NPxDWrsmMEn_jYTFrc",
  authDomain: "memoo-bf0b1.firebaseapp.com",
  databaseURL: "https://memoo-bf0b1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "memoo-bf0b1",
  storageBucket: "memoo-bf0b1.firebasestorage.app",
  messagingSenderId: "410170355687",
  appId: "1:410170355687:web:ba44f5d00514c3feba5742",
  measurementId: "G-37PNK26LM1"
};

class NoteManager {
    constructor() {
        this.notes = [];
        this.schedules = [];
        this.pinnedNoteId = localStorage.getItem('pinnedNoteId') || null;
        this.currentNoteId = null;
        this.searchTerm = '';
        this.correctPassword = '1806';
        this.db = null;
        
        this.selectedDate = new Date();

        // DOM Elements
        this.notesList = document.getElementById('notes-list');
        this.addBtn = document.getElementById('add-note-btn');
        this.saveBtn = document.getElementById('save-note-btn');
        this.deleteBtn = document.getElementById('delete-note-btn');
        this.pinBtn = document.getElementById('pin-note-btn');
        this.titleInput = document.getElementById('note-title-input');
        this.bodyInput = document.getElementById('note-body-input');
        this.searchInput = document.getElementById('search-input');
        this.editorContainer = document.getElementById('editor-container');
        this.noSelectionView = document.getElementById('no-selection');
        this.dateDisplay = document.getElementById('note-date');
        this.totalNotesDisplay = document.getElementById('total-notes');
        
        // Password Elements
        this.passwordOverlay = document.getElementById('password-overlay');
        this.passwordInput = document.getElementById('password-input');
        this.passwordError = document.getElementById('password-error');
        this.mainApp = document.getElementById('main-app');
        
        // Calendar Elements
        this.calendarGrid = document.getElementById('calendar-grid');
        this.calendarMonthYear = document.getElementById('calendar-month-year');
        
        // Schedule Modal Elements
        this.scheduleModal = document.getElementById('schedule-modal');
        this.closeScheduleBtn = document.getElementById('close-schedule-modal');
        this.saveScheduleBtn = document.getElementById('save-schedule-btn');
        this.scheduleTitleInput = document.getElementById('schedule-title');
        this.scheduleFrequencySelect = document.getElementById('schedule-frequency');
        this.scheduleList = document.getElementById('schedule-list');
        this.scheduleModalTitle = document.getElementById('schedule-modal-title');
        
        // Pinned View Elements
        this.pinnedContent = document.getElementById('pinned-content');

        // Mobile UI Elements
        this.mobileMenuBtn = document.getElementById('mobile-menu-btn');
        this.sidebar = document.getElementById('sidebar');

        this.init();
    }

    async init() {
        try {
            const app = initializeApp(firebaseConfig);
            this.db = getDatabase(app);
            getAnalytics(app); 
            this.setupRealtimeListener();
            this.setupScheduleListener();
        } catch (e) {
            console.error("Firebase connection failed:", e);
        }

        if (sessionStorage.getItem('unlocked') === 'true') {
            this.unlockApp();
        }

        // Event Listeners
        this.addBtn.addEventListener('click', () => {
            this.addNote();
            this.closeMobileSidebar();
        });
        this.saveBtn.addEventListener('click', () => this.handleManualSave());
        this.deleteBtn.addEventListener('click', () => this.deleteNote());
        this.pinBtn.addEventListener('click', () => this.togglePin());
        this.searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.renderNotesList();
        });
        this.passwordInput.addEventListener('input', (e) => this.handlePasswordInput(e));
        
        // Schedule Event Listeners
        this.closeScheduleBtn.addEventListener('click', () => this.closeModal());
        this.saveScheduleBtn.addEventListener('click', () => this.saveSchedule());
        this.scheduleModal.addEventListener('click', (e) => {
            if (e.target === this.scheduleModal) this.closeModal();
        });

        if (this.mobileMenuBtn) {
            this.mobileMenuBtn.addEventListener('click', () => {
                this.sidebar.classList.toggle('open');
                const icon = this.mobileMenuBtn.querySelector('i');
                if (this.sidebar.classList.contains('open')) {
                    icon.classList.replace('bi-list', 'bi-x');
                } else {
                    icon.classList.replace('bi-x', 'bi-list');
                }
            });
        }

        this.titleInput.addEventListener('input', () => this.debouncedSave());
        this.bodyInput.addEventListener('input', () => this.debouncedSave());

        this.titleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); this.bodyInput.focus(); }
        });

        this.renderCalendar();
    }

    setupRealtimeListener() {
        if (!this.db) return;
        const notesRef = ref(this.db, 'notes');
        onValue(notesRef, (snapshot) => {
            const data = snapshot.val();
            this.notes = data ? Object.keys(data).map(key => ({ id: key, ...data[key] }))
                .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)) : [];
            this.renderNotesList();
            this.updateTotalCount();
            this.renderPinnedView();
        });
    }

    setupScheduleListener() {
        if (!this.db) return;
        const schedulesRef = ref(this.db, 'schedules');
        onValue(schedulesRef, (snapshot) => {
            const data = snapshot.val();
            this.schedules = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
            this.renderCalendar();
        });
    }

    // --- Schedule Logic ---
    openScheduleModal(day) {
        this.selectedDate = new Date(new Date().getFullYear(), new Date().getMonth(), day);
        const dateStr = this.selectedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
        this.scheduleModalTitle.innerText = `${dateStr} 일정 관리`;
        this.scheduleTitleInput.value = '';
        this.scheduleFrequencySelect.value = 'none';
        this.renderDaySchedules();
        this.scheduleModal.classList.remove('hidden');
    }

    closeModal() {
        this.scheduleModal.classList.add('hidden');
    }

    async saveSchedule() {
        const title = this.scheduleTitleInput.value.trim();
        const frequency = this.scheduleFrequencySelect.value;
        if (!title || !this.db) return;

        const schedulesRef = ref(this.db, 'schedules');
        const newScheduleRef = push(schedulesRef);
        
        await set(newScheduleRef, {
            title,
            frequency,
            date: this.selectedDate.toISOString(),
            day: this.selectedDate.getDate(),
            month: this.selectedDate.getMonth(),
            createdAt: serverTimestamp()
        });

        this.scheduleTitleInput.value = '';
        this.renderDaySchedules();
    }

    async deleteSchedule(id) {
        if (!this.db) return;
        await remove(ref(this.db, `schedules/${id}`));
        this.renderDaySchedules();
    }

    renderDaySchedules() {
        const daySchedules = this.schedules.filter(s => this.isScheduleActiveOnDate(s, this.selectedDate));
        this.scheduleList.innerHTML = daySchedules.length === 0 
            ? '<li class="empty-state">일정이 없습니다.</li>'
            : daySchedules.map(s => `
                <li class="schedule-item">
                    <span>${s.title} <small>(${this.getFrequencyLabel(s.frequency)})</small></span>
                    <i class="bi bi-trash delete-schedule" onclick="window.app.deleteSchedule('${s.id}')"></i>
                </li>
            `).join('');
    }

    isScheduleActiveOnDate(schedule, targetDate) {
        const sDate = new Date(schedule.date);
        const tDate = targetDate;

        switch (schedule.frequency) {
            case 'daily': return true;
            case 'monthly': return sDate.getDate() === tDate.getDate();
            case 'yearly': return sDate.getDate() === tDate.getDate() && sDate.getMonth() === tDate.getMonth();
            case 'none': return sDate.toDateString() === tDate.toDateString();
            default: return false;
        }
    }

    getFrequencyLabel(freq) {
        const labels = { daily: '매일', monthly: '매달', yearly: '매년', none: '한번' };
        return labels[freq] || '';
    }

    // --- Calendar Logic ---
    renderCalendar() {
        const now = new Date();
        const year = now.getFullYear(), month = now.getMonth(), today = now.getDate();
        this.calendarMonthYear.innerText = `${new Intl.DateTimeFormat('en-US', { month: 'long' }).format(now)} ${year}`;
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        this.calendarGrid.innerHTML = '';
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'calendar-day empty';
            this.calendarGrid.appendChild(empty);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = document.createElement('div');
            const targetDate = new Date(year, month, day);
            const hasSchedule = this.schedules.some(s => this.isScheduleActiveOnDate(s, targetDate));
            
            dayEl.className = `calendar-day ${day === today ? 'today' : ''} ${hasSchedule ? 'has-schedule' : ''}`;
            dayEl.innerText = day;
            dayEl.onclick = () => this.openScheduleModal(day);
            this.calendarGrid.appendChild(dayEl);
        }
    }

    // --- Note Logic ---
    async addNote() {
        if (!this.db) return;
        const notesRef = ref(this.db, 'notes');
        const newNoteRef = push(notesRef);
        await set(newNoteRef, { title: '', body: '', updatedAt: serverTimestamp() });
        this.openNote(newNoteRef.key);
    }

    openNote(id) {
        const note = this.notes.find(n => n.id === id);
        if (!note) return;
        this.currentNoteId = id;
        this.titleInput.value = note.title || '';
        this.bodyInput.value = note.body || '';
        this.updateDateDisplay(note.updatedAt);
        this.updatePinButtonUI();
        this.editorContainer.classList.remove('hidden');
        this.noSelectionView.classList.add('hidden');
        this.renderNotesList();
        this.closeMobileSidebar();
    }

    // (Rest of the NoteManager methods: save, delete, pin, etc.)
    debouncedSave() { if (this.saveTimeout) clearTimeout(this.saveTimeout); this.saveTimeout = setTimeout(() => this.saveCurrentNote(), 1000); }
    async saveCurrentNote() {
        if (!this.currentNoteId || !this.db) return;
        await update(ref(this.db, `notes/${this.currentNoteId}`), {
            title: this.titleInput.value,
            body: this.bodyInput.value,
            updatedAt: serverTimestamp()
        });
    }

    handleManualSave() { this.saveCurrentNote(); this.saveBtn.classList.add('saved'); setTimeout(() => this.saveBtn.classList.remove('saved'), 1500); }
    async deleteNote() {
        if (!this.currentNoteId || !this.db) return;
        if (confirm('메모를 삭제하시겠습니까?')) {
            await remove(ref(this.db, `notes/${this.currentNoteId}`));
            this.currentNoteId = null;
            this.closeEditor();
        }
    }

    togglePin() {
        const currentPin = localStorage.getItem('pinnedNoteId');
        if (currentPin === this.currentNoteId) localStorage.removeItem('pinnedNoteId');
        else localStorage.setItem('pinnedNoteId', this.currentNoteId);
        this.updatePinButtonUI();
        this.renderPinnedView();
    }

    updatePinButtonUI() {
        const pinnedId = localStorage.getItem('pinnedNoteId');
        const icon = this.pinBtn.querySelector('i');
        if (this.currentNoteId === pinnedId) {
            this.pinBtn.classList.add('active');
            icon.classList.replace('bi-pin-angle', 'bi-pin-fill');
        } else {
            this.pinBtn.classList.remove('active');
            icon.classList.replace('bi-pin-fill', 'bi-pin-angle');
        }
    }

    renderNotesList() {
        const filtered = this.notes.filter(n => (n.title?.toLowerCase().includes(this.searchTerm.toLowerCase()) || n.body?.toLowerCase().includes(this.searchTerm.toLowerCase())));
        this.notesList.innerHTML = filtered.length === 0 ? '<div class="empty-state"><p>메모가 없습니다.</p></div>' : filtered.map(n => `
            <div class="note-item ${n.id === this.currentNoteId ? 'active' : ''}" onclick="window.app.openNote('${n.id}')">
                <h3>${n.title || '제목 없음'}</h3>
                <p>${n.body || '내용 없음'}</p>
                <div class="meta">${this.formatDate(n.updatedAt)}</div>
            </div>
        `).join('');
    }

    renderPinnedView() {
        const pinnedId = localStorage.getItem('pinnedNoteId');
        const pinnedNote = this.notes.find(n => n.id === pinnedId);
        this.pinnedContent.innerHTML = pinnedNote ? `
            <div class="pinned-memo-card">
                <h3>${pinnedNote.title || '제목 없음'}</h3>
                <p>${pinnedNote.body || '내용 없음'}</p>
            </div>` : '<div class="pinned-empty"><p>고정된 메모가 없습니다.</p></div>';
    }

    handlePasswordInput(e) { if (e.target.value.length === 4) { if (e.target.value === this.correctPassword) this.unlockApp(); else { this.passwordError.classList.remove('hidden'); e.target.value = ''; } } }
    unlockApp() { sessionStorage.setItem('unlocked', 'true'); this.passwordOverlay.classList.add('hidden'); this.mainApp.classList.remove('blurred'); setTimeout(() => this.passwordOverlay.style.display = 'none', 500); }
    closeEditor() { this.editorContainer.classList.add('hidden'); this.noSelectionView.classList.remove('hidden'); }
    closeMobileSidebar() { if (window.innerWidth <= 1024) { this.sidebar.classList.remove('open'); const icon = this.mobileMenuBtn?.querySelector('i'); if (icon) icon.classList.replace('bi-x', 'bi-list'); } }
    updateTotalCount() { this.totalNotesDisplay.innerText = `${this.notes.length} notes`; }
    updateDateDisplay(ts) { this.dateDisplay.innerText = `Last modified: ${this.formatDate(ts)}`; }
    formatDate(ts) { if (!ts) return '-'; return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ts)); }
}

document.addEventListener('DOMContentLoaded', () => { window.app = new NoteManager(); });
