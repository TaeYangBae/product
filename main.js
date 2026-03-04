/**
 * Modern Notepad Application - Universal Cloud Sync Version (RTDB)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getDatabase, ref, push, set, update, remove, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// --- New Firebase Configuration (memoo-bf0b1) ---
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
// --------------------------------------------------

class NoteManager {
    constructor() {
        this.notes = [];
        this.currentNoteId = null;
        this.searchTerm = '';
        this.correctPassword = '1806';
        this.db = null;

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
        this.passwordOverlay = document.getElementById('password-overlay');
        this.passwordInput = document.getElementById('password-input');
        this.passwordError = document.getElementById('password-error');
        this.mainApp = document.getElementById('main-app');
        this.calendarGrid = document.getElementById('calendar-grid');
        this.calendarMonthYear = document.getElementById('calendar-month-year');
        this.pinnedContent = document.getElementById('pinned-content');

        this.init();
    }

    async init() {
        // 1. Initialize Firebase
        try {
            const app = initializeApp(firebaseConfig);
            this.db = getDatabase(app);
            getAnalytics(app); // Initialize analytics
            this.setupRealtimeListener();
            console.log("Cloud sync active via Realtime Database (memoo-bf0b1).");
        } catch (e) {
            console.error("Firebase connection failed:", e);
            alert("데이터베이스 연결에 실패했습니다.");
        }

        // 2. Password check
        if (sessionStorage.getItem('unlocked') === 'true') {
            this.unlockApp();
        }

        // 3. Event Listeners
        this.addBtn.addEventListener('click', () => this.addNote());
        this.saveBtn.addEventListener('click', () => this.handleManualSave());
        this.deleteBtn.addEventListener('click', () => this.deleteNote());
        this.pinBtn.addEventListener('click', () => this.togglePin());
        this.searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.renderNotesList();
        });
        this.passwordInput.addEventListener('input', (e) => this.handlePasswordInput(e));
        
        // Auto-save logic
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
            if (data) {
                this.notes = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                })).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
            } else {
                this.notes = [];
            }
            
            this.renderNotesList();
            this.updateTotalCount();
            
            if (this.currentNoteId) {
                const currentNote = this.notes.find(n => n.id === this.currentNoteId);
                if (currentNote) {
                    if (document.activeElement !== this.titleInput) this.titleInput.value = currentNote.title || '';
                    if (document.activeElement !== this.bodyInput) this.bodyInput.value = currentNote.body || '';
                    this.updateDateDisplay(currentNote.updatedAt);
                } else {
                    this.closeEditor();
                }
            }
            this.renderPinnedView();
        }, (error) => {
            console.error("Database Error:", error);
            alert("동기화 오류: Firebase 콘솔의 [규칙]에서 .read와 .write가 true인지 확인하세요.");
        });
    }

    handlePasswordInput(e) {
        const val = e.target.value;
        if (val.length === 4) {
            if (val === this.correctPassword) { this.unlockApp(); } 
            else { this.passwordError.classList.remove('hidden'); e.target.value = ''; }
        }
    }

    unlockApp() {
        sessionStorage.setItem('unlocked', 'true');
        this.passwordOverlay.classList.add('hidden');
        this.mainApp.classList.remove('blurred');
        setTimeout(() => { this.passwordOverlay.style.display = 'none'; }, 500);
    }

    async addNote() {
        if (!this.db) return;
        const notesRef = ref(this.db, 'notes');
        const newNoteRef = push(notesRef);
        
        const newNote = {
            title: '',
            body: '',
            updatedAt: serverTimestamp()
        };

        try {
            await set(newNoteRef, newNote);
            this.currentNoteId = newNoteRef.key;
            this.openNote(this.currentNoteId);
            this.titleInput.focus();
        } catch (e) { console.error(e); }
    }

    async deleteNote() {
        if (!this.currentNoteId || !this.db) return;
        if (confirm('메모를 삭제하시겠습니까? (모든 기기에서 삭제됩니다)')) {
            try {
                await remove(ref(this.db, `notes/${this.currentNoteId}`));
                this.currentNoteId = null;
                this.closeEditor();
            } catch (e) { console.error(e); }
        }
    }

    debouncedSave() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.saveCurrentNote(), 1000);
    }

    async saveCurrentNote() {
        if (!this.currentNoteId || !this.db) return;
        const title = this.titleInput.value;
        const body = this.bodyInput.value;
        
        try {
            await update(ref(this.db, `notes/${this.currentNoteId}`), {
                title,
                body,
                updatedAt: serverTimestamp()
            });
        } catch (e) { console.error(e); }
    }

    handleManualSave() {
        this.saveCurrentNote();
        this.saveBtn.classList.add('saved');
        setTimeout(() => { this.saveBtn.classList.remove('saved'); }, 1500);
    }

    renderNotesList() {
        const filteredNotes = this.notes.filter(note => 
            (note.title?.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
             note.body?.toLowerCase().includes(this.searchTerm.toLowerCase()))
        );
        this.notesList.innerHTML = filteredNotes.length === 0 
            ? `<div class="empty-state"><p>메모가 없습니다.</p></div>`
            : filteredNotes.map(note => `
                <div class="note-item ${note.id === this.currentNoteId ? 'active' : ''}" data-id="${note.id}">
                    <h3>${note.title || '제목 없음'}</h3>
                    <p>${note.body || '내용 없음'}</p>
                    <div class="meta">${this.formatDate(note.updatedAt)}</div>
                </div>
            `).join('');
        
        this.notesList.querySelectorAll('.note-item').forEach(item => {
            item.addEventListener('click', () => this.openNote(item.dataset.id));
        });
    }

    renderPinnedView() {
        const pinnedId = localStorage.getItem('pinnedNoteId');
        if (!pinnedId) {
            this.pinnedContent.innerHTML = `<div class="pinned-empty"><p>고정된 메모가 없습니다.</p></div>`;
            return;
        }
        const pinnedNote = this.notes.find(n => n.id === pinnedId);
        if (pinnedNote) {
            this.pinnedContent.innerHTML = `
                <div class="pinned-memo-card">
                    <h3>${pinnedNote.title || '제목 없음'}</h3>
                    <p>${pinnedNote.body || '내용 없음'}</p>
                </div>`;
        } else {
            localStorage.removeItem('pinnedNoteId');
            this.renderPinnedView();
        }
    }

    renderCalendar() {
        const now = new Date();
        const year = now.getFullYear(), month = now.getMonth(), today = now.getDate();
        this.calendarMonthYear.innerText = `${new Intl.DateTimeFormat('en-US', { month: 'long' }).format(now)} ${year}`;
        const firstDay = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month + 1, 0).getDate();
        let calendarHTML = '';
        for (let i = 0; i < firstDay; i++) calendarHTML += '<div class="calendar-day empty"></div>';
        for (let day = 1; day <= daysInMonth; day++) calendarHTML += `<div class="calendar-day ${day === today ? 'today' : ''}">${day}</div>`;
        this.calendarGrid.innerHTML = calendarHTML;
    }

    openNote(id) {
        const note = this.notes.find(n => n.id === id);
        if (!note) return;
        this.currentNoteId = id;
        this.titleInput.value = note.title || '';
        this.bodyInput.value = note.body || '';
        this.updateDateDisplay(note.updatedAt);
        this.editorContainer.classList.remove('hidden');
        this.noSelectionView.classList.add('hidden');
        this.renderNotesList();
    }

    togglePin() {
        if (!this.currentNoteId) return;
        const currentPin = localStorage.getItem('pinnedNoteId');
        if (currentPin === this.currentNoteId) {
            localStorage.removeItem('pinnedNoteId');
        } else {
            localStorage.setItem('pinnedNoteId', this.currentNoteId);
        }
        this.renderPinnedView();
    }

    closeEditor() { this.editorContainer.classList.add('hidden'); this.noSelectionView.classList.remove('hidden'); }
    updateTotalCount() { this.totalNotesDisplay.innerText = `${this.notes.length} notes`; }
    updateDateDisplay(timestamp) { this.dateDisplay.innerText = `Last modified: ${this.formatDate(timestamp)}`; }
    
    formatDate(timestamp) {
        if (!timestamp) return '-';
        const date = new Date(timestamp);
        return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
    }
}

document.addEventListener('DOMContentLoaded', () => { window.app = new NoteManager(); });
