/**
 * Main Application Bootstrap (ES6 Module)
 * Orchestrates all presentation modules, autosave, keyboard shortcuts,
 * and initializes default sample deck with RibbonToolbar.
 */

import { state } from './core/state.js';
import { StorageService } from './core/db.js';
import { CanvasEngine } from './core/canvasEngine.js';
import { TopBar } from './components/topBar.js';
import { SlideReel } from './components/slideReel.js';
import { RibbonToolbar } from './components/ribbonToolbar.js';
import { PresenterMode } from './components/presenterMode.js';
import { ExporterService } from './services/exporter.js';
import { SlideTemplates } from './templates/slideTemplates.js';

class App {
    constructor() {
        this.canvasEngine = null;
        this.topBar = null;
        this.slideReel = null;
        this.ribbonToolbar = null;
        this.presenterMode = null;
        this.exporter = null;
    }

    async init() {
        // 1. Initialize Canvas Engine
        this.canvasEngine = new CanvasEngine('c', 'canvas-wrapper');

        // 2. Initialize Presenter & Exporter
        this.presenterMode = new PresenterMode(state, this.canvasEngine);
        this.exporter = new ExporterService(state, this.canvasEngine);

        // 3. Initialize TopBar & SlideReel
        this.topBar = new TopBar(state, this.canvasEngine, this.presenterMode, this.exporter);
        this.slideReel = new SlideReel(state, this.canvasEngine);

        // 4. Initialize Unified SaaS Ribbon Toolbar (Replaces old floating toolbar & bubble)
        this.ribbonToolbar = new RibbonToolbar(this.canvasEngine, state);

        // 5. Load saved deck or seed starter presentation
        await this.loadOrSeedDeck();

        // 6. Setup autosave, global keyboard shortcuts & speaker notes
        this.setupAutosave();
        this.setupShortcuts();
        this.setupSpeakerNotes();

        console.log('✨ World-Class Presentation Studio Initialized Successfully!');
    }

    async loadOrSeedDeck() {
        const savedDecks = await StorageService.getAllDecks();
        if (savedDecks && savedDecks.length > 0) {
            const latestDeck = savedDecks[0];
            state.setDeck(latestDeck);
            const firstSlide = state.activeSlide;
            if (firstSlide) {
                this.canvasEngine.loadSlide(firstSlide);
            }
        } else {
            // Seed pristine starter presentation with 3 world-class slides
            this.seedStarterPresentation();
        }
    }

    seedStarterPresentation() {
        state.deck.title = 'Vision Pitch 2026';
        state.deck.aspectRatio = '16:9';
        state.deck.theme = 'white';
        state.deck.slides = [];

        // Slide 1: Hero Title
        const s1 = state.addSlide({ title: 'Title & Hero Pitch', background: '#ffffff' });
        this.canvasEngine.loadSlide(s1);
        SlideTemplates[0].create(this.canvasEngine.canvas);
        const thumb1 = this.canvasEngine.getThumbnail();
        const json1 = this.canvasEngine.getJSON();
        state.updateCurrentSlideCanvas(json1, thumb1);

        // Slide 2: Feature Cards
        const s2 = state.addSlide({ title: 'Key Features & Pillars', background: '#ffffff' });
        this.canvasEngine.loadSlide(s2);
        SlideTemplates[1].create(this.canvasEngine.canvas);
        const thumb2 = this.canvasEngine.getThumbnail();
        const json2 = this.canvasEngine.getJSON();
        state.updateCurrentSlideCanvas(json2, thumb2);

        // Slide 3: Big Metric
        const s3 = state.addSlide({ title: 'Growth & Impact Metrics', background: '#ffffff' });
        this.canvasEngine.loadSlide(s3);
        SlideTemplates[2].create(this.canvasEngine.canvas);
        const thumb3 = this.canvasEngine.getThumbnail();
        const json3 = this.canvasEngine.getJSON();
        state.updateCurrentSlideCanvas(json3, thumb3);

        // Reset back to slide 1
        state.setCurrentSlideIndex(0);
        this.canvasEngine.loadSlide(state.deck.slides[0]);

        // Save initial seeded deck
        StorageService.saveDeck(state.deck);
    }

    setupAutosave() {
        let autosaveTimer = null;
        const triggerAutosave = () => {
            if (autosaveTimer) clearTimeout(autosaveTimer);
            autosaveTimer = setTimeout(async () => {
                if (state.isDirty) {
                    const json = this.canvasEngine.getJSON();
                    const thumb = this.canvasEngine.getThumbnail();
                    state.updateCurrentSlideCanvas(json, thumb);

                    await StorageService.saveDeck(state.deck);
                    state.isDirty = false;

                    const toast = document.getElementById('status-toast');
                    if (toast) {
                        toast.innerText = 'Saved';
                        toast.classList.add('visible');
                        setTimeout(() => toast.classList.remove('visible'), 1200);
                    }
                }
            }, 1000);
        };

        state.on('state:modified', triggerAutosave);
        this.canvasEngine.canvas.on('object:modified', triggerAutosave);
        this.canvasEngine.canvas.on('object:added', triggerAutosave);
        this.canvasEngine.canvas.on('object:removed', triggerAutosave);
    }

    setupShortcuts() {
        window.addEventListener('keydown', (e) => {
            if (this.presenterMode.isActive) return;

            const el = document.activeElement;
            const tag = el ? el.tagName.toLowerCase() : '';
            const isFabricHidden = el?.classList?.contains('fabric-canvas-hidden-textarea') || el?.hasAttribute?.('data-fabric-hiddentextarea');

            // If user is typing in a real form input or notes textarea, don't intercept
            if ((tag === 'input' || tag === 'textarea') && !isFabricHidden) {
                return;
            }
            if (el?.isContentEditable) return;

            const activeObj = this.canvasEngine.canvas.getActiveObject();

            // Delete: Delete or Backspace
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (activeObj && !activeObj.isEditing) {
                    e.preventDefault();
                    this.canvasEngine.deleteActiveObjects();
                    return;
                }
            }

            // Undo: Ctrl+Z
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                this.canvasEngine.undo();
                return;
            }

            // Redo: Ctrl+Y or Ctrl+Shift+Z
            if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
                e.preventDefault();
                this.canvasEngine.redo();
                return;
            }

            // Duplicate: Ctrl+D
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                if (activeObj) {
                    this.canvasEngine.cloneActiveObjects();
                } else {
                    state.duplicateSlide(state.currentSlideIndex);
                }
                return;
            }

            // Escape: Deselect active object or exit text editing
            if (e.key === 'Escape') {
                if (activeObj) {
                    if (activeObj.isEditing) activeObj.exitEditing();
                    this.canvasEngine.canvas.discardActiveObject();
                    this.canvasEngine.canvas.requestRenderAll();
                    document.getElementById('floating-selection-pill')?.classList.add('hidden');
                }
            }
        });
    }

    setupSpeakerNotes() {
        const notesToggle = document.getElementById('btn-toggle-notes');
        const notesDrawer = document.getElementById('speaker-notes-drawer');
        const notesTextarea = document.getElementById('speaker-notes-input');
        const notesClose = document.getElementById('btn-close-notes');

        const toggleNotes = (show) => {
            const isVisible = show !== undefined ? show : notesDrawer.classList.contains('hidden');
            notesDrawer.classList.toggle('hidden', !isVisible);
            notesToggle?.classList.toggle('active', isVisible);
            if (isVisible && state.activeSlide && notesTextarea) {
                notesTextarea.value = state.activeSlide.notes || '';
                notesTextarea.focus();
            }
            // Trigger canvas resize to account for drawer
            setTimeout(() => this.canvasEngine.resizeToFit(), 150);
        };

        if (notesToggle && notesDrawer) {
            notesToggle.addEventListener('click', () => {
                toggleNotes();
            });
        }

        if (notesClose) {
            notesClose.addEventListener('click', () => {
                toggleNotes(false);
            });
        }

        if (notesTextarea) {
            notesTextarea.addEventListener('input', (e) => {
                state.updateCurrentSlideNotes(e.target.value);
            });
        }

        state.on('slide:change', ({ slide }) => {
            if (notesTextarea && slide) {
                notesTextarea.value = slide.notes || '';
            }
        });
    }
}

// Bootstrap application safely regardless of whether DOMContentLoaded already fired
function bootstrap() {
    if (window.__VISION_STUDIO_STARTED__) return;
    window.__VISION_STUDIO_STARTED__ = true;
    try {
        window.app = new App();
        window.app.init();
    } catch (err) {
        console.error('Fatal error initializing presentation studio:', err);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    // DOM is already parsed (interactive or complete), launch immediately!
    bootstrap();
}

export { App };
