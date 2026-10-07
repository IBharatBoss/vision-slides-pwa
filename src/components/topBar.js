/**
 * TopBar Component
 * Controls presentation title, custom SaaS dropdowns for aspect ratio & transition,
 * undo/redo, export options, speaker notes toggle, and launches presentation mode.
 */

export class TopBar {
    constructor(state, canvasEngine, presenterMode, exporter) {
        this.state = state;
        this.canvasEngine = canvasEngine;
        this.presenterMode = presenterMode;
        this.exporter = exporter;

        this.titleInput = document.getElementById('deck-title-input');
        this.btnUndo = document.getElementById('btn-undo');
        this.btnRedo = document.getElementById('btn-redo');
        this.btnPresent = document.getElementById('btn-present');
        this.btnExportDropdown = document.getElementById('btn-export-dropdown');
        this.exportMenu = document.getElementById('export-menu-dropdown');

        this.init();
    }

    init() {
        // 1. Deck Title Editing
        if (this.titleInput) {
            this.titleInput.value = this.state.deck.title;
            this.titleInput.addEventListener('input', (e) => {
                this.state.setTitle(e.target.value);
            });
            this.titleInput.addEventListener('blur', (e) => {
                if (!e.target.value.trim()) {
                    e.target.value = 'Untitled Presentation';
                    this.state.setTitle('Untitled Presentation');
                }
            });
        }

        // 2. Custom SaaS Aspect Ratio Dropdown
        this.setupCustomRatioDropdown();

        // 3. Custom SaaS Slide Transition Dropdown
        this.setupCustomTransitionDropdown();

        // 4. Undo / Redo
        if (this.btnUndo) {
            this.btnUndo.addEventListener('click', () => this.canvasEngine.undo());
        }
        if (this.btnRedo) {
            this.btnRedo.addEventListener('click', () => this.canvasEngine.redo());
        }

        // 5. Present Mode
        if (this.btnPresent) {
            this.btnPresent.addEventListener('click', () => {
                this.presenterMode.startPresentation();
            });
        }

        // 6. Export Menu Toggle & Actions
        this.setupExportMenu();

        // 7. Mobile Controls & Slide Drawer
        this.setupMobileControls();

        // 8. Subscribe to state updates
        this.state.on('deck:titleChange', (title) => {
            if (this.titleInput && this.titleInput.value !== title) {
                this.titleInput.value = title;
            }
        });

        this.state.on('slide:change', ({ slide }) => {
            if (slide) {
                this.syncTransitionDisplay(slide.transition || 'fade');
            }
            this.syncMobileSlideCounter();
        });

        this.state.on('slide:added', () => this.syncMobileSlideCounter());
        this.state.on('slide:deleted', () => this.syncMobileSlideCounter());
        this.state.on('deck:loaded', () => this.syncMobileSlideCounter());
    }

    setupCustomRatioDropdown() {
        const dropdown = document.getElementById('dropdown-ratio');
        const trigger = dropdown?.querySelector('.dropdown-trigger');
        const popover = document.getElementById('popover-ratio');
        const valDisplay = document.getElementById('val-ratio');

        if (!trigger || !popover) return;

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.classList.contains('open');
            document.querySelectorAll('.saas-dropdown').forEach(d => {
                d.classList.remove('open');
                d.querySelector('.dropdown-popover')?.classList.add('hidden');
            });
            if (!isOpen) {
                dropdown.classList.add('open');
                popover.classList.remove('hidden');
            }
        });

        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('open');
                popover.classList.add('hidden');
            }
        });

        popover.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const ratio = item.dataset.value;
                const title = item.querySelector('.item-title')?.innerText || ratio;
                popover.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                if (valDisplay) valDisplay.innerText = title;
                dropdown.classList.remove('open');
                popover.classList.add('hidden');

                this.state.setAspectRatio(ratio);
                this.canvasEngine.setAspectRatio(ratio);
            });
        });
    }

    setupCustomTransitionDropdown() {
        const dropdown = document.getElementById('dropdown-transition');
        const trigger = dropdown?.querySelector('.dropdown-trigger');
        const popover = document.getElementById('popover-transition');
        const valDisplay = document.getElementById('val-transition');

        if (!trigger || !popover) return;

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.classList.contains('open');
            document.querySelectorAll('.saas-dropdown').forEach(d => {
                d.classList.remove('open');
                d.querySelector('.dropdown-popover')?.classList.add('hidden');
            });
            if (!isOpen) {
                dropdown.classList.add('open');
                popover.classList.remove('hidden');
            }
        });

        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('open');
                popover.classList.add('hidden');
            }
        });

        popover.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const trans = item.dataset.value;
                const title = item.querySelector('.item-title')?.innerText || trans;
                popover.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                if (valDisplay) valDisplay.innerText = title;
                dropdown.classList.remove('open');
                popover.classList.add('hidden');

                this.state.updateCurrentSlideTransition(trans);
            });
        });
    }

    syncTransitionDisplay(transVal) {
        const popover = document.getElementById('popover-transition');
        const valDisplay = document.getElementById('val-transition');
        if (!popover || !valDisplay) return;

        popover.querySelectorAll('.dropdown-item').forEach(item => {
            const matches = item.dataset.value === transVal;
            item.classList.toggle('active', matches);
            if (matches) {
                valDisplay.innerText = item.querySelector('.item-title')?.innerText || transVal;
            }
        });
    }

    setupExportMenu() {
        if (!this.btnExportDropdown || !this.exportMenu) return;

        this.btnExportDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.dropdown-popover').forEach(p => p.classList.add('hidden'));
            this.exportMenu.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!this.exportMenu.contains(e.target) && !this.btnExportDropdown.contains(e.target)) {
                this.exportMenu.classList.add('hidden');
            }
        });

        // PDF Export
        document.getElementById('export-pdf-action')?.addEventListener('click', () => {
            this.exportMenu.classList.add('hidden');
            this.exporter.exportToPDF();
        });

        // PNG Export All
        document.getElementById('export-png-all-action')?.addEventListener('click', () => {
            this.exportMenu.classList.add('hidden');
            this.exporter.exportAllPNG();
        });

        // JSON Backup
        document.getElementById('export-json-action')?.addEventListener('click', () => {
            this.exportMenu.classList.add('hidden');
            this.exporter.exportJSON();
        });

        // Import JSON
        const fileInput = document.getElementById('import-file-input');
        document.getElementById('import-json-action')?.addEventListener('click', () => {
            this.exportMenu.classList.add('hidden');
            fileInput?.click();
        });
        fileInput?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.exporter.importJSON(e.target.files[0]);
            }
        });
    }

    setupMobileControls() {
        const reelSidebar = document.getElementById('slide-reel-sidebar');
        const reelBackdrop = document.getElementById('mobile-reel-backdrop');
        const btnToggleReel = document.getElementById('btn-toggle-slide-reel');
        const btnCloseReel = document.getElementById('btn-close-reel-drawer');
        const btnUndoMobile = document.getElementById('btn-undo-mobile');
        const btnMobileMore = document.getElementById('btn-mobile-more');
        const popoverMobileMore = document.getElementById('popover-mobile-more');

        // Toggle Slide Drawer
        const toggleDrawer = (open) => {
            const isOpen = open !== undefined ? open : !reelSidebar?.classList.contains('mobile-open');
            reelSidebar?.classList.toggle('mobile-open', isOpen);
            reelBackdrop?.classList.toggle('hidden', !isOpen);
        };

        btnToggleReel?.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDrawer();
        });

        btnCloseReel?.addEventListener('click', () => toggleDrawer(false));
        reelBackdrop?.addEventListener('click', () => toggleDrawer(false));

        // When a slide thumbnail is clicked on mobile, close the drawer
        document.getElementById('slide-thumbnails-list')?.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                toggleDrawer(false);
            }
        });

        // Mobile Undo / Redo
        btnUndoMobile?.addEventListener('click', () => this.canvasEngine.undo());
        document.getElementById('btn-redo-mobile')?.addEventListener('click', () => this.canvasEngine.redo());

        // Mobile More Menu
        btnMobileMore?.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = popoverMobileMore?.classList.contains('hidden');
            document.querySelectorAll('.dropdown-popover').forEach(p => p.classList.add('hidden'));
            if (isHidden) popoverMobileMore?.classList.remove('hidden');
        });

        document.addEventListener('click', (e) => {
            if (popoverMobileMore && !popoverMobileMore.contains(e.target) && e.target !== btnMobileMore) {
                popoverMobileMore.classList.add('hidden');
            }
        });

        // Mobile Aspect Ratios
        document.getElementById('mobile-ratio-16-9')?.addEventListener('click', () => {
            popoverMobileMore?.classList.add('hidden');
            this.state.setAspectRatio('16:9');
            this.canvasEngine.setAspectRatio('16:9');
        });
        document.getElementById('mobile-ratio-4-3')?.addEventListener('click', () => {
            popoverMobileMore?.classList.add('hidden');
            this.state.setAspectRatio('4:3');
            this.canvasEngine.setAspectRatio('4:3');
        });
        document.getElementById('mobile-ratio-9-16')?.addEventListener('click', () => {
            popoverMobileMore?.classList.add('hidden');
            this.state.setAspectRatio('9:16');
            this.canvasEngine.setAspectRatio('9:16');
        });

        // Mobile Transitions
        document.getElementById('mobile-trans-fade')?.addEventListener('click', () => {
            popoverMobileMore?.classList.add('hidden');
            this.state.updateCurrentSlideTransition('fade');
        });
        document.getElementById('mobile-trans-zoom')?.addEventListener('click', () => {
            popoverMobileMore?.classList.add('hidden');
            this.state.updateCurrentSlideTransition('zoom');
        });
        document.getElementById('mobile-trans-push')?.addEventListener('click', () => {
            popoverMobileMore?.classList.add('hidden');
            this.state.updateCurrentSlideTransition('push');
        });

        // Mobile Actions
        document.getElementById('mobile-action-notes')?.addEventListener('click', () => {
            popoverMobileMore?.classList.add('hidden');
            document.getElementById('btn-toggle-notes')?.click();
        });

        document.getElementById('mobile-action-export-pdf')?.addEventListener('click', () => {
            popoverMobileMore?.classList.add('hidden');
            this.exporter.exportPDF();
        });

        document.getElementById('mobile-action-export-png')?.addEventListener('click', () => {
            popoverMobileMore?.classList.add('hidden');
            this.exporter.exportAllPNG();
        });

        document.getElementById('mobile-action-templates')?.addEventListener('click', () => {
            popoverMobileMore?.classList.add('hidden');
            document.getElementById('templates-modal')?.classList.remove('hidden');
        });

        this.syncMobileSlideCounter();
    }

    syncMobileSlideCounter() {
        const counter = document.getElementById('mobile-slide-pill-counter');
        if (counter && this.state.deck) {
            const current = this.state.currentSlideIndex + 1;
            const total = Math.max(1, this.state.deck.slides.length);
            counter.innerText = `${current}/${total}`;
        }
    }
}
