/**
 * Modern Notepad Application
 * Logic for CRUD operations, localStorage persistence, and Calendar rendering.
 */

class NoteManager {
    constructor() {
        this.notes = JSON.parse(localStorage.getItem('notes')) || [];
        this.currentNoteId = null;
        this.searchTerm = '';

        // DOM Elements
        this.notesList = document.getElementById('notes-list');
        this.addBtn = document.getElementById('add-note-btn');
        this.saveBtn = document.getElementById('save-note-btn');
        this.deleteBtn = document.getElementById('delete-note-btn');
        this.titleInput = document.getElementById('note-title-input');
        this.bodyInput = document.getElementById('note-body-input');
        this.searchInput = document.getElementById('search-input');
        this.editorContainer = document.getElementById('editor-container');
        this.noSelectionView = document.getElementById('no-selection');
        this.dateDisplay = document.getElementById('note-date');
        this.totalNotesDisplay = document.getElementById('total-notes');
        
        // Calendar Elements
        this.calendarGrid = document.getElementById('calendar-grid');
        this.calendarMonthYear = document.getElementById('calendar-month-year');

        this.init();
    }

    init() {
        // Event Listeners
        this.addBtn.addEventListener('click', () => this.addNote());
        this.saveBtn.addEventListener('click', () => this.handleManualSave());
        this.deleteBtn.addEventListener('click', () => this.deleteNote());
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e));
        
        // Auto-save & Real-time List update on input
        this.titleInput.addEventListener('input', () => this.saveCurrentNote());
        this.bodyInput.addEventListener('input', () => this.saveCurrentNote());

        // ENTER in title moves to body
        this.titleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.bodyInput.focus();
            }
        });

        this.renderNotesList();
        this.renderCalendar();
        this.updateTotalCount();
    }

    // --- Core Operations ---

    addNote() {
        const newNote = {
            id: Date.now().toString(),
            title: '',
            body: '',
            updatedAt: new Date().toISOString()
        };

        this.notes.unshift(newNote);
        this.saveToStorage();
        this.currentNoteId = newNote.id;
        
        this.renderNotesList();
        this.openNote(newNote.id);
        this.titleInput.focus();
        this.updateTotalCount();
    }

    deleteNote() {
        if (!this.currentNoteId) return;
        
        if (confirm('이 메모를 삭제하시겠습니까?')) {
            this.notes = this.notes.filter(note => note.id !== this.currentNoteId);
            this.currentNoteId = null;
            this.saveToStorage();
            
            this.renderNotesList();
            this.closeEditor();
            this.updateTotalCount();
        }
    }

    saveCurrentNote() {
        if (!this.currentNoteId) return;

        const noteIndex = this.notes.findIndex(note => note.id === this.currentNoteId);
        if (noteIndex === -1) return;

        this.notes[noteIndex].title = this.titleInput.value;
        this.notes[noteIndex].body = this.bodyInput.value;
        this.notes[noteIndex].updatedAt = new Date().toISOString();

        // Re-order: Move recently edited note to top
        const updatedNote = this.notes.splice(noteIndex, 1)[0];
        this.notes.unshift(updatedNote);

        this.saveToStorage();
        this.renderNotesList(); // Real-time list update
        this.updateDateDisplay(updatedNote.updatedAt);
    }

    handleManualSave() {
        this.saveCurrentNote();
        
        // Visual feedback
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
            note.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
            note.body.toLowerCase().includes(this.searchTerm.toLowerCase())
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

        // Add click listeners to items
        this.notesList.querySelectorAll('.note-item').forEach(item => {
            item.addEventListener('click', () => this.openNote(item.dataset.id));
        });
    }

    renderCalendar() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const today = now.getDate();

        // Set Header
        const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(now);
        this.calendarMonthYear.innerText = `${monthName} ${year}`;

        // Get first day of month and total days
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let calendarHTML = '';

        // Add empty cells for days from previous month
        for (let i = 0; i < firstDay; i++) {
            calendarHTML += '<div class="calendar-day empty"></div>';
        }

        // Add days of current month
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

        this.editorContainer.classList.remove('hidden');
        this.noSelectionView.classList.add('hidden');
        
        // Highlight active item in list
        this.renderNotesList();
    }

    closeEditor() {
        this.editorContainer.classList.add('hidden');
        this.noSelectionView.classList.remove('hidden');
    }

    handleSearch(e) {
        this.searchTerm = e.target.value;
        this.renderNotesList();
    }

    // --- Utilities ---

    saveToStorage() {
        localStorage.setItem('notes', JSON.stringify(this.notes));
    }

    updateTotalCount() {
        this.totalNotesDisplay.innerText = `${this.notes.length} notes`;
    }

    updateDateDisplay(isoString) {
        this.dateDisplay.innerText = `Last modified: ${this.formatDate(isoString, true)}`;
    }

    formatDate(isoString, includeTime = false) {
        const date = new Date(isoString);
        const options = { 
            month: 'short', 
            day: 'numeric'
        };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
            options.hour12 = false; // 24-hour format
        }
        return new Intl.DateTimeFormat('ko-KR', options).format(date);
    }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    window.app = new NoteManager();
});
