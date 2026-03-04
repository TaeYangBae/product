/**
 * Modern Notepad Application - Universal Cloud Sync Version
 * To enable sync, please fill in the firebaseConfig values from your Firebase Console.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- [CRITICAL] Firebase 설정값을 여기에 입력하세요 ---
const firebaseConfig = {
  apiKey: "AIzaSyCSl8u3iGu8kqA_93LYWOpX6nVKAuqrPek",
  authDomain: "memo-bc11f.firebaseapp.com",
  projectId: "memo-bc11f",
  storageBucket: "memo-bc11f.firebasestorage.app",
  messagingSenderId: "64557898227",
  appId: "1:64557898227:web:ba73c21e991f8ae9cf5a86",
  measurementId: "G-FJFY7VDD42"
};
// --------------------------------------------------

class NoteManager {
    constructor() {
        this.notes = [];
        this.pinnedNoteId = localStorage.getItem('pinnedNoteId') || null;
        this.currentNoteId = null;
        this.searchTerm = '';
        this.correctPassword = '1806';
        this.db = null;
        this.isCloud = false;

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
        // 1. Firebase Initialize (우선순위: 하드코딩된 설정값 -> 자동 설정)
        try {
            if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
                // 사용자가 설정값을 입력한 경우
                const app = initializeApp(firebaseConfig);
                this.db = getFirestore(app);
                this.isCloud = true;
                this.setupRealtimeListener();
                console.log("Cloud sync enabled via manual config.");
            } else {
                // 자동 설정을 시도 (Firebase Hosting 환경)
                const response = await fetch('/__/firebase/init.json');
                if (response.ok) {
                    const config = await response.json();
                    const app = initializeApp(config);
                    this.db = getFirestore(app);
                    this.isCloud = true;
                    this.setupRealtimeListener();
                    console.log("Cloud sync enabled via auto-init.");
                } else {
                    throw new Error("No config found");
                }
            }
        } catch (e) {
            console.warn("Cloud Sync inactive. Using LocalStorage. Please provide Firebase Config for sync.");
            this.isCloud = false;
            this.loadLocalNotes();
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
        this.titleInput.addEventListener('input', () => this.debouncedSave());
        this.bodyInput.addEventListener('input', () => this.debouncedSave());
        this.titleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); this.bodyInput.focus(); }
        });

        this.renderCalendar();
        if (!this.isCloud) {
            this.renderNotesList();
            this.renderPinnedView();
            this.updateTotalCount();
        }
    }

    loadLocalNotes() {
        this.notes = JSON.parse(localStorage.getItem('notes')) || [];
        this.renderNotesList();
    }

    setupRealtimeListener() {
        if (!this.db) return;
        const q = query(collection(this.db, "notes"), orderBy("updatedAt", "desc"));
        onSnapshot(q, (snapshot) => {
            this.notes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                updatedAt: doc.data().updatedAt?.toDate().toISOString() || new Date().toISOString()
            }));
            this.renderNotesList();
            this.updateTotalCount();
            if (this.currentNoteId) {
                const currentNote = this.notes.find(n => n.id === this.currentNoteId);
                if (currentNote) {
                    if (document.activeElement !== this.titleInput) this.titleInput.value = currentNote.title || '';
                    if (document.activeElement !== this.bodyInput) this.bodyInput.value = currentNote.body || '';
                    this.updateDateDisplay(currentNote.updatedAt);
                }
            }
            this.renderPinnedView();
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
        const newNote = {
            title: '',
            body: '',
            updatedAt: this.isCloud ? serverTimestamp() : new Date().toISOString()
        };
        if (this.isCloud) {
            const docRef = await addDoc(collection(this.db, "notes"), newNote);
            this.currentNoteId = docRef.id;
            this.openNote(docRef.id);
        } else {
            const id = Date.now().toString();
            this.notes.unshift({ id, ...newNote });
            this.currentNoteId = id;
            this.saveToLocalStorage();
            this.renderNotesList();
            this.openNote(id);
        }
        this.titleInput.focus();
    }

    async deleteNote() {
        if (!this.currentNoteId) return;
        if (confirm('메모를 삭제하시겠습니까? (모든 기기에서 삭제됩니다)')) {
            if (this.isCloud) {
                await deleteDoc(doc(this.db, "notes", this.currentNoteId));
            } else {
                this.notes = this.notes.filter(n => n.id !== this.currentNoteId);
                this.saveToLocalStorage();
                this.renderNotesList();
            }
            this.currentNoteId = null;
            this.closeEditor();
            this.updateTotalCount();
        }
    }

    debouncedSave() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.saveCurrentNote(), 1000);
    }

    async saveCurrentNote() {
        if (!this.currentNoteId) return;
        const title = this.titleInput.value;
        const body = this.bodyInput.value;
        if (this.isCloud) {
            await updateDoc(doc(this.db, "notes", this.currentNoteId), { title, body, updatedAt: serverTimestamp() });
        } else {
            const index = this.notes.findIndex(n => n.id === this.currentNoteId);
            if (index !== -1) {
                this.notes[index] = { ...this.notes[index], title, body, updatedAt: new Date().toISOString() };
                this.saveToLocalStorage();
                this.renderNotesList();
            }
        }
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
                    <div class="meta">${this.formatDate(note.updatedAt, true)}</div>
                </div>
            `).join('');
        this.notesList.querySelectorAll('.note-item').forEach(item => {
            item.addEventListener('click', () => this.openNote(item.dataset.id));
        });
    }

    renderPinnedView() {
        if (!this.pinnedNoteId) {
            this.pinnedContent.innerHTML = `<div class="pinned-empty"><p>고정된 메모가 없습니다.</p></div>`;
            return;
        }
        const pinnedNote = this.notes.find(n => n.id === this.pinnedNoteId);
        if (pinnedNote) {
            this.pinnedContent.innerHTML = `<div class="pinned-memo-card"><h3>${pinnedNote.title || '제목 없음'}</h3><p>${pinnedNote.body || '내용 없음'}</p></div>`;
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
        this.pinnedNoteId = (this.pinnedNoteId === this.currentNoteId) ? null : this.currentNoteId;
        localStorage.setItem('pinnedNoteId', this.pinnedNoteId || '');
        this.renderPinnedView();
    }

    closeEditor() { this.editorContainer.classList.add('hidden'); this.noSelectionView.classList.remove('hidden'); }
    handleSearch(e) { this.searchTerm = e.target.value; this.renderNotesList(); }
    saveToLocalStorage() { localStorage.setItem('notes', JSON.stringify(this.notes)); }
    updateTotalCount() { this.totalNotesDisplay.innerText = `${this.notes.length} notes`; }
    updateDateDisplay(isoString) { this.dateDisplay.innerText = `Last modified: ${this.formatDate(isoString, true)}`; }
    formatDate(isoString, includeTime = false) {
        if (!isoString) return '-';
        const date = new Date(isoString);
        const options = { month: 'short', day: 'numeric' };
        if (includeTime) { options.hour = '2-digit', options.minute = '2-digit', options.hour12 = false; }
        return new Intl.DateTimeFormat('ko-KR', options).format(date);
    }
}

document.addEventListener('DOMContentLoaded', () => { window.app = new NoteManager(); });
