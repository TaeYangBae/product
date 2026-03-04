/**
 * Modern Notepad Application
 * Logic for CRUD operations, Firestore persistence, Calendar, Pinned Note, and Password Protection.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

class NoteManager {
    constructor() {
        this.notes = [];
        this.pinnedNoteId = localStorage.getItem('pinnedNoteId') || null; // Local preference for pin (or can be moved to DB if shared pin is desired)
        this.currentNoteId = null;
        this.searchTerm = '';
        this.correctPassword = '1806';
        this.db = null;
        this.unsub = null;

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

        // Pinned View Elements
        this.pinnedContent = document.getElementById('pinned-content');

        this.init();
    }

    async init() {
        // 1. Initialize Firebase
        try {
            const response = await fetch('/__/firebase/init.json');
            const config = await response.json();
            const app = initializeApp(config);
            this.db = getFirestore(app);
            this.setupRealtimeListener();
        } catch (e) {
            console.error("Firebase init failed. Are you running on Firebase Hosting?", e);
            alert("데이터베이스 연결에 실패했습니다. Firebase Hosting 환경인지 확인해주세요.");
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
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e));
        this.passwordInput.addEventListener('input', (e) => this.handlePasswordInput(e));
        
        // Auto-save logic (Debounced for Firestore cost optimization)
        this.titleInput.addEventListener('input', () => this.debouncedSave());
        this.bodyInput.addEventListener('input', () => this.debouncedSave());

        // ENTER navigation
        this.titleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.bodyInput.focus();
            }
        });

        this.renderCalendar();
    }

    setupRealtimeListener() {
        if (!this.db) return;
        
        const q = query(collection(this.db, "notes"), orderBy("updatedAt", "desc"));
        
        this.unsub = onSnapshot(q, (snapshot) => {
            this.notes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                updatedAt: doc.data().updatedAt?.toDate().toISOString() || new Date().toISOString()
            }));
            
            this.renderNotesList();
            this.updateTotalCount();
            
            // Sync current editor if open
            if (this.currentNoteId) {
                const currentNote = this.notes.find(n => n.id === this.currentNoteId);
                if (currentNote) {
                    // Only update inputs if they are not focused to avoid overwriting user typing
                    if (document.activeElement !== this.titleInput) this.titleInput.value = currentNote.title;
                    if (document.activeElement !== this.bodyInput) this.bodyInput.value = currentNote.body;
                    this.updateDateDisplay(currentNote.updatedAt);
                } else {
                    // Note was deleted by someone else
                    this.closeEditor();
                }
            }

            // Sync Pinned View
            this.renderPinnedView();
        });
    }

    // --- Authentication ---

    handlePasswordInput(e) {
        const val = e.target.value;
        if (val.length === 4) {
            if (val === this.correctPassword) {
                this.unlockApp();
            } else {
                this.passwordError.classList.remove('hidden');
                e.target.value = '';
            }
        } else {
            this.passwordError.classList.add('hidden');
        }
    }

    unlockApp() {
        sessionStorage.setItem('unlocked', 'true');
        this.passwordOverlay.classList.add('hidden');
        this.mainApp.classList.remove('blurred');
        setTimeout(() => {
            this.passwordOverlay.style.display = 'none';
        }, 500);
    }

    // --- Core Operations (Firestore) ---

    async addNote() {
        if (!this.db) return;

        const newNote = {
            title: '',
            body: '',
            updatedAt: serverTimestamp()
        };

        try {
            const docRef = await addDoc(collection(this.db, "notes"), newNote);
            this.currentNoteId = docRef.id;
            this.openNote(docRef.id);
            this.titleInput.focus();
        } catch (e) {
            console.error("Error adding note: ", e);
        }
    }

    async deleteNote() {
        if (!this.currentNoteId || !this.db) return;
        
        if (confirm('이 메모를 삭제하시겠습니까? (모든 기기에서 삭제됩니다)')) {
            if (this.pinnedNoteId === this.currentNoteId) {
                this.pinnedNoteId = null;
                localStorage.removeItem('pinnedNoteId');
            }
            
            try {
                await deleteDoc(doc(this.db, "notes", this.currentNoteId));
                this.currentNoteId = null;
                this.closeEditor();
            } catch (e) {
                console.error("Error deleting note: ", e);
            }
        }
    }

    // Debounce save to prevent too many writes
    debouncedSave() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.saveCurrentNote(), 1000);
    }

    async saveCurrentNote() {
        if (!this.currentNoteId || !this.db) return;

        try {
            await updateDoc(doc(this.db, "notes", this.currentNoteId), {
                title: this.titleInput.value,
                body: this.bodyInput.value,
                updatedAt: serverTimestamp()
            });
            // UI updates are handled by onSnapshot
        } catch (e) {
            console.error("Error saving note: ", e);
        }
    }

    togglePin() {
        if (!this.currentNoteId) return;

        if (this.pinnedNoteId === this.currentNoteId) {
            this.pinnedNoteId = null;
            localStorage.removeItem('pinnedNoteId');
        } else {
            this.pinnedNoteId = this.currentNoteId;
            localStorage.setItem('pinnedNoteId', this.pinnedNoteId);
        }

        this.updatePinButtonUI();
        this.renderPinnedView();
    }

    handleManualSave() {
        this.saveCurrentNote();
        this.saveBtn.classList.add('saved');
        const icon = this.saveBtn.querySelector('i');
        icon.classList.replace('bi-check-lg', 'bi-check-all');
        
        setTimeout(() => {
            this.saveBtn.classList.remove('saved');
            icon.classList.replace('bi-check-all', 'bi-check-lg');
        }, 1500);
    }

    // --- UI Logic ---

    renderNotesList() {
        const filteredNotes = this.notes.filter(note => 
            (note.title?.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
             note.body?.toLowerCase().includes(this.searchTerm.toLowerCase()))
        );

        if (filteredNotes.length === 0) {
            this.notesList.innerHTML = `<div class="empty-state"><p>${this.searchTerm ? '검색 결과가 없습니다.' : '메모가 없습니다.'}</p></div>`;
            return;
        }

        this.notesList.innerHTML = filteredNotes.map(note => `
            <div class="note-item ${note.id === this.currentNoteId ? 'active' : ''}" data-id="${note.id}">
                <h3>${note.title || '제목 없음'}</h3>
                <p>${note.body || '내용이 없습니다.'}</p>
                <div class="meta">${this.formatDate(note.updatedAt, true)}</div>
            </div>
        `).join('');

        this.notesList.querySelectorAll('.note-item').forEach(item => {
            item.addEventListener('click', () => this.openNote(item.dataset.id));
        });
    }

    renderPinnedView() {
        // Note: Pinned status is currently local-only per browser as requested "right side pin".
        // To share pinned status, we'd need a 'pinned' field in Firestore.
        // Keeping it local allows each user/device to pin what's important to *them*.
        
        if (!this.pinnedNoteId) {
            this.pinnedContent.innerHTML = `
                <div class="pinned-empty">
                    <p>고정된 메모가 없습니다.</p>
                    <span>에디터에서 핀 아이콘을 눌러주세요.</span>
                </div>
            `;
            return;
        }

        const pinnedNote = this.notes.find(n => n.id === this.pinnedNoteId);
        if (!pinnedNote) {
            // Note might have been deleted remotely
            this.pinnedNoteId = null;
            localStorage.removeItem('pinnedNoteId');
            this.renderPinnedView();
            return;
        }

        this.pinnedContent.innerHTML = `
            <div class="pinned-memo-card">
                <h3>${pinnedNote.title || '제목 없음'}</h3>
                <p>${pinnedNote.body || '내용이 없습니다.'}</p>
            </div>
        `;
    }

    renderCalendar() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const today = now.getDate();

        const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(now);
        this.calendarMonthYear.innerText = `${monthName} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let calendarHTML = '';
        for (let i = 0; i < firstDay; i++) {
            calendarHTML += '<div class="calendar-day empty"></div>';
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = day === today;
            calendarHTML += `<div class="calendar-day ${isToday ? 'today' : ''}">${day}</div>`;
        }
        this.calendarGrid.innerHTML = calendarHTML;
    }

    openNote(id) {
        const note = this.notes.find(n => n.id === id);
        if (!note) return;

        this.currentNoteId = id;
        this.titleInput.value = note.title;
        this.bodyInput.value = note.body;
        this.updateDateDisplay(note.updatedAt);
        this.updatePinButtonUI();

        this.editorContainer.classList.remove('hidden');
        this.noSelectionView.classList.add('hidden');
        
        // Highlight logic handled by renderNotesList from snapshot
        // But we manually trigger a re-render of list highlighting for immediate feedback
        this.renderNotesList();
    }

    updatePinButtonUI() {
        if (this.currentNoteId === this.pinnedNoteId) {
            this.pinBtn.classList.add('active');
            this.pinBtn.querySelector('i').classList.replace('bi-pin-angle', 'bi-pin-fill');
        } else {
            this.pinBtn.classList.remove('active');
            this.pinBtn.querySelector('i').classList.replace('bi-pin-fill', 'bi-pin-angle');
        }
    }

    closeEditor() {
        this.editorContainer.classList.add('hidden');
        this.noSelectionView.classList.remove('hidden');
    }

    handleSearch(e) {
        this.searchTerm = e.target.value;
        this.renderNotesList();
    }

    updateTotalCount() {
        this.totalNotesDisplay.innerText = `${this.notes.length} notes`;
    }

    updateDateDisplay(isoString) {
        this.dateDisplay.innerText = `Last modified: ${this.formatDate(isoString, true)}`;
    }

    formatDate(isoString, includeTime = false) {
        if (!isoString) return '-';
        const date = new Date(isoString);
        const options = { month: 'short', day: 'numeric' };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
            options.hour12 = false;
        }
        return new Intl.DateTimeFormat('ko-KR', options).format(date);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new NoteManager();
});
