# **Project Blueprint: Modern Aesthetic Notepad**

## **Overview**
A minimalist, high-performance web-based notepad application. It focuses on a premium user experience with smooth interactions, persistent storage, and a "distraction-free" design.

## **Core Features**
1. **Note Management (CRUD)**: Create, Read, Update, and Delete notes.
2. **Persistence**: All notes are automatically saved to the browser's `localStorage`.
3. **Auto-save**: Real-time saving as the user types.
4. **Search/Filter**: Quickly find notes by title or content.
5. **Responsive Design**: Seamless experience across mobile, tablet, and desktop.
6. **Date Tracking**: Each note displays its last modified date.
## **Visual Design Strategy**
- **Aesthetics**: "3-Column Wide Layout" with Premium Glassmorphism.
- **Layout Structure**:
  - **Left (Sidebar)**: Dedicated space for Note List and Search (Wider for readability).
  - **Center (Editor)**: Large, focused writing area.
  - **Right (Utility)**: Dedicated sections for Pinned Notes, Calendar, and D-Day.
- **Color Palette**:
  - Primary: Indigo/Violet - `oklch(60% 0.15 260)`
  - Background: Ultra-clean Off-white with subtle noise.
  - Schedule Highlight: Soft Emerald - `oklch(70% 0.15 150)`
- **Typography**: Inter / Pretendard (Modern Sans-serif) with high-contrast headings.
- **Interactive Elements**:
  - Floating card effects for note items.
  - Smooth 3-pane responsive transitions.
  - Glassmorphism effects on sidebars.

## **Implementation Plan**

### **Phase 1: Foundation**
- [ ] Reset `index.html` with a semantic layout (Sidebar + Main Editor).
- [ ] Initialize `style.css` with modern CSS features (Container Queries, `:has()`, Cascade Layers).
- [ ] Setup `main.js` with an ES Module structure.

### **Phase 2: Core Logic**
- [ ] Implement `Note` class/manager for state handling.
- [ ] Connect `localStorage` for data persistence.
- [ ] Build the "Note List" rendering logic.

### **Phase 3: UI/UX & Polish**
- [ ] Style the editor with custom typography and spacing.
- [ ] Add animations for adding/deleting notes.
- [ ] Implement search functionality.
- [ ] Final accessibility and performance audit.
