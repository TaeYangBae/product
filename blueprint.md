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
- **Aesthetics**: "Glassmorphism" combined with clean Swiss typography.
- **Color Palette**:
  - Primary: Indigo/Violet - `oklch(60% 0.15 260)`
  - Background: Soft Gray/White with a subtle noise texture.
  - Accent: Vibrant Amber for "New Note" - `oklch(75% 0.15 80)`
- **Typography**: Inter (Modern Sans-serif) with high-contrast headings.
- **Interactive Elements**:
  - Smooth transitions between note selection.
  - "Lifted" card effects with deep soft shadows.
  - Hover states with elegant glow effects.

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
