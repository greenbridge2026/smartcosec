/**
 * Staff Sticky Note - Universal Floating Scratchpad for Globalisor Staff Portal
 * Allows staff to write anything, always present throughout the portal,
 * freely draggable, resizable, minimizable, multi-note capable, with real-time auto-save.
 */

(function() {
    'use strict';

    // Guard against duplicate initialization
    if (window.StaffStickyNotes) {
        return;
    }

    const THEMES = {
        yellow: {
            name: 'Post-it Yellow',
            bg: '#FEF08A',
            headerBg: '#FDE047',
            border: '#FACC15',
            text: '#713F12',
            titleText: '#854D0E',
            metaText: '#A16207',
            btnHover: 'rgba(113, 63, 18, 0.12)',
            dot: '#EAB308',
            shadow: 'rgba(234, 179, 8, 0.25)'
        },
        green: {
            name: 'Mint Green',
            bg: '#DCFCE7',
            headerBg: '#BBF7D0',
            border: '#86EFAC',
            text: '#14532D',
            titleText: '#166534',
            metaText: '#15803D',
            btnHover: 'rgba(20, 83, 45, 0.12)',
            dot: '#22C55E',
            shadow: 'rgba(34, 197, 94, 0.25)'
        },
        blue: {
            name: 'Sky Blue',
            bg: '#E0F2FE',
            headerBg: '#BAE6FD',
            border: '#7DD3FC',
            text: '#0C4A6E',
            titleText: '#0369A1',
            metaText: '#0284C7',
            btnHover: 'rgba(12, 74, 110, 0.12)',
            dot: '#0EA5E9',
            shadow: 'rgba(14, 165, 233, 0.25)'
        },
        purple: {
            name: 'Lavender',
            bg: '#F3E8FF',
            headerBg: '#E9D5FF',
            border: '#D8B4FE',
            text: '#581C87',
            titleText: '#6B21A8',
            metaText: '#7E22CE',
            btnHover: 'rgba(88, 28, 135, 0.12)',
            dot: '#A855F7',
            shadow: 'rgba(168, 85, 247, 0.25)'
        },
        peach: {
            name: 'Warm Peach',
            bg: '#FFEDD5',
            headerBg: '#FED7AA',
            border: '#FDBA74',
            text: '#7C2D12',
            titleText: '#9A3412',
            metaText: '#C2410C',
            btnHover: 'rgba(124, 45, 18, 0.12)',
            dot: '#F97316',
            shadow: 'rgba(249, 115, 22, 0.25)'
        },
        dark: {
            name: 'Slate Night',
            bg: '#0F172A',
            headerBg: '#1E293B',
            border: '#334155',
            text: '#F1F5F9',
            titleText: '#F8FAFC',
            metaText: '#94A3B8',
            btnHover: 'rgba(255, 255, 255, 0.12)',
            dot: '#10B981',
            shadow: 'rgba(15, 23, 42, 0.45)'
        }
    };

    function getStaffStorageKey() {
        try {
            const rawAuth = localStorage.getItem('staff_auth') || localStorage.getItem('admin_auth') || localStorage.getItem('user');
            if (rawAuth) {
                const parsed = JSON.parse(rawAuth);
                const email = parsed.email || parsed.id || parsed.userId;
                if (email) {
                    return `staff_sticky_notes_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
                }
            }
        } catch(e) {}
        return 'staff_sticky_notes_default';
    }

    class StickyNoteManager {
        constructor() {
            this.state = this.loadState();
            this.activeNote = this.getActiveNote();
            this.isDragging = false;
            this.dragOffset = { x: 0, y: 0 };
            this.saveDebounceTimer = null;
            this.saveIndicatorTimer = null;

            this.initDOM();
            this.bindEvents();
            this.render();
            this.fetchFromServer();
        }

        loadState() {
            const storageKey = getStaffStorageKey();
            try {
                const saved = localStorage.getItem(storageKey);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed.notes) && parsed.notes.length > 0) {
                        return {
                            notes: parsed.notes,
                            activeNoteId: parsed.activeNoteId || parsed.notes[0].id,
                            isMinimized: parsed.isMinimized === true,
                            position: parsed.position || null,
                            size: parsed.size || { width: 330, height: 360 }
                        };
                    }
                }
            } catch(e) {
                console.warn('Failed to parse sticky notes state:', e);
            }

            // Default fresh note
            const initialNote = {
                id: 'note_' + Date.now(),
                title: 'Quick Scratchpad',
                content: '• Welcome to your Sticky Note!\n• Write reminders, tasks, client phone numbers, or quick thoughts here.\n• Minimizes to a neat floating pill anytime.',
                color: 'yellow',
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            return {
                notes: [initialNote],
                activeNoteId: initialNote.id,
                isMinimized: false,
                position: null,
                size: { width: 330, height: 360 }
            };
        }

        saveState() {
            const storageKey = getStaffStorageKey();
            try {
                localStorage.setItem(storageKey, JSON.stringify(this.state));
            } catch(e) {
                console.error('Failed to save sticky notes:', e);
            }
            this.syncToServer();
        }

        async syncToServer() {
            clearTimeout(this.serverSyncTimer);
            this.serverSyncTimer = setTimeout(async () => {
                try {
                    const rawAuth = localStorage.getItem('staff_auth') || localStorage.getItem('admin_auth') || localStorage.getItem('user');
                    if (!rawAuth) return;
                    const parsed = JSON.parse(rawAuth);
                    const email = parsed.email || parsed.id || parsed.userId;
                    if (!email) return;

                    await fetch('/api/staff/sticky-notes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: email,
                            staffId: parsed.id || parsed.userId,
                            stickyNotesJson: JSON.stringify(this.state)
                        })
                    });
                } catch(e) {}
            }, 800);
        }

        async fetchFromServer() {
            try {
                const rawAuth = localStorage.getItem('staff_auth') || localStorage.getItem('admin_auth') || localStorage.getItem('user');
                if (!rawAuth) return;
                const parsedAuth = JSON.parse(rawAuth);
                const email = parsedAuth.email || parsedAuth.id || parsedAuth.userId;
                if (!email) return;

                const res = await fetch(`/api/staff/sticky-notes?email=${encodeURIComponent(email)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.stickyNotesJson) {
                        const parsed = JSON.parse(data.stickyNotesJson);
                        if (parsed && Array.isArray(parsed.notes) && parsed.notes.length > 0) {
                            const localUpdated = Math.max(0, ...(this.state.notes || []).map(n => n.updatedAt || 0));
                            const remoteUpdated = Math.max(0, ...(parsed.notes || []).map(n => n.updatedAt || 0));
                            if (remoteUpdated > localUpdated) {
                                this.state = parsed;
                                this.activeNote = this.getActiveNote();
                                const storageKey = getStaffStorageKey();
                                localStorage.setItem(storageKey, JSON.stringify(this.state));
                                this.render();
                            }
                        }
                    }
                }
            } catch(e) {}
        }

        getActiveNote() {
            let note = this.state.notes.find(n => n.id === this.state.activeNoteId);
            if (!note) {
                note = this.state.notes[0];
                if (note) this.state.activeNoteId = note.id;
            }
            return note;
        }

        initDOM() {
            // Inject CSS styles for the sticky note
            const style = document.createElement('style');
            style.id = 'staff-sticky-note-styles';
            style.textContent = `
                .staff-sticky-container {
                    position: fixed;
                    z-index: 99990;
                    font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    box-sizing: border-box;
                    user-select: none;
                    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease, box-shadow 0.2s ease;
                }

                .staff-sticky-window {
                    display: flex;
                    flex-direction: column;
                    border-radius: 18px;
                    border-width: 1.5px;
                    border-style: solid;
                    overflow: hidden;
                    box-shadow: 0 16px 38px -6px rgba(0, 0, 0, 0.18), 0 8px 18px -4px rgba(0, 0, 0, 0.12);
                    backdrop-filter: blur(10px);
                }

                .staff-sticky-header {
                    padding: 9px 12px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    cursor: grab;
                    border-bottom-width: 1px;
                    border-bottom-style: solid;
                    gap: 8px;
                    touch-action: none;
                }

                .staff-sticky-header:active {
                    cursor: grabbing;
                }

                .staff-sticky-tabs {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    overflow-x: auto;
                    max-width: 180px;
                    scrollbar-width: none;
                }
                .staff-sticky-tabs::-webkit-scrollbar {
                    display: none;
                }

                .staff-sticky-tab-btn {
                    padding: 2px 7px;
                    font-size: 11px;
                    font-weight: 700;
                    border-radius: 6px;
                    white-space: nowrap;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    transition: all 0.15s;
                    max-width: 90px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .staff-sticky-tab-btn.active {
                    background: rgba(0,0,0,0.12);
                    box-shadow: 0 1px 2px rgba(0,0,0,0.06);
                }

                .staff-sticky-icon-btn {
                    width: 26px;
                    height: 26px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 7px;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    transition: background 0.15s, transform 0.1s;
                    flex-shrink: 0;
                }

                .staff-sticky-icon-btn:hover {
                    background: rgba(0,0,0,0.1);
                    transform: scale(1.06);
                }

                .staff-sticky-icon-btn:active {
                    transform: scale(0.94);
                }

                .staff-sticky-title-input {
                    background: transparent;
                    border: none;
                    outline: none;
                    font-weight: 700;
                    font-size: 13px;
                    padding: 8px 14px 4px 14px;
                    font-family: inherit;
                    width: 100%;
                    box-sizing: border-box;
                }

                .staff-sticky-textarea {
                    flex: 1;
                    background: transparent;
                    border: none;
                    outline: none;
                    resize: none;
                    padding: 4px 14px 8px 14px;
                    font-size: 12.5px;
                    line-height: 1.55;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    box-sizing: border-box;
                    width: 100%;
                    user-select: text;
                    min-height: 180px;
                }

                .staff-sticky-toolbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 5px 12px;
                    border-top: 1px dashed rgba(0,0,0,0.1);
                    font-size: 11px;
                    gap: 6px;
                }

                .staff-sticky-pill-btn {
                    padding: 3px 7px;
                    border-radius: 6px;
                    border: 1px solid rgba(0,0,0,0.12);
                    background: rgba(255,255,255,0.4);
                    font-size: 10.5px;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 3px;
                    transition: background 0.15s;
                }
                .staff-sticky-pill-btn:hover {
                    background: rgba(255,255,255,0.8);
                }

                .staff-sticky-minimized-pill {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 14px;
                    border-radius: 9999px;
                    cursor: grab;
                    box-shadow: 0 10px 25px -4px rgba(0,0,0,0.2), 0 4px 10px -2px rgba(0,0,0,0.12);
                    border-width: 1.5px;
                    border-style: solid;
                    backdrop-filter: blur(12px);
                    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s;
                }

                .staff-sticky-minimized-pill:hover {
                    transform: translateY(-2px) scale(1.03);
                    box-shadow: 0 14px 30px -4px rgba(0,0,0,0.25);
                }

                .staff-sticky-minimized-pill:active {
                    cursor: grabbing;
                    transform: scale(0.97);
                }

                .staff-sticky-color-menu {
                    position: absolute;
                    top: 38px;
                    right: 40px;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15);
                    padding: 8px;
                    display: flex;
                    gap: 6px;
                    z-index: 100;
                }

                .staff-color-dot-btn {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    border: 2px solid #ffffff;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                    cursor: pointer;
                    transition: transform 0.15s;
                }
                .staff-color-dot-btn:hover {
                    transform: scale(1.2);
                }

                .staff-sticky-resize-handle {
                    position: absolute;
                    right: 2px;
                    bottom: 2px;
                    width: 14px;
                    height: 14px;
                    cursor: nwse-resize;
                    opacity: 0.4;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .staff-sticky-resize-handle:hover {
                    opacity: 0.9;
                }
            `;
            document.head.appendChild(style);

            // Container Element
            const container = document.createElement('div');
            container.id = 'staff-sticky-note-widget';
            container.className = 'staff-sticky-container';
            document.body.appendChild(container);
            this.container = container;
        }

        bindEvents() {
            // Global storage listener to sync between multiple browser tabs
            window.addEventListener('storage', (e) => {
                if (e.key === getStaffStorageKey()) {
                    this.state = this.loadState();
                    this.activeNote = this.getActiveNote();
                    this.render();
                }
            });

            // Adjust position on window resize to ensure widget is always accessible on-screen
            window.addEventListener('resize', () => {
                this.clampPosition();
            });

            // Shortcuts: Esc to minimize
            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !this.state.isMinimized) {
                    const activeElem = document.activeElement;
                    if (activeElem && this.container.contains(activeElem)) {
                        this.minimize();
                    }
                }
            });
        }

        render() {
            this.activeNote = this.getActiveNote();
            const theme = THEMES[this.activeNote.color] || THEMES.yellow;

            if (this.state.isMinimized) {
                this.renderMinimized(theme);
            } else {
                this.renderExpanded(theme);
            }

            this.applyPosition();
        }

        renderMinimized(theme) {
            const previewSnippet = (this.activeNote.content || '').split('\n')[0].trim().slice(0, 24) || 'Empty note';
            const noteCount = this.state.notes.length;

            this.container.innerHTML = `
                <div class="staff-sticky-minimized-pill" id="staff-sticky-pill" style="
                    background: ${theme.headerBg};
                    border-color: ${theme.border};
                    color: ${theme.text};
                " title="Click to open Sticky Notes (${noteCount} note${noteCount > 1 ? 's' : ''})">
                    <span style="font-size: 15px;">📝</span>
                    <div style="display: flex; flex-direction: column; line-height: 1.1; max-width: 170px;">
                        <span style="font-size: 11.5px; font-weight: 800; color: ${theme.titleText}; display: flex; align-items: center; gap: 4px;">
                            <span>${this.escapeHtml(this.activeNote.title || 'Sticky Note')}</span>
                            ${noteCount > 1 ? `<span style="font-size: 9px; padding: 1px 5px; border-radius: 99px; background: rgba(0,0,0,0.12);">${noteCount}</span>` : ''}
                        </span>
                        <span style="font-size: 10px; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: 'Inter', sans-serif;">
                            ${this.escapeHtml(previewSnippet)}
                        </span>
                    </div>
                    <button class="staff-sticky-icon-btn" id="sticky-min-expand-btn" style="color: ${theme.text}; width: 22px; height: 22px;" title="Expand Note">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
                    </button>
                </div>
            `;

            const pill = this.container.querySelector('#staff-sticky-pill');
            if (pill) {
                // Click to expand unless dragged
                let dragMoved = false;
                pill.addEventListener('click', (e) => {
                    if (!dragMoved) {
                        this.expand();
                    }
                });

                // Attach drag to minimized pill
                this.setupDrag(pill, () => { dragMoved = true; }, () => {
                    setTimeout(() => { dragMoved = false; }, 100);
                });
            }
        }

        renderExpanded(theme) {
            const width = Math.max(280, Math.min(600, this.state.size?.width || 330));
            const height = Math.max(260, Math.min(700, this.state.size?.height || 360));
            const wordCount = (this.activeNote.content || '').trim().split(/\s+/).filter(Boolean).length;
            const charCount = (this.activeNote.content || '').length;

            const tabsHtml = this.state.notes.map(note => {
                const isActive = note.id === this.activeNote.id;
                const tabTitle = note.title || 'Note';
                return `
                    <button class="staff-sticky-tab-btn ${isActive ? 'active' : ''}" 
                            data-note-id="${note.id}"
                            style="color: ${theme.text};"
                            title="${this.escapeHtml(tabTitle)}">
                        ${this.escapeHtml(tabTitle)}
                    </button>
                `;
            }).join('');

            this.container.innerHTML = `
                <div class="staff-sticky-window" id="staff-sticky-window" style="
                    width: ${width}px;
                    height: ${height}px;
                    background: ${theme.bg};
                    border-color: ${theme.border};
                    color: ${theme.text};
                ">
                    <!-- Header -->
                    <div class="staff-sticky-header" id="staff-sticky-header" style="
                        background: ${theme.headerBg};
                        border-bottom-color: ${theme.border};
                    ">
                        <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
                            <span style="font-size: 14px; cursor: grab;" title="Drag to reposition">📌</span>
                            <div class="staff-sticky-tabs">
                                ${tabsHtml}
                            </div>
                            <button class="staff-sticky-icon-btn" id="sticky-new-note-btn" style="color: ${theme.text}; font-weight: 800; font-size: 15px;" title="Add new sticky note">+</button>
                        </div>

                        <div style="display: flex; align-items: center; gap: 2px;">
                            <button class="staff-sticky-icon-btn" id="sticky-color-btn" style="color: ${theme.text};" title="Change note color">
                                <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${theme.dot}; border: 1.5px solid #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></span>
                            </button>
                            <button class="staff-sticky-icon-btn" id="sticky-minimize-btn" style="color: ${theme.text};" title="Minimize sticky note (Esc)">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </button>
                        </div>
                    </div>

                    <!-- Color Picker Dropdown (Hidden by default) -->
                    <div id="sticky-color-picker" class="staff-sticky-color-menu" style="display: none;">
                        ${Object.keys(THEMES).map(k => `
                            <button class="staff-color-dot-btn" data-color="${k}" style="background: ${THEMES[k].dot};" title="${THEMES[k].name}"></button>
                        `).join('')}
                    </div>

                    <!-- Note Title -->
                    <input type="text" 
                           id="sticky-title-input" 
                           class="staff-sticky-title-input" 
                           value="${this.escapeHtml(this.activeNote.title || '')}" 
                           placeholder="Note title..." 
                           style="color: ${theme.titleText};" />

                    <!-- Note Content -->
                    <textarea id="sticky-textarea" 
                              class="staff-sticky-textarea" 
                              placeholder="Write anything you want... reminders, tasks, client notes, phone numbers..." 
                              style="color: ${theme.text};">${this.escapeHtml(this.activeNote.content || '')}</textarea>

                    <!-- Quick Toolbar -->
                    <div class="staff-sticky-toolbar" style="color: ${theme.metaText}; border-top-color: ${theme.border};">
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <button class="staff-sticky-pill-btn" id="sticky-add-checkbox-btn" style="color: ${theme.text};" title="Insert a checklist box">
                                ☑ Checkbox
                            </button>
                            <button class="staff-sticky-pill-btn" id="sticky-add-time-btn" style="color: ${theme.text};" title="Insert current timestamp">
                                🕒 Time
                            </button>
                            <button class="staff-sticky-pill-btn" id="sticky-copy-btn" style="color: ${theme.text};" title="Copy text to clipboard">
                                📋 Copy
                            </button>
                        </div>

                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span id="sticky-save-indicator" style="font-size: 10px; font-weight: 600; opacity: 0.8;">Saved ✓</span>
                            ${this.state.notes.length > 1 ? `
                                <button class="staff-sticky-icon-btn" id="sticky-delete-btn" style="color: ${theme.text}; width: 22px; height: 22px;" title="Delete this note">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Resize handle -->
                    <div class="staff-sticky-resize-handle" id="sticky-resize-handle" title="Drag to resize">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="20" cy="20" r="3"/><circle cx="12" cy="20" r="3"/><circle cx="20" cy="12" r="3"/></svg>
                    </div>
                </div>
            `;

            this.bindExpandedControls();
        }

        bindExpandedControls() {
            const header = this.container.querySelector('#staff-sticky-header');
            if (header) {
                this.setupDrag(header);
                // Double click header to minimize
                header.addEventListener('dblclick', (e) => {
                    if (!e.target.closest('button') && !e.target.closest('input')) {
                        this.minimize();
                    }
                });
            }

            // Tabs click
            this.container.querySelectorAll('.staff-sticky-tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const noteId = btn.getAttribute('data-note-id');
                    if (noteId && noteId !== this.state.activeNoteId) {
                        this.state.activeNoteId = noteId;
                        this.saveState();
                        this.render();
                    }
                });
            });

            // New note button
            const newBtn = this.container.querySelector('#sticky-new-note-btn');
            if (newBtn) {
                newBtn.addEventListener('click', () => {
                    this.createNote();
                });
            }

            // Minimize button
            const minBtn = this.container.querySelector('#sticky-minimize-btn');
            if (minBtn) {
                minBtn.addEventListener('click', () => {
                    this.minimize();
                });
            }

            // Color picker toggle
            const colorBtn = this.container.querySelector('#sticky-color-btn');
            const colorPicker = this.container.querySelector('#sticky-color-picker');
            if (colorBtn && colorPicker) {
                colorBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    colorPicker.style.display = colorPicker.style.display === 'none' ? 'flex' : 'none';
                });

                document.addEventListener('click', (e) => {
                    if (colorPicker && !colorPicker.contains(e.target) && e.target !== colorBtn) {
                        colorPicker.style.display = 'none';
                    }
                });
            }

            // Color selection
            this.container.querySelectorAll('.staff-color-dot-btn').forEach(dot => {
                dot.addEventListener('click', () => {
                    const color = dot.getAttribute('data-color');
                    if (color && THEMES[color]) {
                        this.activeNote.color = color;
                        this.activeNote.updatedAt = Date.now();
                        this.saveState();
                        this.render();
                    }
                });
            });

            // Title input
            const titleInput = this.container.querySelector('#sticky-title-input');
            if (titleInput) {
                titleInput.addEventListener('input', (e) => {
                    this.activeNote.title = e.target.value;
                    this.activeNote.updatedAt = Date.now();
                    this.debouncedSave();
                });
            }

            // Textarea typing & tab key support
            const textarea = this.container.querySelector('#sticky-textarea');
            if (textarea) {
                textarea.addEventListener('input', (e) => {
                    this.activeNote.content = e.target.value;
                    this.activeNote.updatedAt = Date.now();
                    this.debouncedSave();
                });

                textarea.addEventListener('keydown', (e) => {
                    // Support tab indenting
                    if (e.key === 'Tab') {
                        e.preventDefault();
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
                        textarea.selectionStart = textarea.selectionEnd = start + 2;
                        this.activeNote.content = textarea.value;
                        this.debouncedSave();
                    }
                });
            }

            // Quick Toolbar: Add Checkbox
            const checkboxBtn = this.container.querySelector('#sticky-add-checkbox-btn');
            if (checkboxBtn && textarea) {
                checkboxBtn.addEventListener('click', () => {
                    const start = textarea.selectionStart || textarea.value.length;
                    const text = textarea.value;
                    const prefix = (start > 0 && text[start - 1] !== '\n') ? '\n- [ ] ' : '- [ ] ';
                    textarea.value = text.substring(0, start) + prefix + text.substring(start);
                    textarea.selectionStart = textarea.selectionEnd = start + prefix.length;
                    textarea.focus();
                    this.activeNote.content = textarea.value;
                    this.debouncedSave();
                });
            }

            // Quick Toolbar: Add Time
            const timeBtn = this.container.querySelector('#sticky-add-time-btn');
            if (timeBtn && textarea) {
                timeBtn.addEventListener('click', () => {
                    const now = new Date();
                    const timeStr = `[${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}] `;
                    const start = textarea.selectionStart || textarea.value.length;
                    const text = textarea.value;
                    textarea.value = text.substring(0, start) + timeStr + text.substring(start);
                    textarea.selectionStart = textarea.selectionEnd = start + timeStr.length;
                    textarea.focus();
                    this.activeNote.content = textarea.value;
                    this.debouncedSave();
                });
            }

            // Quick Toolbar: Copy
            const copyBtn = this.container.querySelector('#sticky-copy-btn');
            if (copyBtn && textarea) {
                copyBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(textarea.value || '').then(() => {
                        const originalText = copyBtn.innerHTML;
                        copyBtn.innerHTML = '✓ Copied';
                        setTimeout(() => { copyBtn.innerHTML = originalText; }, 1500);
                    });
                });
            }

            // Delete Note
            const deleteBtn = this.container.querySelector('#sticky-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    if (this.state.notes.length <= 1) return;
                    if (confirm(`Delete sticky note "${this.activeNote.title || 'Untitled'}"?`)) {
                        this.state.notes = this.state.notes.filter(n => n.id !== this.activeNote.id);
                        this.state.activeNoteId = this.state.notes[0].id;
                        this.saveState();
                        this.render();
                    }
                });
            }

            // Resizing
            const resizeHandle = this.container.querySelector('#sticky-resize-handle');
            const windowEl = this.container.querySelector('#staff-sticky-window');
            if (resizeHandle && windowEl) {
                this.setupResize(resizeHandle, windowEl);
            }
        }

        debouncedSave() {
            const indicator = this.container.querySelector('#sticky-save-indicator');
            if (indicator) {
                indicator.textContent = 'Saving...';
                indicator.style.opacity = '1';
            }

            clearTimeout(this.saveDebounceTimer);
            this.saveDebounceTimer = setTimeout(() => {
                this.saveState();
                if (indicator) {
                    indicator.textContent = 'Saved ✓';
                    clearTimeout(this.saveIndicatorTimer);
                    this.saveIndicatorTimer = setTimeout(() => {
                        indicator.style.opacity = '0.6';
                    }, 1200);
                }
            }, 300);
        }

        createNote() {
            const noteCount = this.state.notes.length + 1;
            const newNote = {
                id: 'note_' + Date.now(),
                title: `Note ${noteCount}`,
                content: '',
                color: this.activeNote.color || 'yellow',
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            this.state.notes.push(newNote);
            this.state.activeNoteId = newNote.id;
            this.saveState();
            this.render();

            setTimeout(() => {
                const titleInput = this.container.querySelector('#sticky-title-input');
                if (titleInput) {
                    titleInput.focus();
                    titleInput.select();
                }
            }, 50);
        }

        minimize() {
            this.state.isMinimized = true;
            this.saveState();
            this.render();
        }

        expand() {
            this.state.isMinimized = false;
            this.saveState();
            this.render();
            setTimeout(() => {
                const ta = this.container.querySelector('#sticky-textarea');
                if (ta) ta.focus();
            }, 50);
        }

        toggleOpen() {
            if (this.state.isMinimized) {
                this.expand();
            } else {
                this.minimize();
            }
        }

        setupDrag(handleElement, onDragStart, onDragEnd) {
            let startX = 0, startY = 0;
            let initialX = 0, initialY = 0;

            const onPointerMove = (e) => {
                if (!this.isDragging) return;
                e.preventDefault();
                const clientX = e.clientX || (e.touches && e.touches[0].clientX);
                const clientY = e.clientY || (e.touches && e.touches[0].clientY);

                const dx = clientX - startX;
                const dy = clientY - startY;

                let newX = initialX + dx;
                let newY = initialY + dy;

                // Clamp to screen boundaries
                const rect = this.container.getBoundingClientRect();
                const pad = 12;
                newX = Math.max(pad, Math.min(window.innerWidth - rect.width - pad, newX));
                newY = Math.max(pad, Math.min(window.innerHeight - rect.height - pad, newY));

                this.container.style.left = `${newX}px`;
                this.container.style.top = `${newY}px`;
                this.container.style.right = 'auto';
                this.container.style.bottom = 'auto';

                this.state.position = { x: newX, y: newY };
            };

            const onPointerUp = () => {
                if (!this.isDragging) return;
                this.isDragging = false;
                window.removeEventListener('mousemove', onPointerMove);
                window.removeEventListener('mouseup', onPointerUp);
                window.removeEventListener('touchmove', onPointerMove);
                window.removeEventListener('touchend', onPointerUp);

                this.saveState();
                if (typeof onDragEnd === 'function') onDragEnd();
            };

            const onPointerDown = (e) => {
                if (e.target.closest('button') || e.target.closest('input')) return;
                this.isDragging = true;
                const rect = this.container.getBoundingClientRect();
                initialX = rect.left;
                initialY = rect.top;
                startX = e.clientX || (e.touches && e.touches[0].clientX);
                startY = e.clientY || (e.touches && e.touches[0].clientY);

                window.addEventListener('mousemove', onPointerMove, { passive: false });
                window.addEventListener('mouseup', onPointerUp);
                window.addEventListener('touchmove', onPointerMove, { passive: false });
                window.addEventListener('touchend', onPointerUp);

                if (typeof onDragStart === 'function') onDragStart();
            };

            handleElement.addEventListener('mousedown', onPointerDown);
            handleElement.addEventListener('touchstart', onPointerDown, { passive: true });
        }

        setupResize(handleElement, targetWindow) {
            let startW = 0, startH = 0;
            let startX = 0, startY = 0;

            const onMove = (e) => {
                e.preventDefault();
                const clientX = e.clientX || (e.touches && e.touches[0].clientX);
                const clientY = e.clientY || (e.touches && e.touches[0].clientY);

                const dw = clientX - startX;
                const dh = clientY - startY;

                const newW = Math.max(280, Math.min(window.innerWidth - 40, startW + dw));
                const newH = Math.max(240, Math.min(window.innerHeight - 40, startH + dh));

                targetWindow.style.width = `${newW}px`;
                targetWindow.style.height = `${newH}px`;
                this.state.size = { width: newW, height: newH };
            };

            const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
                window.removeEventListener('touchmove', onMove);
                window.removeEventListener('touchend', onUp);
                this.saveState();
            };

            handleElement.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const rect = targetWindow.getBoundingClientRect();
                startW = rect.width;
                startH = rect.height;
                startX = e.clientX;
                startY = e.clientY;

                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
            });
        }

        applyPosition() {
            const pad = 24;
            if (this.state.position && typeof this.state.position.x === 'number' && typeof this.state.position.y === 'number') {
                const rect = this.container.getBoundingClientRect();
                const w = rect.width || 330;
                const h = rect.height || 360;

                const clampedX = Math.max(pad, Math.min(window.innerWidth - w - pad, this.state.position.x));
                const clampedY = Math.max(pad, Math.min(window.innerHeight - h - pad, this.state.position.y));

                this.container.style.left = `${clampedX}px`;
                this.container.style.top = `${clampedY}px`;
                this.container.style.right = 'auto';
                this.container.style.bottom = 'auto';
            } else {
                // Default position: bottom-right corner
                this.container.style.left = 'auto';
                this.container.style.top = 'auto';
                this.container.style.right = `${pad}px`;
                this.container.style.bottom = `${pad}px`;
            }
        }

        clampPosition() {
            if (this.state.position) {
                this.applyPosition();
            }
        }

        escapeHtml(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }
    }

    // Auto-initialize when DOM is ready
    function initStickyNotes() {
        if (!window.StaffStickyNotes) {
            window.StaffStickyNotes = new StickyNoteManager();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStickyNotes);
    } else {
        initStickyNotes();
    }

})();
