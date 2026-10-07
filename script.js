/**
 * Vision Slides | World-Class Presentation Studio
 * Standalone Bundled Script (ES6 Modular Logic for 100% Zero-Config Offline Compatibility)
 */

(function () {
    // Avoid double initialization if studio already loaded
    if (window.__VISION_STUDIO_STARTED__) return;

    // CanvasTextBaseline Fix for Chrome / Fabric.js
    try {
        const proto = CanvasRenderingContext2D.prototype;
        const desc = Object.getOwnPropertyDescriptor(proto, 'textBaseline');
        if (desc && desc.set) {
            Object.defineProperty(proto, 'textBaseline', {
                get: function() { return desc.get.call(this); },
                set: function(val) {
                    if (val === 'alphabetical') val = 'alphabetic';
                    desc.set.call(this, val);
                },
                configurable: true,
                enumerable: true
            });
        }
    } catch (e) {}

    // --- 1. DATABASE & STORAGE (Dexie.js) ---
    const db = new Dexie('PresentationStudioDB');
    db.version(1).stores({
        decks: '++id, title, modified, created',
        slides: '++id, deckId, order, modified'
    });

    const StorageService = {
        async saveDeck(deckData) {
            try {
                const existing = await db.decks.get(deckData.id);
                if (existing) {
                    await db.decks.update(deckData.id, { ...deckData, modified: Date.now() });
                    return deckData.id;
                } else {
                    const id = await db.decks.add({ ...deckData, created: Date.now(), modified: Date.now() });
                    return id;
                }
            } catch (err) {
                console.warn('Dexie save fallback to localStorage:', err);
                localStorage.setItem('ppt_backup_' + deckData.id, JSON.stringify(deckData));
                return deckData.id;
            }
        },

        async getAllDecks() {
            try {
                return await db.decks.orderBy('modified').reverse().toArray();
            } catch (err) {
                return [];
            }
        }
    };

    // --- 2. PRESENTATION STATE ---
    class PresentationState {
        constructor() {
            this.deck = {
                id: 'deck-default',
                title: 'Vision Pitch 2026',
                aspectRatio: '16:9',
                theme: 'white',
                slides: []
            };
            this.currentSlideIndex = 0;
            this.listeners = new Map();
            this.isDirty = false;
        }

        on(event, cb) {
            if (!this.listeners.has(event)) this.listeners.set(event, new Set());
            this.listeners.get(event).add(cb);
            return () => this.listeners.get(event).delete(cb);
        }

        emit(event, data) {
            if (this.listeners.has(event)) {
                for (const cb of this.listeners.get(event)) {
                    try { cb(data); } catch (e) { console.error(e); }
                }
            }
        }

        get activeSlide() {
            return this.deck.slides[this.currentSlideIndex] || null;
        }

        setDeck(newDeck) {
            this.deck = newDeck;
            this.currentSlideIndex = Math.min(this.currentSlideIndex, Math.max(0, this.deck.slides.length - 1));
            this.emit('deck:loaded', this.deck);
            this.emit('slide:change', { index: this.currentSlideIndex, slide: this.activeSlide });
        }

        setTitle(t) {
            this.deck.title = t || 'Untitled Presentation';
            this.isDirty = true;
            this.emit('deck:titleChange', this.deck.title);
            this.emit('state:modified');
        }

        setAspectRatio(r) {
            this.deck.aspectRatio = r;
            this.isDirty = true;
            this.emit('deck:aspectRatioChange', r);
            this.emit('state:modified');
        }

        setCurrentSlideIndex(idx) {
            if (idx < 0 || idx >= this.deck.slides.length) return;
            this.currentSlideIndex = idx;
            this.emit('slide:change', { index: idx, slide: this.activeSlide });
        }

        addSlide(data, atIndex = null) {
            const newSlide = {
                id: 'slide_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                title: data?.title || `Slide ${this.deck.slides.length + 1}`,
                canvasJSON: data?.canvasJSON || { version: "5.3.0", objects: [] },
                background: data?.background || '#ffffff',
                thumbnail: data?.thumbnail || '',
                notes: data?.notes || '',
                transition: data?.transition || 'fade'
            };

            const targetIndex = atIndex !== null ? atIndex : this.deck.slides.length;
            this.deck.slides.splice(targetIndex, 0, newSlide);
            this.currentSlideIndex = targetIndex;
            this.isDirty = true;

            this.emit('slide:added', { slide: newSlide, index: targetIndex });
            this.emit('slide:change', { index: targetIndex, slide: newSlide });
            this.emit('state:modified');
            return newSlide;
        }

        duplicateSlide(idx) {
            if (idx < 0 || idx >= this.deck.slides.length) return;
            const src = this.deck.slides[idx];
            const copy = {
                ...JSON.parse(JSON.stringify(src)),
                id: 'slide_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                title: `${src.title} (Copy)`
            };
            const nextIdx = idx + 1;
            this.deck.slides.splice(nextIdx, 0, copy);
            this.currentSlideIndex = nextIdx;
            this.isDirty = true;

            this.emit('slide:added', { slide: copy, index: nextIdx });
            this.emit('slide:change', { index: nextIdx, slide: copy });
            this.emit('state:modified');
        }

        deleteSlide(idx) {
            if (this.deck.slides.length <= 1) {
                const s = this.deck.slides[0];
                s.canvasJSON = { version: "5.3.0", objects: [] };
                s.background = '#ffffff';
                s.notes = '';
                s.thumbnail = '';
                this.emit('slide:cleared', { slide: s, index: 0 });
                this.emit('state:modified');
                return;
            }

            const removed = this.deck.slides.splice(idx, 1)[0];
            if (this.currentSlideIndex >= this.deck.slides.length) {
                this.currentSlideIndex = this.deck.slides.length - 1;
            }
            this.isDirty = true;

            this.emit('slide:deleted', { slide: removed, index: idx });
            this.emit('slide:change', { index: this.currentSlideIndex, slide: this.activeSlide });
            this.emit('state:modified');
        }

        moveSlide(fromIdx, toIdx) {
            if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 ||
                fromIdx >= this.deck.slides.length || toIdx >= this.deck.slides.length) return;

            const [moved] = this.deck.slides.splice(fromIdx, 1);
            this.deck.slides.splice(toIdx, 0, moved);
            this.currentSlideIndex = toIdx;
            this.isDirty = true;

            this.emit('slide:reordered', { fromIdx, toIdx });
            this.emit('slide:change', { index: toIdx, slide: moved });
            this.emit('state:modified');
        }

        updateCurrentSlideCanvas(canvasJSON, thumb = '') {
            const s = this.activeSlide;
            if (!s) return;
            s.canvasJSON = canvasJSON;
            if (thumb) s.thumbnail = thumb;
            this.isDirty = true;
            this.emit('slide:updated', { slide: s, index: this.currentSlideIndex });
            this.emit('state:modified');
        }

        updateCurrentSlideBackground(color) {
            const s = this.activeSlide;
            if (!s) return;
            s.background = color;
            this.isDirty = true;
            this.emit('slide:backgroundChange', { color, slide: s });
            this.emit('state:modified');
        }

        updateCurrentSlideNotes(notes) {
            const s = this.activeSlide;
            if (!s) return;
            s.notes = notes;
            this.isDirty = true;
            this.emit('slide:notesChange', { notes, slide: s });
            this.emit('state:modified');
        }

        updateCurrentSlideTransition(t) {
            const s = this.activeSlide;
            if (!s) return;
            s.transition = t;
            this.isDirty = true;
            this.emit('slide:transitionChange', { transition: t, slide: s });
            this.emit('state:modified');
        }
    }

    const state = new PresentationState();

    // --- 3. CANVAS ENGINE (16:9 Responsive Auto-Fit & Snapping) ---
    class CanvasEngine {
        constructor(canvasId, containerId) {
            this.canvasId = canvasId;
            this.containerId = containerId;
            this.canvas = null;
            this.container = null;
            this.virtualWidth = 1920;
            this.virtualHeight = 1080;
            this.scale = 1;
            this.snapThreshold = 12;

            this.undoStack = [];
            this.redoStack = [];
            this.isHistoryLocked = false;

            this.init();
        }

        init() {
            this.container = document.getElementById(this.containerId);
            this.canvas = new fabric.Canvas(this.canvasId, {
                width: this.virtualWidth,
                height: this.virtualHeight,
                backgroundColor: '#ffffff',
                selection: true,
                preserveObjectStacking: true,
                fireRightClick: true,
                stopContextMenu: true
            });

            fabric.Object.prototype.set({
                transparentCorners: false,
                cornerColor: '#ffffff',
                cornerStrokeColor: '#2563eb',
                borderColor: '#3b82f6',
                cornerSize: 10,
                padding: 4,
                cornerStyle: 'circle',
                borderDashArray: [3, 3],
                centeredScaling: false
            });

            // 60-120fps smooth performance: enable offscreen object caching
            fabric.Object.prototype.objectCaching = true;
            fabric.Object.prototype.statefullCache = false;
            fabric.Object.prototype.noScaleCache = false;

            if (fabric.IText) fabric.IText.prototype.lockUniScaling = true;
            if (fabric.Textbox) fabric.Textbox.prototype.lockUniScaling = true;

            // Ensure hidden textarea can never cause Chrome focus scroll
            if (fabric.IText) {
                fabric.IText.prototype._calcTextareaPosition = function() {
                    return { left: '10px', top: '10px' };
                };
                const origInitHidden = fabric.IText.prototype.initHiddenTextarea;
                fabric.IText.prototype.initHiddenTextarea = function() {
                    origInitHidden.call(this);
                    if (this.hiddenTextarea) {
                        this.hiddenTextarea.style.position = 'fixed';
                        this.hiddenTextarea.style.top = '10px';
                        this.hiddenTextarea.style.left = '10px';
                        this.hiddenTextarea.style.width = '1px';
                        this.hiddenTextarea.style.height = '1px';
                        this.hiddenTextarea.style.opacity = '0';
                        this.hiddenTextarea.style.pointerEvents = 'none';
                        this.hiddenTextarea.style.zIndex = '-99999';
                    }
                };
                fabric.IText.prototype.updateTextareaPosition = function() {
                    if (this.hiddenTextarea) {
                        this.hiddenTextarea.style.position = 'fixed';
                        this.hiddenTextarea.style.top = '10px';
                        this.hiddenTextarea.style.left = '10px';
                    }
                };
            }

            if (fabric.Object.prototype.controls && fabric.Object.prototype.controls.mtr) {
                fabric.Object.prototype.controls.mtr.y = -0.5;
                fabric.Object.prototype.controls.mtr.offsetY = -24;
            }

            // Window scroll lockdown - strictly keep window scroll at (0, 0)
            window.addEventListener('scroll', () => {
                if (window.scrollX !== 0 || window.scrollY !== 0) {
                    window.scrollTo(0, 0);
                }
            }, { passive: false });

            // Deselect object when clicking workspace background outside slide
            this.container?.addEventListener('pointerdown', (e) => {
                if (e.target === this.container || e.target.id === 'canvas-wrapper') {
                    const active = this.canvas?.getActiveObject();
                    if (active) {
                        if (active.isEditing) active.exitEditing();
                        this.canvas.discardActiveObject();
                        this.canvas.requestRenderAll();
                    }
                }
            });

            this.userZoom = 1.0;
            this.panX = 0;
            this.panY = 0;

            window.addEventListener('resize', () => this.resizeToFit());
            this.bindEvents();
            this.initZoomAndPanGestures();
            setTimeout(() => this.resizeToFit(), 60);
        }

        setAspectRatio(ratio) {
            if (ratio === '4:3') {
                this.virtualWidth = 1440;
                this.virtualHeight = 1080;
            } else if (ratio === '9:16') {
                this.virtualWidth = 1080;
                this.virtualHeight = 1920;
            } else {
                this.virtualWidth = 1920;
                this.virtualHeight = 1080;
            }
            this.canvas.setWidth(this.virtualWidth);
            this.canvas.setHeight(this.virtualHeight);
            this.resizeToFit();
        }

        applyTransform() {
            const stageCard = document.getElementById('slide-stage-card');
            if (!stageCard) return;
            const effectiveScale = this.scale * this.userZoom;
            stageCard.style.width = `${this.virtualWidth}px`;
            stageCard.style.height = `${this.virtualHeight}px`;
            stageCard.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${effectiveScale})`;
            stageCard.style.transformOrigin = 'center center';
            this.canvas.calcOffset();

            const badge = document.getElementById('zoom-level-text');
            if (badge) {
                badge.innerText = this.userZoom === 1.0 ? 'Fit' : `${Math.round(this.userZoom * 100)}%`;
            }
        }

        resizeToFit() {
            if (!this.container || !this.canvas) return;
            // Adaptive padding for mobile screens (12px) vs desktop (40px)
            const padding = window.innerWidth <= 768 ? 12 : 40;
            const availW = this.container.clientWidth - padding;
            const availH = this.container.clientHeight - padding;
            if (availW <= 0 || availH <= 0) return;

            const scaleX = availW / this.virtualWidth;
            const scaleY = availH / this.virtualHeight;
            this.scale = Math.min(scaleX, scaleY, 1.0);

            this.applyTransform();
        }

        zoomIn() {
            this.setZoom(Math.min(this.userZoom + 0.25, 3.0));
        }

        zoomOut() {
            this.setZoom(Math.max(this.userZoom - 0.25, 0.5));
        }

        zoomFit() {
            this.userZoom = 1.0;
            this.panX = 0;
            this.panY = 0;
            this.applyTransform();
            document.querySelectorAll('.zoom-pill-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('btn-zoom-fit')?.classList.add('active');
        }

        setZoom(level) {
            this.userZoom = Math.round(level * 100) / 100;
            if (this.userZoom === 1.0) {
                this.panX = 0;
                this.panY = 0;
            }
            this.applyTransform();
            document.getElementById('btn-zoom-fit')?.classList.toggle('active', this.userZoom === 1.0);
        }

        toggleZoom() {
            if (this.userZoom === 1.0) {
                const target = window.innerWidth <= 768 ? 1.75 : 1.5;
                this.setZoom(target);
            } else {
                this.zoomFit();
            }
        }

        initZoomAndPanGestures() {
            if (!this.container) return;

            document.getElementById('btn-zoom-fit')?.addEventListener('click', () => this.zoomFit());
            document.getElementById('btn-zoom-in')?.addEventListener('click', () => this.zoomIn());
            document.getElementById('btn-zoom-out')?.addEventListener('click', () => this.zoomOut());
            document.getElementById('btn-zoom-reset')?.addEventListener('click', () => this.toggleZoom());

            let isPanning = false;
            let startX = 0, startY = 0;
            let initialPinchDist = 0;
            let initialZoom = 1.0;

            this.container.addEventListener('pointerdown', (e) => {
                if (e.target === this.container || e.target.id === 'canvas-wrapper' || (e.button === 1 || e.altKey)) {
                    if (this.userZoom > 1.0 || e.button === 1 || e.altKey) {
                        isPanning = true;
                        startX = e.clientX - this.panX;
                        startY = e.clientY - this.panY;
                        this.container.style.cursor = 'grabbing';
                    }
                }
            });

            window.addEventListener('pointermove', (e) => {
                if (!isPanning) return;
                this.panX = e.clientX - startX;
                this.panY = e.clientY - startY;
                this.applyTransform();
            });

            window.addEventListener('pointerup', () => {
                if (isPanning) {
                    isPanning = false;
                    this.container.style.cursor = 'default';
                }
            });

            this.container.addEventListener('touchstart', (e) => {
                if (e.touches.length === 2) {
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    initialPinchDist = Math.hypot(dx, dy);
                    initialZoom = this.userZoom;
                }
            }, { passive: true });

            this.container.addEventListener('touchmove', (e) => {
                if (e.touches.length === 2 && initialPinchDist > 0) {
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    const currentDist = Math.hypot(dx, dy);
                    const ratio = currentDist / initialPinchDist;
                    const newZoom = Math.min(Math.max(initialZoom * ratio, 0.5), 3.0);
                    this.setZoom(newZoom);
                }
            }, { passive: true });

            this.container.addEventListener('touchend', (e) => {
                if (e.touches.length < 2) {
                    initialPinchDist = 0;
                }
            }, { passive: true });

            let lastTap = 0;
            this.container.addEventListener('touchend', (e) => {
                if (e.changedTouches.length === 1 && !this.canvas?.getActiveObject()) {
                    const now = Date.now();
                    if (now - lastTap < 300) {
                        this.toggleZoom();
                        lastTap = 0;
                        return;
                    }
                    lastTap = now;
                }
            });
        }

        bindEvents() {
            this.canvas.on('object:moving', (e) => this.handleSnapping(e.target));
            this.canvas.on('object:scaling', (e) => {
                const obj = e.target;
                if (!obj) return;
                const maxDim = Math.max(this.virtualWidth, this.virtualHeight) * 2;
                if (obj.getScaledWidth() > maxDim) obj.scaleToWidth(maxDim);
                if (obj.getScaledHeight() > maxDim) obj.scaleToHeight(maxDim);
            });
            this.canvas.on('object:added', () => this.recordHistory());
            this.canvas.on('object:modified', () => this.recordHistory());
            this.canvas.on('object:removed', () => this.recordHistory());
        }

        handleSnapping(obj) {
            if (!obj) return;
            const bound = obj.getBoundingRect();
            const cX = obj.left + bound.width / 2;
            const cY = obj.top + bound.height / 2;

            if (Math.abs(cX - this.virtualWidth / 2) < this.snapThreshold) {
                obj.set('left', this.virtualWidth / 2 - bound.width / 2);
            }
            if (Math.abs(cY - this.virtualHeight / 2) < this.snapThreshold) {
                obj.set('top', this.virtualHeight / 2 - bound.height / 2);
            }
        }

        deleteActiveObjects() {
            const active = this.canvas.getActiveObjects();
            if (!active || active.length === 0) return false;

            const single = this.canvas.getActiveObject();
            if (single && single.isEditing) {
                single.exitEditing();
            }

            this.canvas.discardActiveObject();
            active.forEach(obj => this.canvas.remove(obj));
            this.canvas.requestRenderAll();
            this.recordHistory();

            // Hide floating selection pill immediately
            const pill = document.getElementById('floating-selection-pill');
            if (pill) pill.classList.add('hidden');

            return true;
        }

        cloneActiveObjects() {
            const active = this.canvas.getActiveObject();
            if (!active) return false;

            active.clone((cloned) => {
                this.canvas.discardActiveObject();
                cloned.set({ left: active.left + 30, top: active.top + 30, evented: true });

                if (cloned.type === 'activeSelection') {
                    cloned.canvas = this.canvas;
                    cloned.forEachObject((obj) => this.canvas.add(obj));
                    cloned.setCoords();
                } else {
                    this.canvas.add(cloned);
                }

                this.canvas.setActiveObject(cloned);
                this.canvas.requestRenderAll();
                this.recordHistory();
            });
            return true;
        }

        recordHistory() {
            if (this.isHistoryLocked) return;
            const json = JSON.stringify(this.canvas.toJSON());
            if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === json) {
                return;
            }
            this.undoStack.push(json);
            if (this.undoStack.length > 30) this.undoStack.shift();
            this.redoStack = [];
        }

        undo() {
            if (this.undoStack.length <= 1) return;
            this.isHistoryLocked = true;
            this.redoStack.push(this.undoStack.pop());
            const prev = this.undoStack[this.undoStack.length - 1];
            this.canvas.loadFromJSON(prev, () => {
                this.canvas.requestRenderAll();
                this.isHistoryLocked = false;
            });
        }

        redo() {
            if (this.redoStack.length === 0) return;
            this.isHistoryLocked = true;
            const next = this.redoStack.pop();
            this.undoStack.push(next);
            this.canvas.loadFromJSON(next, () => {
                this.canvas.requestRenderAll();
                this.isHistoryLocked = false;
            });
        }

        loadSlide(slide) {
            this.isHistoryLocked = true;
            this.undoStack = [];
            this.redoStack = [];

            const bg = slide.background || '#ffffff';
            this.canvas.renderOnAddRemove = false;
            this.canvas.setBackgroundColor(bg, () => {});

            if (slide.canvasJSON && slide.canvasJSON.objects && slide.canvasJSON.objects.length > 0) {
                this.canvas.loadFromJSON(slide.canvasJSON, () => {
                    this.canvas.renderOnAddRemove = true;
                    this.canvas.requestRenderAll();
                    this.isHistoryLocked = false;
                    this.recordHistory();
                });
            } else {
                this.canvas.clear();
                this.canvas.setBackgroundColor(bg, () => {
                    this.canvas.renderOnAddRemove = true;
                    this.canvas.requestRenderAll();
                    this.isHistoryLocked = false;
                    this.recordHistory();
                });
            }
        }

        setBackground(c) {
            this.canvas.setBackgroundColor(c, () => {
                this.canvas.requestRenderAll();
                this.recordHistory();
            });
        }

        getJSON() {
            return this.canvas.toJSON();
        }

        getThumbnail(w = 240) {
            try {
                return this.canvas.toDataURL({
                    format: 'jpeg',
                    quality: 0.7,
                    multiplier: w / this.virtualWidth
                });
            } catch (e) {
                return '';
            }
        }
    }

    // --- 4. SLIDE TEMPLATES ---
    const SlideTemplates = [
        {
            id: 'hero-title',
            name: 'Title & Hero Pitch',
            description: 'Bold presentation title with subtitle and category pill',
            create(c) {
                c.clear();
                c.setBackgroundColor('#ffffff', () => {});

                const pillBg = new fabric.Rect({
                    left: 140, top: 260, width: 170, height: 44, rx: 22, ry: 22,
                    fill: '#eff6ff', stroke: '#bfdbfe', strokeWidth: 1.5, selectable: true
                });
                const pillText = new fabric.IText('PRESENTATION', {
                    left: 165, top: 274, fontSize: 14, fontWeight: '700',
                    fill: '#2563eb', fontFamily: 'Inter', selectable: true
                });
                const title = new fabric.IText('The Future of Digital Ideas', {
                    left: 140, top: 340, fontSize: 72, fontWeight: '800',
                    fill: '#0f172a', fontFamily: 'Outfit, Inter, sans-serif', selectable: true
                });
                const subtitle = new fabric.IText('How modern teams create, present, and inspire with world-class clarity.', {
                    left: 140, top: 450, fontSize: 28, fontWeight: '400',
                    fill: '#64748b', fontFamily: 'Inter, sans-serif', selectable: true
                });
                const presenter = new fabric.IText('Presented by Executive Team  •  2026 Edition', {
                    left: 140, top: 780, fontSize: 20, fontWeight: '500',
                    fill: '#94a3b8', fontFamily: 'Inter, sans-serif', selectable: true
                });
                const accentLine = new fabric.Rect({
                    left: 140, top: 530, width: 100, height: 6, rx: 3, ry: 3,
                    fill: '#3b82f6', selectable: true
                });

                c.add(pillBg, pillText, title, subtitle, accentLine, presenter);
                c.renderAll();
            }
        },
        {
            id: 'feature-cards',
            name: '3 Feature Cards',
            description: 'Clean three-column modern benefit cards',
            create(c) {
                c.clear();
                c.setBackgroundColor('#ffffff', () => {});

                const title = new fabric.IText('Key Pillars of Success', {
                    left: 140, top: 140, fontSize: 48, fontWeight: '800',
                    fill: '#0f172a', fontFamily: 'Outfit, Inter, sans-serif', selectable: true
                });
                const subtitle = new fabric.IText('Engineered for lightning speed, unmatched aesthetics, and instant collaboration.', {
                    left: 140, top: 210, fontSize: 22, fill: '#64748b', fontFamily: 'Inter, sans-serif', selectable: true
                });
                c.add(title, subtitle);

                const cardWidth = 490;
                const topY = 320;
                const cards = [
                    { num: '01', title: 'Ultra Fast', desc: 'Instant zero-lag interactions. Create complete slide decks in under 5 minutes.' },
                    { num: '02', title: 'World-Class UI', desc: 'Crafted with Apple-grade precision, clean light aesthetics, and modern typography.' },
                    { num: '03', title: 'Live Presenter', desc: 'Built-in virtual laser pointer, slide transitions, and real-time presenter drawing pen.' }
                ];

                cards.forEach((item, i) => {
                    const x = 140 + i * (cardWidth + 85);
                    const bg = new fabric.Rect({
                        left: x, top: topY, width: cardWidth, height: 520, rx: 16, ry: 16,
                        fill: '#f8fafc', stroke: '#e2e8f0', strokeWidth: 1.5, selectable: true
                    });
                    const badge = new fabric.IText(item.num, {
                        left: x + 40, top: topY + 40, fontSize: 20, fontWeight: '700',
                        fill: '#3b82f6', fontFamily: 'Inter', selectable: true
                    });
                    const cardTitle = new fabric.IText(item.title, {
                        left: x + 40, top: topY + 110, fontSize: 32, fontWeight: '700',
                        fill: '#0f172a', fontFamily: 'Outfit, Inter', selectable: true
                    });
                    const cardDesc = new fabric.Textbox(item.desc, {
                        left: x + 40, top: topY + 180, width: cardWidth - 80, fontSize: 20,
                        lineHeight: 1.4, fill: '#64748b', fontFamily: 'Inter', selectable: true
                    });
                    c.add(bg, badge, cardTitle, cardDesc);
                });
                c.renderAll();
            }
        },
        {
            id: 'big-metric',
            name: 'Big Metric & Impact',
            description: 'Showcase massive KPI stats and growth metrics',
            create(c) {
                c.clear();
                c.setBackgroundColor('#ffffff', () => {});

                const title = new fabric.IText('Measurable Impact & Results', {
                    left: 140, top: 140, fontSize: 48, fontWeight: '800',
                    fill: '#0f172a', fontFamily: 'Outfit, Inter', selectable: true
                });

                const num1 = new fabric.IText('+240%', {
                    left: 140, top: 320, fontSize: 110, fontWeight: '900',
                    fill: '#2563eb', fontFamily: 'Outfit, Inter', selectable: true
                });
                const lbl1 = new fabric.IText('Productivity Increase', {
                    left: 140, top: 470, fontSize: 28, fontWeight: '700',
                    fill: '#0f172a', fontFamily: 'Inter', selectable: true
                });
                const sub1 = new fabric.Textbox('Teams reported saving an average of 4.5 hours per week when designing presentations.', {
                    left: 140, top: 520, width: 600, fontSize: 20, lineHeight: 1.4, fill: '#64748b', fontFamily: 'Inter', selectable: true
                });

                const num2 = new fabric.IText('99.8%', {
                    left: 980, top: 320, fontSize: 110, fontWeight: '900',
                    fill: '#059669', fontFamily: 'Outfit, Inter', selectable: true
                });
                const lbl2 = new fabric.IText('Satisfaction Rate', {
                    left: 980, top: 470, fontSize: 28, fontWeight: '700',
                    fill: '#0f172a', fontFamily: 'Inter', selectable: true
                });
                const sub2 = new fabric.Textbox('Unanimous approval across enterprise executives and creative directors worldwide.', {
                    left: 980, top: 520, width: 600, fontSize: 20, lineHeight: 1.4, fill: '#64748b', fontFamily: 'Inter', selectable: true
                });

                c.add(title, num1, lbl1, sub1, num2, lbl2, sub2);
                c.renderAll();
            }
        }
    ];

    // --- 5. PRESENTER MODE ENGINE ---
    class PresenterMode {
        constructor(state, canvasEngine) {
            this.state = state;
            this.canvasEngine = canvasEngine;

            this.overlay = document.getElementById('presentation-overlay');
            this.slideContainer = document.getElementById('presenter-slide-display');
            this.timerDisplay = document.getElementById('presenter-timer');
            this.counterDisplay = document.getElementById('presenter-slide-counter');
            this.laserDot = document.getElementById('presenter-laser-dot');
            this.penCanvas = document.getElementById('presenter-pen-canvas');

            this.isActive = false;
            this.currentIndex = 0;
            this.isLaserActive = false;
            this.isPenActive = false;
            this.isDrawing = false;
            this.secondsElapsed = 0;
            this.timerInterval = null;

            this.init();
        }

        init() {
            document.getElementById('btn-present-prev')?.addEventListener('click', () => this.prev());
            document.getElementById('btn-present-next')?.addEventListener('click', () => this.next());
            document.getElementById('btn-present-exit')?.addEventListener('click', () => this.exit());
            document.getElementById('btn-toggle-laser')?.addEventListener('click', () => this.toggleLaser());
            document.getElementById('btn-toggle-pen')?.addEventListener('click', () => this.togglePen());
            document.getElementById('btn-clear-pen')?.addEventListener('click', () => this.clearPen());

            window.addEventListener('keydown', (e) => {
                if (!this.isActive) {
                    if (e.key === 'F5') { e.preventDefault(); this.start(); }
                    return;
                }
                if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
                    e.preventDefault(); this.next();
                } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                    e.preventDefault(); this.prev();
                } else if (e.key === 'Escape') {
                    e.preventDefault(); this.exit();
                } else if (e.key.toLowerCase() === 'l') {
                    this.toggleLaser();
                } else if (e.key.toLowerCase() === 'p') {
                    this.togglePen();
                } else if (e.key.toLowerCase() === 'c') {
                    this.clearPen();
                }
            });

            this.overlay?.addEventListener('mousemove', (e) => {
                if (this.isLaserActive && this.laserDot) {
                    this.laserDot.style.left = `${e.clientX}px`;
                    this.laserDot.style.top = `${e.clientY}px`;
                }
            });

            // Touch Swipe Gestures for Mobile & Tablet presentation
            let touchStartX = 0;
            let touchStartY = 0;
            this.overlay?.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                }
            }, { passive: true });

            this.overlay?.addEventListener('touchend', (e) => {
                if (this.isPenActive) return; // allow drawing when pen mode is on
                if (!e.changedTouches || e.changedTouches.length === 0) return;
                const touchEndX = e.changedTouches[0].clientX;
                const touchEndY = e.changedTouches[0].clientY;
                const diffX = touchEndX - touchStartX;
                const diffY = touchEndY - touchStartY;

                // Detect horizontal swipe (min 45px, mostly horizontal)
                if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY)) {
                    if (diffX < 0) {
                        this.next(); // swipe left -> next slide
                    } else {
                        this.prev(); // swipe right -> prev slide
                    }
                }
            }, { passive: true });

            this.setupPen();
        }

        setupPen() {
            if (!this.penCanvas) return;
            const ctx = this.penCanvas.getContext('2d');
            const resize = () => {
                this.penCanvas.width = window.innerWidth;
                this.penCanvas.height = window.innerHeight;
            };
            window.addEventListener('resize', resize);
            resize();

            let lx = 0, ly = 0;
            this.penCanvas.addEventListener('mousedown', (e) => {
                if (!this.isPenActive) return;
                this.isDrawing = true;
                lx = e.clientX; ly = e.clientY;
            });
            this.penCanvas.addEventListener('mousemove', (e) => {
                if (!this.isDrawing || !this.isPenActive) return;
                ctx.beginPath();
                ctx.moveTo(lx, ly);
                ctx.lineTo(e.clientX, e.clientY);
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.stroke();
                lx = e.clientX; ly = e.clientY;
            });
            window.addEventListener('mouseup', () => this.isDrawing = false);

            // Touch drawing support on tablets/mobiles
            this.penCanvas.addEventListener('touchstart', (e) => {
                if (!this.isPenActive || e.touches.length === 0) return;
                this.isDrawing = true;
                lx = e.touches[0].clientX;
                ly = e.touches[0].clientY;
            }, { passive: true });
            this.penCanvas.addEventListener('touchmove', (e) => {
                if (!this.isDrawing || !this.isPenActive || e.touches.length === 0) return;
                const cx = e.touches[0].clientX;
                const cy = e.touches[0].clientY;
                ctx.beginPath();
                ctx.moveTo(lx, ly);
                ctx.lineTo(cx, cy);
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.stroke();
                lx = cx; ly = cy;
            }, { passive: true });
            window.addEventListener('touchend', () => this.isDrawing = false);
        }

        start(fromCurrent = true) {
            if (!this.overlay) return;
            const curJSON = this.canvasEngine.getJSON();
            const curThumb = this.canvasEngine.getThumbnail();
            this.state.updateCurrentSlideCanvas(curJSON, curThumb);

            this.isActive = true;
            this.currentIndex = fromCurrent ? this.state.currentSlideIndex : 0;
            this.overlay.classList.remove('hidden');

            try {
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(() => {});
                }
            } catch (e) {}

            this.secondsElapsed = 0;
            this.updateTimer();
            clearInterval(this.timerInterval);
            this.timerInterval = setInterval(() => {
                this.secondsElapsed++;
                this.updateTimer();
            }, 1000);

            this.clearPen();
            this.renderSlide(this.currentIndex);
        }

        exit() {
            this.isActive = false;
            this.overlay.classList.add('hidden');
            clearInterval(this.timerInterval);

            try {
                if (document.fullscreenElement && document.exitFullscreen) {
                    document.exitFullscreen().catch(() => {});
                }
            } catch (e) {}

            this.setLaser(false);
            this.setPen(false);
            this.clearPen();

            this.state.setCurrentSlideIndex(this.currentIndex);
            const slide = this.state.activeSlide;
            if (slide) this.canvasEngine.loadSlide(slide);
        }

        renderSlide(idx) {
            if (idx < 0 || idx >= this.state.deck.slides.length) return;
            this.currentIndex = idx;
            const slide = this.state.deck.slides[idx];
            if (!slide) return;

            if (this.counterDisplay) {
                this.counterDisplay.innerText = `${idx + 1} / ${this.state.deck.slides.length}`;
            }

            this.slideContainer.innerHTML = '';
            this.clearPen();

            const img = document.createElement('img');
            img.className = `presenter-slide-content transition-${slide.transition || 'fade'}`;

            const tempEl = document.createElement('canvas');
            tempEl.width = 1920; tempEl.height = 1080;
            const tempFabric = new fabric.Canvas(tempEl, {
                width: 1920, height: 1080, backgroundColor: slide.background || '#ffffff'
            });

            if (slide.canvasJSON && slide.canvasJSON.objects && slide.canvasJSON.objects.length > 0) {
                tempFabric.loadFromJSON(slide.canvasJSON, () => {
                    tempFabric.renderAll();
                    img.src = tempFabric.toDataURL({ format: 'png', quality: 1.0 });
                    this.slideContainer.appendChild(img);
                    tempFabric.dispose();
                });
            } else {
                tempFabric.renderAll();
                img.src = tempFabric.toDataURL({ format: 'png', quality: 1.0 });
                this.slideContainer.appendChild(img);
                tempFabric.dispose();
            }
        }

        next() {
            if (this.currentIndex < this.state.deck.slides.length - 1) {
                this.renderSlide(this.currentIndex + 1);
            }
        }

        prev() {
            if (this.currentIndex > 0) {
                this.renderSlide(this.currentIndex - 1);
            }
        }

        toggleLaser() {
            this.setLaser(!this.isLaserActive);
        }

        setLaser(val) {
            this.isLaserActive = val;
            if (val) {
                this.setPen(false);
                this.overlay.classList.add('cursor-none');
                this.laserDot.classList.remove('hidden');
                document.getElementById('btn-toggle-laser')?.classList.add('active');
            } else {
                this.overlay.classList.remove('cursor-none');
                this.laserDot.classList.add('hidden');
                document.getElementById('btn-toggle-laser')?.classList.remove('active');
            }
        }

        togglePen() {
            this.setPen(!this.isPenActive);
        }

        setPen(val) {
            this.isPenActive = val;
            if (val) {
                this.setLaser(false);
                this.penCanvas.style.pointerEvents = 'auto';
                document.getElementById('btn-toggle-pen')?.classList.add('active');
            } else {
                this.penCanvas.style.pointerEvents = 'none';
                document.getElementById('btn-toggle-pen')?.classList.remove('active');
            }
        }

        clearPen() {
            if (this.penCanvas) {
                const ctx = this.penCanvas.getContext('2d');
                ctx.clearRect(0, 0, this.penCanvas.width, this.penCanvas.height);
            }
        }

        updateTimer() {
            if (!this.timerDisplay) return;
            const m = String(Math.floor(this.secondsElapsed / 60)).padStart(2, '0');
            const s = String(this.secondsElapsed % 60).padStart(2, '0');
            this.timerDisplay.innerText = `${m}:${s}`;
        }
    }

    // --- 6. EXPORTER SERVICE (PDF & PNG) ---
    class ExporterService {
        constructor(state, canvasEngine) {
            this.state = state;
            this.canvasEngine = canvasEngine;
        }

        async renderSlideImg(slide) {
            return new Promise((resolve) => {
                const tempEl = document.createElement('canvas');
                tempEl.width = 1920; tempEl.height = 1080;
                const tempFabric = new fabric.Canvas(tempEl, {
                    width: 1920, height: 1080, backgroundColor: slide.background || '#ffffff'
                });

                if (slide.canvasJSON && slide.canvasJSON.objects && slide.canvasJSON.objects.length > 0) {
                    tempFabric.loadFromJSON(slide.canvasJSON, () => {
                        tempFabric.renderAll();
                        const url = tempFabric.toDataURL({ format: 'png', quality: 1.0 });
                        tempFabric.dispose();
                        resolve(url);
                    });
                } else {
                    tempFabric.renderAll();
                    const url = tempFabric.toDataURL({ format: 'png', quality: 1.0 });
                    tempFabric.dispose();
                    resolve(url);
                }
            });
        }

        async exportPDF() {
            const slides = this.state.deck.slides;
            this.toast('Generating Presentation PDF...');

            const curJSON = this.canvasEngine.getJSON();
            const curThumb = this.canvasEngine.getThumbnail();
            this.state.updateCurrentSlideCanvas(curJSON, curThumb);

            try {
                const { jsPDF } = window.jspdf || {};
                if (!jsPDF) {
                    this.exportPNGAll();
                    return;
                }
                const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [1920, 1080] });

                for (let i = 0; i < slides.length; i++) {
                    if (i > 0) doc.addPage([1920, 1080], 'landscape');
                    const imgData = await this.renderSlideImg(slides[i]);
                    doc.addImage(imgData, 'PNG', 0, 0, 1920, 1080, '', 'FAST');
                }

                const cleanTitle = (this.state.deck.title || 'Presentation').replace(/[^a-z0-9_\-]/gi, '_');
                doc.save(`${cleanTitle}.pdf`);
                this.toast('PDF Downloaded Successfully!');
            } catch (err) {
                this.exportPNGAll();
            }
        }

        async exportPNGAll() {
            const slides = this.state.deck.slides;
            this.toast(`Downloading ${slides.length} slide images...`);
            const cleanTitle = (this.state.deck.title || 'Presentation').replace(/[^a-z0-9_\-]/gi, '_');

            for (let i = 0; i < slides.length; i++) {
                const imgData = await this.renderSlideImg(slides[i]);
                const a = document.createElement('a');
                a.download = `${cleanTitle}_Slide_${i + 1}.png`;
                a.href = imgData;
                document.body.appendChild(a);
                a.click();
                a.remove();
                await new Promise(r => setTimeout(r, 200));
            }
            this.toast('All Slides Downloaded!');
        }

        exportJSON() {
            const curJSON = this.canvasEngine.getJSON();
            const curThumb = this.canvasEngine.getThumbnail();
            this.state.updateCurrentSlideCanvas(curJSON, curThumb);

            const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.state.deck, null, 2));
            const cleanTitle = (this.state.deck.title || 'Presentation').replace(/[^a-z0-9_\-]/gi, '_');
            const a = document.createElement('a');
            a.href = dataStr;
            a.download = `${cleanTitle}.pptjson`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            this.toast('Project Backup Saved!');
        }

        importJSON(file) {
            if (!file) return;
            const r = new FileReader();
            r.onload = (e) => {
                try {
                    const deck = JSON.parse(e.target.result);
                    if (deck.slides && Array.isArray(deck.slides)) {
                        this.state.setDeck(deck);
                        const first = this.state.activeSlide;
                        if (first) this.canvasEngine.loadSlide(first);
                        this.toast('Project Loaded!');
                    }
                } catch (err) {
                    alert('Error parsing project file.');
                }
            };
            r.readAsText(file);
        }

        toast(msg) {
            const t = document.getElementById('status-toast');
            if (t) {
                t.innerText = msg;
                t.classList.add('visible');
                setTimeout(() => t.classList.remove('visible'), 2500);
            }
        }
    }

    // --- 7. APPLICATION ORCHESTRATION ---
    class StudioApp {
        constructor() {
            this.canvasEngine = new CanvasEngine('c', 'canvas-wrapper');
            this.presenter = new PresenterMode(state, this.canvasEngine);
            this.exporter = new ExporterService(state, this.canvasEngine);

            this.initTopBar();
            this.initSlideReel();
            this.initRibbon();
            this.initNotes();
            this.initShortcuts();
            this.initAutosave();

            this.loadOrSeed();
        }

        async loadOrSeed() {
            const saved = await StorageService.getAllDecks();
            if (saved && saved.length > 0) {
                state.setDeck(saved[0]);
                const first = state.activeSlide;
                if (first) this.canvasEngine.loadSlide(first);
            } else {
                this.seedSampleDeck();
            }
        }

        seedSampleDeck() {
            state.deck.title = 'Vision Pitch 2026';
            state.deck.aspectRatio = '16:9';
            state.deck.slides = [];

            // Slide 1
            const s1 = state.addSlide({ title: 'Title & Hero Pitch', background: '#ffffff' });
            this.canvasEngine.loadSlide(s1);
            SlideTemplates[0].create(this.canvasEngine.canvas);
            state.updateCurrentSlideCanvas(this.canvasEngine.getJSON(), this.canvasEngine.getThumbnail());

            // Slide 2
            const s2 = state.addSlide({ title: 'Key Features & Pillars', background: '#ffffff' });
            this.canvasEngine.loadSlide(s2);
            SlideTemplates[1].create(this.canvasEngine.canvas);
            state.updateCurrentSlideCanvas(this.canvasEngine.getJSON(), this.canvasEngine.getThumbnail());

            // Slide 3
            const s3 = state.addSlide({ title: 'Growth & Impact Metrics', background: '#ffffff' });
            this.canvasEngine.loadSlide(s3);
            SlideTemplates[2].create(this.canvasEngine.canvas);
            state.updateCurrentSlideCanvas(this.canvasEngine.getJSON(), this.canvasEngine.getThumbnail());

            state.setCurrentSlideIndex(0);
            this.canvasEngine.loadSlide(state.deck.slides[0]);
            StorageService.saveDeck(state.deck);
        }

        initTopBar() {
            const titleInput = document.getElementById('deck-title-input');
            if (titleInput) {
                titleInput.value = state.deck.title;
                titleInput.addEventListener('input', (e) => state.setTitle(e.target.value));
            }

            // Custom Aspect Ratio Dropdown
            const ratioDropdown = document.getElementById('dropdown-ratio');
            const ratioTrigger = ratioDropdown?.querySelector('.dropdown-trigger');
            const ratioPopover = document.getElementById('popover-ratio');
            const ratioVal = document.getElementById('val-ratio');

            if (ratioTrigger && ratioPopover) {
                ratioTrigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = ratioDropdown.classList.contains('open');
                    document.querySelectorAll('.saas-dropdown').forEach(d => {
                        d.classList.remove('open');
                        d.querySelector('.dropdown-popover')?.classList.add('hidden');
                    });
                    if (!isOpen) {
                        ratioDropdown.classList.add('open');
                        ratioPopover.classList.remove('hidden');
                    }
                });
                document.addEventListener('click', (e) => {
                    if (!ratioDropdown.contains(e.target)) {
                        ratioDropdown.classList.remove('open');
                        ratioPopover.classList.add('hidden');
                    }
                });
                ratioPopover.querySelectorAll('.dropdown-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const ratio = item.dataset.value;
                        ratioPopover.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                        item.classList.add('active');
                        if (ratioVal) ratioVal.innerText = item.querySelector('.item-title')?.innerText || ratio;
                        ratioDropdown.classList.remove('open');
                        ratioPopover.classList.add('hidden');
                        state.setAspectRatio(ratio);
                        this.canvasEngine.setAspectRatio(ratio);
                    });
                });
            }

            // Custom Slide Transition Dropdown
            const transDropdown = document.getElementById('dropdown-transition');
            const transTrigger = transDropdown?.querySelector('.dropdown-trigger');
            const transPopover = document.getElementById('popover-transition');
            const transVal = document.getElementById('val-transition');

            if (transTrigger && transPopover) {
                transTrigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = transDropdown.classList.contains('open');
                    document.querySelectorAll('.saas-dropdown').forEach(d => {
                        d.classList.remove('open');
                        d.querySelector('.dropdown-popover')?.classList.add('hidden');
                    });
                    if (!isOpen) {
                        transDropdown.classList.add('open');
                        transPopover.classList.remove('hidden');
                    }
                });
                document.addEventListener('click', (e) => {
                    if (!transDropdown.contains(e.target)) {
                        transDropdown.classList.remove('open');
                        transPopover.classList.add('hidden');
                    }
                });
                transPopover.querySelectorAll('.dropdown-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const trans = item.dataset.value;
                        transPopover.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                        item.classList.add('active');
                        if (transVal) transVal.innerText = item.querySelector('.item-title')?.innerText || trans;
                        transDropdown.classList.remove('open');
                        transPopover.classList.add('hidden');
                        state.updateCurrentSlideTransition(trans);
                    });
                });
            }

            document.getElementById('btn-undo')?.addEventListener('click', () => this.canvasEngine.undo());
            document.getElementById('btn-redo')?.addEventListener('click', () => this.canvasEngine.redo());
            document.getElementById('btn-present')?.addEventListener('click', () => this.presenter.start());

            // Mobile Drawer & Navigation
            const reelSidebar = document.getElementById('slide-reel-sidebar');
            const reelBackdrop = document.getElementById('mobile-reel-backdrop');
            const toggleReel = (open) => {
                if (!reelSidebar) return;
                const shouldOpen = open !== undefined ? open : !reelSidebar.classList.contains('mobile-open');
                reelSidebar.classList.toggle('mobile-open', shouldOpen);
                if (reelBackdrop) reelBackdrop.classList.toggle('hidden', !shouldOpen);
            };

            document.getElementById('btn-toggle-slide-reel')?.addEventListener('click', () => toggleReel());
            document.getElementById('btn-close-reel')?.addEventListener('click', () => toggleReel(false));
            document.getElementById('btn-close-reel-drawer')?.addEventListener('click', () => toggleReel(false));
            reelBackdrop?.addEventListener('click', () => toggleReel(false));

            document.getElementById('btn-mobile-undo')?.addEventListener('click', () => this.canvasEngine.undo());
            document.getElementById('btn-redo-mobile')?.addEventListener('click', () => this.canvasEngine.redo());
            document.getElementById('btn-undo-mobile')?.addEventListener('click', () => this.canvasEngine.undo());
            document.getElementById('btn-mobile-present')?.addEventListener('click', () => {
                toggleReel(false);
                this.presenter.start();
            });

            const btnMobileMore = document.getElementById('btn-mobile-more');
            const mobileDropdown = document.getElementById('popover-mobile-more') || document.getElementById('mobile-more-dropdown');
            if (btnMobileMore && mobileDropdown) {
                btnMobileMore.addEventListener('click', (e) => {
                    e.stopPropagation();
                    mobileDropdown.classList.toggle('hidden');
                });
                document.addEventListener('click', (e) => {
                    if (!mobileDropdown.contains(e.target) && !btnMobileMore.contains(e.target)) {
                        mobileDropdown.classList.add('hidden');
                    }
                });

                // Mobile Aspect Ratios
                document.getElementById('mobile-ratio-16-9')?.addEventListener('click', () => {
                    mobileDropdown.classList.add('hidden');
                    state.setAspectRatio('16:9');
                    this.canvasEngine.setAspectRatio('16:9');
                });
                document.getElementById('mobile-ratio-4-3')?.addEventListener('click', () => {
                    mobileDropdown.classList.add('hidden');
                    state.setAspectRatio('4:3');
                    this.canvasEngine.setAspectRatio('4:3');
                });
                document.getElementById('mobile-ratio-9-16')?.addEventListener('click', () => {
                    mobileDropdown.classList.add('hidden');
                    state.setAspectRatio('9:16');
                    this.canvasEngine.setAspectRatio('9:16');
                });

                // Mobile Transitions
                document.getElementById('mobile-trans-fade')?.addEventListener('click', () => {
                    mobileDropdown.classList.add('hidden');
                    state.updateCurrentSlideTransition('fade');
                });
                document.getElementById('mobile-trans-zoom')?.addEventListener('click', () => {
                    mobileDropdown.classList.add('hidden');
                    state.updateCurrentSlideTransition('zoom');
                });
                document.getElementById('mobile-trans-push')?.addEventListener('click', () => {
                    mobileDropdown.classList.add('hidden');
                    state.updateCurrentSlideTransition('push');
                });

                // Mobile Actions
                document.getElementById('mobile-action-templates')?.addEventListener('click', () => {
                    mobileDropdown.classList.add('hidden');
                    document.getElementById('templates-modal')?.classList.remove('hidden');
                });
                document.getElementById('mobile-action-notes')?.addEventListener('click', () => {
                    mobileDropdown.classList.add('hidden');
                    document.getElementById('btn-toggle-notes')?.click();
                });
                document.getElementById('mobile-action-export-pdf')?.addEventListener('click', () => {
                    mobileDropdown.classList.add('hidden');
                    this.exporter.exportPDF();
                });
                document.getElementById('mobile-action-export-png')?.addEventListener('click', () => {
                    mobileDropdown.classList.add('hidden');
                    this.exporter.exportPNGAll();
                });
            }

            // Sync mobile slide count badge
            const updateMobileSlideCount = () => {
                const count = state && state.deck ? `${state.currentSlideIndex + 1}/${state.deck.slides.length}` : '1/1';
                const badge = document.getElementById('mobile-slide-count-badge');
                if (badge) badge.innerText = count;
                const pill = document.getElementById('mobile-slide-pill-counter');
                if (pill) pill.innerText = count;
            };
            state.subscribe('slide:changed', updateMobileSlideCount);
            state.subscribe('slide:added', updateMobileSlideCount);
            state.subscribe('slide:deleted', updateMobileSlideCount);
            updateMobileSlideCount();

            // Export Menu
            const btnExp = document.getElementById('btn-export-dropdown');
            const expMenu = document.getElementById('export-menu-dropdown');
            if (btnExp && expMenu) {
                btnExp.addEventListener('click', (e) => {
                    e.stopPropagation();
                    document.querySelectorAll('.dropdown-popover').forEach(p => { if (p !== expMenu) p.classList.add('hidden'); });
                    expMenu.classList.toggle('hidden');
                });
                document.addEventListener('click', (e) => {
                    if (!expMenu.contains(e.target) && !btnExp.contains(e.target)) expMenu.classList.add('hidden');
                });
                document.getElementById('export-pdf-action')?.addEventListener('click', () => {
                    expMenu.classList.add('hidden');
                    this.exporter.exportPDF();
                });
                document.getElementById('export-png-all-action')?.addEventListener('click', () => {
                    expMenu.classList.add('hidden');
                    this.exporter.exportPNGAll();
                });
                document.getElementById('export-json-action')?.addEventListener('click', () => {
                    expMenu.classList.add('hidden');
                    this.exporter.exportJSON();
                });
                const fileIn = document.getElementById('import-file-input');
                document.getElementById('import-json-action')?.addEventListener('click', () => {
                    expMenu.classList.add('hidden');
                    fileIn?.click();
                });
                fileIn?.addEventListener('change', (e) => {
                    if (e.target.files.length > 0) this.exporter.importJSON(e.target.files[0]);
                });
            }
        }

        initSlideReel() {
            const list = document.getElementById('slide-thumbnails-list');
            const render = () => {
                if (!list) return;
                list.innerHTML = '';
                const slides = state.deck.slides;

                slides.forEach((slide, idx) => {
                    const card = document.createElement('div');
                    card.className = `slide-thumbnail-card ${idx === state.currentSlideIndex ? 'active' : ''}`;
                    card.dataset.index = idx;

                    const thumbHtml = slide.thumbnail
                        ? `<img src="${slide.thumbnail}" class="thumb-img" alt="Slide ${idx + 1}" />`
                        : `<div class="thumb-placeholder"><span class="material-icons-round">space_dashboard</span></div>`;

                    card.innerHTML = `
                        <div class="thumb-header">
                            <span class="slide-number">${idx + 1}</span>
                            <div class="thumb-actions">
                                <button class="thumb-btn-mini btn-move-up" title="Move Up" ${idx === 0 ? 'disabled' : ''}>
                                    <span class="material-icons-round">keyboard_arrow_up</span>
                                </button>
                                <button class="thumb-btn-mini btn-move-down" title="Move Down" ${idx === slides.length - 1 ? 'disabled' : ''}>
                                    <span class="material-icons-round">keyboard_arrow_down</span>
                                </button>
                                <button class="thumb-btn-mini btn-duplicate" title="Duplicate (Ctrl+D)">
                                    <span class="material-icons-round">content_copy</span>
                                </button>
                                <button class="thumb-btn-mini btn-delete" title="Delete">
                                    <span class="material-icons-round">delete_outline</span>
                                </button>
                            </div>
                        </div>
                        <div class="thumb-preview-box">${thumbHtml}</div>
                    `;

                    card.addEventListener('click', (e) => {
                        if (e.target.closest('.thumb-actions')) return;
                        if (idx !== state.currentSlideIndex) {
                            state.updateCurrentSlideCanvas(this.canvasEngine.getJSON(), this.canvasEngine.getThumbnail());
                            state.setCurrentSlideIndex(idx);
                            const nextSlide = state.activeSlide;
                            if (nextSlide) this.canvasEngine.loadSlide(nextSlide);
                        }
                    });

                    card.querySelector('.btn-duplicate')?.addEventListener('click', (e) => {
                        e.stopPropagation(); state.duplicateSlide(idx);
                    });
                    card.querySelector('.btn-move-up')?.addEventListener('click', (e) => {
                        e.stopPropagation(); state.moveSlide(idx, idx - 1);
                    });
                    card.querySelector('.btn-move-down')?.addEventListener('click', (e) => {
                        e.stopPropagation(); state.moveSlide(idx, idx + 1);
                    });
                    card.querySelector('.btn-delete')?.addEventListener('click', (e) => {
                        e.stopPropagation(); state.deleteSlide(idx);
                    });

                    list.appendChild(card);
                });
            };

            state.on('slide:change', () => {
                const cards = list?.querySelectorAll('.slide-thumbnail-card');
                cards?.forEach((c, i) => {
                    c.classList.toggle('active', i === state.currentSlideIndex);
                });
            });
            state.on('slide:added', render);
            state.on('slide:deleted', render);
            state.on('slide:reordered', render);
            state.on('deck:loaded', render);
            state.on('slide:updated', ({ index, slide }) => {
                const card = list?.querySelector(`.slide-thumbnail-card[data-index="${index}"]`);
                if (card && slide.thumbnail) {
                    const box = card.querySelector('.thumb-preview-box');
                    if (box) box.innerHTML = `<img src="${slide.thumbnail}" class="thumb-img" />`;
                }
            });

            // Templates Modal
            const btnAdd = document.getElementById('btn-add-slide');
            const modal = document.getElementById('templates-modal');
            const grid = document.getElementById('templates-grid');

            if (btnAdd && modal && grid) {
                btnAdd.addEventListener('click', () => modal.classList.remove('hidden'));
                document.getElementById('close-templates-modal')?.addEventListener('click', () => modal.classList.add('hidden'));
                modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

                // Blank Template
                const blankCard = document.createElement('div');
                blankCard.className = 'template-picker-card';
                blankCard.innerHTML = `
                    <div class="template-card-preview blank-preview"><span class="material-icons-round">crop_landscape</span></div>
                    <div class="template-card-info"><h4>Blank Slide</h4><p>Clean white canvas</p></div>
                `;
                blankCard.addEventListener('click', () => {
                    modal.classList.add('hidden');
                    state.updateCurrentSlideCanvas(this.canvasEngine.getJSON(), this.canvasEngine.getThumbnail());
                    const newS = state.addSlide({ title: `Slide ${state.deck.slides.length + 1}` });
                    this.canvasEngine.loadSlide(newS);
                });
                grid.appendChild(blankCard);

                // Pre-designed templates
                SlideTemplates.forEach(t => {
                    const c = document.createElement('div');
                    c.className = 'template-picker-card';
                    c.innerHTML = `
                        <div class="template-card-preview"><span class="material-icons-round">auto_awesome</span></div>
                        <div class="template-card-info"><h4>${t.name}</h4><p>${t.description}</p></div>
                    `;
                    c.addEventListener('click', () => {
                        modal.classList.add('hidden');
                        state.updateCurrentSlideCanvas(this.canvasEngine.getJSON(), this.canvasEngine.getThumbnail());
                        const newS = state.addSlide({ title: t.name });
                        this.canvasEngine.loadSlide(newS);
                        t.create(this.canvasEngine.canvas);
                        setTimeout(() => {
                            state.updateCurrentSlideCanvas(this.canvasEngine.getJSON(), this.canvasEngine.getThumbnail());
                        }, 100);
                    });
                    grid.appendChild(c);
                });
            }
        }

        initRibbon() {
            const c = this.canvasEngine.canvas;

            // Panels
            const panelSlide = document.getElementById('context-panel-slide');
            const panelText = document.getElementById('context-panel-text');
            const panelShape = document.getElementById('context-panel-shape');
            const panelLine = document.getElementById('context-panel-line');
            const panelImage = document.getElementById('context-panel-image');
            const panelMulti = document.getElementById('context-panel-multi');

            const showPanel = (name) => {
                [panelSlide, panelText, panelShape, panelLine, panelImage, panelMulti].forEach(p => p?.classList.add('hidden'));
                if (name === 'text') panelText?.classList.remove('hidden');
                else if (name === 'shape') panelShape?.classList.remove('hidden');
                else if (name === 'line') panelLine?.classList.remove('hidden');
                else if (name === 'image') panelImage?.classList.remove('hidden');
                else if (name === 'multi') panelMulti?.classList.remove('hidden');
                else panelSlide?.classList.remove('hidden');

                const universalActions = document.getElementById('ribbon-universal-actions');
                const hasSelection = name !== 'slide';
                if (universalActions) {
                    universalActions.style.opacity = hasSelection ? '1' : '0.4';
                    universalActions.style.pointerEvents = hasSelection ? 'auto' : 'none';
                }

                const ribbon = document.getElementById('saas-ribbon');
                if (ribbon) ribbon.classList.toggle('has-selection', hasSelection);

                const editTextBtn = document.getElementById('pill-edit-text-btn');
                if (editTextBtn) editTextBtn.style.display = (name === 'text') ? 'inline-flex' : 'none';
            };

            const setTool = (id) => {
                document.querySelectorAll('.ribbon-tool-btn').forEach(b => b.classList.remove('active'));
                document.getElementById(id)?.classList.add('active');
            };

            // 1. Insert Tools
            document.getElementById('tool-select')?.addEventListener('click', () => {
                setTool('tool-select');
                c.isDrawingMode = false;
                c.selection = true;
            });

            document.getElementById('tool-add-heading')?.addEventListener('click', () => {
                setTool('tool-select');
                c.isDrawingMode = false; c.selection = true;
                const t = new fabric.IText('Presentation Heading', {
                    left: (this.canvasEngine.virtualWidth - 650) / 2,
                    top: (this.canvasEngine.virtualHeight - 120) / 2 - 60,
                    fontSize: 64, fontWeight: '800', fill: '#0f172a', fontFamily: 'Outfit, Inter, sans-serif'
                });
                c.add(t); c.setActiveObject(t); c.requestRenderAll();
                this.canvasEngine.recordHistory();
            });

            document.getElementById('tool-add-subheading')?.addEventListener('click', () => {
                setTool('tool-select');
                c.isDrawingMode = false; c.selection = true;
                const t = new fabric.IText('A clear, compelling subtitle goes here', {
                    left: (this.canvasEngine.virtualWidth - 560) / 2,
                    top: (this.canvasEngine.virtualHeight - 60) / 2 + 20,
                    fontSize: 32, fontWeight: '400', fill: '#64748b', fontFamily: 'Inter, sans-serif'
                });
                c.add(t); c.setActiveObject(t); c.requestRenderAll();
                this.canvasEngine.recordHistory();
            });

            document.getElementById('tool-add-body')?.addEventListener('click', () => {
                setTool('tool-select');
                c.isDrawingMode = false; c.selection = true;
                const t = new fabric.Textbox('Add body text explaining your ideas, key points, or findings in concise sentences.', {
                    left: (this.canvasEngine.virtualWidth - 600) / 2,
                    top: (this.canvasEngine.virtualHeight - 100) / 2,
                    width: 600, fontSize: 22, lineHeight: 1.4, fill: '#334155', fontFamily: 'Inter, sans-serif'
                });
                c.add(t); c.setActiveObject(t); c.requestRenderAll();
                this.canvasEngine.recordHistory();
            });

            document.getElementById('tool-add-card')?.addEventListener('click', () => {
                setTool('tool-select');
                c.isDrawingMode = false; c.selection = true;
                const card = new fabric.Rect({
                    left: (this.canvasEngine.virtualWidth - 440) / 2,
                    top: (this.canvasEngine.virtualHeight - 280) / 2,
                    width: 440, height: 280, rx: 16, ry: 16, fill: '#f8fafc', stroke: '#e2e8f0', strokeWidth: 2
                });
                c.add(card); c.setActiveObject(card); c.requestRenderAll();
                this.canvasEngine.recordHistory();
            });

            document.getElementById('tool-add-circle')?.addEventListener('click', () => {
                setTool('tool-select');
                c.isDrawingMode = false; c.selection = true;
                const circ = new fabric.Circle({
                    left: (this.canvasEngine.virtualWidth - 160) / 2,
                    top: (this.canvasEngine.virtualHeight - 160) / 2,
                    radius: 80, fill: '#eff6ff', stroke: '#3b82f6', strokeWidth: 2
                });
                c.add(circ); c.setActiveObject(circ); c.requestRenderAll();
                this.canvasEngine.recordHistory();
            });

            document.getElementById('tool-add-line')?.addEventListener('click', () => {
                setTool('tool-select');
                c.isDrawingMode = false; c.selection = true;
                const line = new fabric.Line([
                    (this.canvasEngine.virtualWidth - 300) / 2, this.canvasEngine.virtualHeight / 2,
                    (this.canvasEngine.virtualWidth + 300) / 2, this.canvasEngine.virtualHeight / 2
                ], { stroke: '#2563eb', strokeWidth: 4, selectable: true });
                c.add(line); c.setActiveObject(line); c.requestRenderAll();
                this.canvasEngine.recordHistory();
            });

            const imgIn = document.getElementById('slide-img-upload-input');
            document.getElementById('tool-upload-image')?.addEventListener('click', () => imgIn?.click());
            imgIn?.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const r = new FileReader();
                r.onload = (f) => {
                    fabric.Image.fromURL(f.target.result, (img) => {
                        const maxW = 900, maxH = 650;
                        if (img.width > maxW || img.height > maxH) {
                            img.scale(Math.min(maxW / img.width, maxH / img.height));
                        }
                        const sw = img.getScaledWidth ? img.getScaledWidth() : img.width;
                        const sh = img.getScaledHeight ? img.getScaledHeight() : img.height;
                        img.set({
                            left: (this.canvasEngine.virtualWidth - sw) / 2,
                            top: (this.canvasEngine.virtualHeight - sh) / 2,
                            cornerStyle: 'circle'
                        });
                        c.add(img); c.setActiveObject(img); c.requestRenderAll();
                        this.canvasEngine.recordHistory();
                    });
                };
                r.readAsDataURL(file);
                imgIn.value = '';
            });

            document.getElementById('tool-draw-pen')?.addEventListener('click', () => {
                setTool('tool-draw-pen');
                c.isDrawingMode = true;
                c.freeDrawingBrush.color = '#2563eb';
                c.freeDrawingBrush.width = 4;
            });

            // 2. Context Swapping
            const updateContext = () => {
                const active = c.getActiveObject();
                if (!active) { showPanel('slide'); return; }

                if (active.type === 'activeSelection') {
                    showPanel('multi');
                    const countSpan = document.getElementById('multi-selection-count');
                    if (countSpan && active._objects) countSpan.innerText = `${active._objects.length} Elements Selected`;
                    return;
                }

                if (active.type === 'i-text' || active.type === 'textbox') {
                    showPanel('text');
                    const fontVal = document.getElementById('val-font');
                    if (fontVal && active.fontFamily) {
                        fontVal.innerText = active.fontFamily.split(',')[0].replace(/['"]/g, '');
                        fontVal.style.fontFamily = active.fontFamily;
                    }
                    const sizeIn = document.getElementById('text-font-size-input');
                    if (sizeIn && active.fontSize) sizeIn.value = Math.round(active.fontSize);

                    const isBold = active.fontWeight === 'bold' || active.fontWeight === '700' || active.fontWeight === '800';
                    document.getElementById('btn-text-bold')?.classList.toggle('active', isBold);
                    const isItalic = active.fontStyle === 'italic';
                    document.getElementById('btn-text-italic')?.classList.toggle('active', isItalic);

                    const align = active.textAlign || 'left';
                    ['left', 'center', 'right'].forEach(a => {
                        document.getElementById(`btn-align-${a}`)?.classList.toggle('active', a === align);
                    });

                    const colIn = document.getElementById('text-color-input');
                    const colSwatch = document.getElementById('text-color-swatch');
                    if (colIn && typeof active.fill === 'string') {
                        const col = active.fill.startsWith('#') ? active.fill : '#0f172a';
                        colIn.value = col;
                        if (colSwatch) colSwatch.style.backgroundColor = col;
                    }
                } else if (active.type === 'rect' || active.type === 'circle') {
                    showPanel('shape');
                    const fillIn = document.getElementById('shape-fill-input');
                    const fillSwatch = document.getElementById('shape-fill-swatch');
                    if (fillIn && typeof active.fill === 'string') {
                        const col = active.fill.startsWith('#') ? active.fill : '#f8fafc';
                        fillIn.value = col;
                        if (fillSwatch) fillSwatch.style.backgroundColor = col;
                    }
                    const strokeIn = document.getElementById('shape-stroke-input');
                    const strokeSwatch = document.getElementById('shape-stroke-swatch');
                    if (strokeIn && typeof active.stroke === 'string') {
                        const col = active.stroke.startsWith('#') ? active.stroke : '#e2e8f0';
                        strokeIn.value = col;
                        if (strokeSwatch) strokeSwatch.style.backgroundColor = col;
                    }
                    const sw = active.strokeWidth || 0;
                    [0, 2, 4].forEach(w => document.getElementById(`btn-border-${w}`)?.classList.toggle('active', w === sw));
                } else if (active.type === 'line') {
                    showPanel('line');
                    const lineIn = document.getElementById('line-color-input');
                    const lineSwatch = document.getElementById('line-color-swatch');
                    if (lineIn && typeof active.stroke === 'string') {
                        const col = active.stroke.startsWith('#') ? active.stroke : '#2563eb';
                        lineIn.value = col;
                        if (lineSwatch) lineSwatch.style.backgroundColor = col;
                    }
                } else if (active.type === 'image') {
                    showPanel('image');
                } else {
                    showPanel('shape');
                }
            };

            c.on('selection:created', updateContext);
            c.on('selection:updated', updateContext);
            c.on('selection:cleared', () => showPanel('slide'));
            state.on('slide:change', () => showPanel('slide'));

            // Text Events
            const fontDropdown = document.getElementById('dropdown-font');
            const fontTrigger = fontDropdown?.querySelector('.dropdown-trigger');
            const fontPopover = fontDropdown?.querySelector('.dropdown-popover');
            const fontVal = document.getElementById('val-font');
            if (fontTrigger && fontPopover) {
                fontTrigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = fontDropdown.classList.contains('open');
                    document.querySelectorAll('.saas-dropdown').forEach(d => {
                        d.classList.remove('open');
                        d.querySelector('.dropdown-popover')?.classList.add('hidden');
                    });
                    if (!isOpen) {
                        fontDropdown.classList.add('open');
                        fontPopover.classList.remove('hidden');
                    }
                });
                document.addEventListener('click', (e) => {
                    if (!fontDropdown.contains(e.target)) {
                        fontDropdown.classList.remove('open');
                        fontPopover.classList.add('hidden');
                    }
                });
                fontPopover.querySelectorAll('.dropdown-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const font = item.dataset.font;
                        fontPopover.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                        item.classList.add('active');
                        if (fontVal) { fontVal.innerText = font; fontVal.style.fontFamily = font; }
                        fontDropdown.classList.remove('open');
                        fontPopover.classList.add('hidden');
                        const o = c.getActiveObject();
                        if (o && (o.type === 'i-text' || o.type === 'textbox')) {
                            o.set('fontFamily', font);
                            c.requestRenderAll();
                            this.canvasEngine.recordHistory();
                        }
                    });
                });
            }

            const sizeIn = document.getElementById('text-font-size-input');
            const updateSize = (delta) => {
                const o = c.getActiveObject();
                if (!o || !(o.type === 'i-text' || o.type === 'textbox')) return;
                let cur = parseInt(o.fontSize || 32, 10);
                cur = Math.max(12, Math.min(180, cur + delta));
                o.set('fontSize', cur);
                if (sizeIn) sizeIn.value = cur;
                c.requestRenderAll();
                this.canvasEngine.recordHistory();
            };
            document.getElementById('btn-font-size-dec')?.addEventListener('click', () => updateSize(-4));
            document.getElementById('btn-font-size-inc')?.addEventListener('click', () => updateSize(4));
            sizeIn?.addEventListener('change', (e) => {
                const val = parseInt(e.target.value, 10);
                if (isNaN(val) || val < 10) return;
                const o = c.getActiveObject();
                if (o && (o.type === 'i-text' || o.type === 'textbox')) {
                    o.set('fontSize', val); c.requestRenderAll(); this.canvasEngine.recordHistory();
                }
            });

            document.getElementById('btn-text-bold')?.addEventListener('click', () => {
                const o = c.getActiveObject();
                if (!o || !(o.type === 'i-text' || o.type === 'textbox')) return;
                const isB = o.fontWeight === 'bold' || o.fontWeight === '700' || o.fontWeight === '800';
                o.set('fontWeight', isB ? 'normal' : '700');
                document.getElementById('btn-text-bold')?.classList.toggle('active', !isB);
                c.requestRenderAll(); this.canvasEngine.recordHistory();
            });

            document.getElementById('btn-text-italic')?.addEventListener('click', () => {
                const o = c.getActiveObject();
                if (!o || !(o.type === 'i-text' || o.type === 'textbox')) return;
                const isI = o.fontStyle === 'italic';
                o.set('fontStyle', isI ? 'normal' : 'italic');
                document.getElementById('btn-text-italic')?.classList.toggle('active', !isI);
                c.requestRenderAll(); this.canvasEngine.recordHistory();
            });

            ['left', 'center', 'right'].forEach(a => {
                document.getElementById(`btn-align-${a}`)?.addEventListener('click', () => {
                    const o = c.getActiveObject();
                    if (!o || !(o.type === 'i-text' || o.type === 'textbox')) return;
                    o.set('textAlign', a);
                    ['left', 'center', 'right'].forEach(x => document.getElementById(`btn-align-${x}`)?.classList.remove('active'));
                    document.getElementById(`btn-align-${a}`)?.classList.add('active');
                    c.requestRenderAll(); this.canvasEngine.recordHistory();
                });
            });

            const textColIn = document.getElementById('text-color-input');
            const textColSwatch = document.getElementById('text-color-swatch');
            textColIn?.addEventListener('input', (e) => {
                const col = e.target.value;
                if (textColSwatch) textColSwatch.style.backgroundColor = col;
                const o = c.getActiveObject();
                if (o && (o.type === 'i-text' || o.type === 'textbox')) {
                    o.set('fill', col); c.requestRenderAll();
                }
            });
            textColIn?.addEventListener('change', () => this.canvasEngine.recordHistory());

            document.getElementById('btn-text-bring-forward')?.addEventListener('click', () => { c.getActiveObject()?.bringForward(); c.requestRenderAll(); this.canvasEngine.recordHistory(); });
            document.getElementById('btn-text-send-back')?.addEventListener('click', () => { c.getActiveObject()?.sendBackwards(); c.requestRenderAll(); this.canvasEngine.recordHistory(); });
            document.getElementById('btn-text-clone')?.addEventListener('click', () => this.canvasEngine.cloneActiveObjects());
            document.getElementById('btn-text-delete')?.addEventListener('click', () => this.canvasEngine.deleteActiveObjects());

            // Shape Events
            const shapeFillIn = document.getElementById('shape-fill-input');
            const shapeFillSwatch = document.getElementById('shape-fill-swatch');
            shapeFillIn?.addEventListener('input', (e) => {
                const col = e.target.value;
                if (shapeFillSwatch) shapeFillSwatch.style.backgroundColor = col;
                const o = c.getActiveObject();
                if (o) { o.set('fill', col); c.requestRenderAll(); }
            });
            shapeFillIn?.addEventListener('change', () => this.canvasEngine.recordHistory());

            const shapeStrokeIn = document.getElementById('shape-stroke-input');
            const shapeStrokeSwatch = document.getElementById('shape-stroke-swatch');
            shapeStrokeIn?.addEventListener('input', (e) => {
                const col = e.target.value;
                if (shapeStrokeSwatch) shapeStrokeSwatch.style.backgroundColor = col;
                const o = c.getActiveObject();
                if (o) { o.set('stroke', col); c.requestRenderAll(); }
            });
            shapeStrokeIn?.addEventListener('change', () => this.canvasEngine.recordHistory());

            [0, 2, 4].forEach(w => {
                document.getElementById(`btn-border-${w}`)?.addEventListener('click', () => {
                    const o = c.getActiveObject();
                    if (!o) return;
                    o.set('strokeWidth', w);
                    [0, 2, 4].forEach(x => document.getElementById(`btn-border-${x}`)?.classList.remove('active'));
                    document.getElementById(`btn-border-${w}`)?.classList.add('active');
                    c.requestRenderAll(); this.canvasEngine.recordHistory();
                });
            });

            document.getElementById('btn-shape-bring-forward')?.addEventListener('click', () => { c.getActiveObject()?.bringForward(); c.requestRenderAll(); this.canvasEngine.recordHistory(); });
            document.getElementById('btn-shape-send-back')?.addEventListener('click', () => { c.getActiveObject()?.sendBackwards(); c.requestRenderAll(); this.canvasEngine.recordHistory(); });
            document.getElementById('btn-shape-clone')?.addEventListener('click', () => this.canvasEngine.cloneActiveObjects());
            document.getElementById('btn-shape-delete')?.addEventListener('click', () => this.canvasEngine.deleteActiveObjects());

            // Line & Image Events
            document.getElementById('btn-line-clone')?.addEventListener('click', () => this.canvasEngine.cloneActiveObjects());
            document.getElementById('btn-line-delete')?.addEventListener('click', () => this.canvasEngine.deleteActiveObjects());
            document.getElementById('btn-image-clone')?.addEventListener('click', () => this.canvasEngine.cloneActiveObjects());
            document.getElementById('btn-image-delete')?.addEventListener('click', () => this.canvasEngine.deleteActiveObjects());

            // Slide Background Palette
            [
                { id: 'bg-white', color: '#ffffff' },
                { id: 'bg-slate', color: '#f8fafc' },
                { id: 'bg-warm', color: '#fefce8' },
                { id: 'bg-dark', color: '#0f172a' },
                { id: 'bg-blue', color: '#eff6ff' }
            ].forEach(p => {
                document.getElementById(p.id)?.addEventListener('click', () => {
                    this.canvasEngine.setBackground(p.color);
                    state.updateCurrentSlideBackground(p.color);
                    const bgPick = document.getElementById('slide-bg-custom-picker');
                    if (bgPick) bgPick.value = p.color;
                });
            });

            document.getElementById('slide-bg-custom-picker')?.addEventListener('input', (e) => {
                this.canvasEngine.setBackground(e.target.value);
                state.updateCurrentSlideBackground(e.target.value);
            });

            document.getElementById('btn-ribbon-templates')?.addEventListener('click', () => {
                document.getElementById('templates-modal')?.classList.remove('hidden');
            });

            // Multi Selection
            document.getElementById('btn-multi-group')?.addEventListener('click', () => {
                const a = c.getActiveObject();
                if (!a) return;
                if (a.type === 'activeSelection') {
                    a.toGroup(); c.requestRenderAll(); this.canvasEngine.recordHistory(); showPanel('shape');
                } else if (a.type === 'group') {
                    a.toActiveSelection(); c.requestRenderAll(); this.canvasEngine.recordHistory(); showPanel('multi');
                }
            });
            document.getElementById('btn-multi-clone')?.addEventListener('click', () => this.canvasEngine.cloneActiveObjects());
            document.getElementById('btn-multi-delete')?.addEventListener('click', () => this.canvasEngine.deleteActiveObjects());

            // Universal Right Actions Bar
            document.getElementById('btn-universal-delete')?.addEventListener('click', () => this.canvasEngine.deleteActiveObjects());
            document.getElementById('btn-universal-clone')?.addEventListener('click', () => this.canvasEngine.cloneActiveObjects());
            document.getElementById('btn-universal-layer-up')?.addEventListener('click', () => {
                const a = c.getActiveObject();
                if (a) { a.bringForward(); c.requestRenderAll(); this.canvasEngine.recordHistory(); }
            });
            document.getElementById('btn-universal-layer-down')?.addEventListener('click', () => {
                const a = c.getActiveObject();
                if (a) { a.sendBackwards(); c.requestRenderAll(); this.canvasEngine.recordHistory(); }
            });

            // Mobile Done button
            document.getElementById('btn-mobile-done-edit')?.addEventListener('click', () => {
                c.discardActiveObject();
                c.requestRenderAll();
                showPanel('slide');
            });

            // Mobile Background & Templates buttons
            document.getElementById('tool-mobile-bg')?.addEventListener('click', () => {
                document.getElementById('mobile-bg-modal')?.classList.remove('hidden');
            });
            document.getElementById('tool-mobile-templates')?.addEventListener('click', () => {
                document.getElementById('templates-modal')?.classList.remove('hidden');
            });
            document.getElementById('btn-close-bg-modal')?.addEventListener('click', () => {
                document.getElementById('mobile-bg-modal')?.classList.add('hidden');
            });
            document.querySelectorAll('.mobile-color-card').forEach(card => {
                card.addEventListener('click', () => {
                    const color = card.dataset.color;
                    if (color) {
                        this.canvasEngine.setBackground(color);
                        state.updateCurrentSlideBackground(color);
                        document.getElementById('mobile-bg-modal')?.classList.add('hidden');
                    }
                });
            });
            document.getElementById('mobile-bg-custom-picker')?.addEventListener('input', (e) => {
                const color = e.target.value;
                this.canvasEngine.setBackground(color);
                state.updateCurrentSlideBackground(color);
            });

            // Mobile Quick-Edit Text Modal
            const openTextModal = () => {
                const active = c.getActiveObject();
                if (!active || (active.type !== 'i-text' && active.type !== 'textbox')) return;
                const modal = document.getElementById('mobile-text-modal');
                const input = document.getElementById('mobile-text-editor-input');
                if (modal && input) {
                    input.value = active.text || '';
                    modal.classList.remove('hidden');
                    setTimeout(() => input.focus(), 50);
                }
            };

            document.getElementById('pill-edit-text-btn')?.addEventListener('click', openTextModal);

            c.on('mouse:dblclick', (e) => {
                if (window.innerWidth <= 768 && e.target && (e.target.type === 'i-text' || e.target.type === 'textbox')) {
                    openTextModal();
                }
            });

            document.getElementById('btn-mobile-text-save')?.addEventListener('click', () => {
                const active = c.getActiveObject();
                const input = document.getElementById('mobile-text-editor-input');
                if (active && (active.type === 'i-text' || active.type === 'textbox') && input) {
                    active.set('text', input.value);
                    c.requestRenderAll();
                    this.canvasEngine.recordHistory();
                }
                document.getElementById('mobile-text-modal')?.classList.add('hidden');
            });

            document.getElementById('btn-mobile-text-cancel')?.addEventListener('click', () => {
                document.getElementById('mobile-text-modal')?.classList.add('hidden');
            });

            // Floating Selection Pill on Canvas
            document.getElementById('pill-delete-btn')?.addEventListener('click', () => this.canvasEngine.deleteActiveObjects());
            document.getElementById('pill-clone-btn')?.addEventListener('click', () => this.canvasEngine.cloneActiveObjects());
            document.getElementById('pill-forward-btn')?.addEventListener('click', () => {
                const a = c.getActiveObject();
                if (a) { a.bringForward(); c.requestRenderAll(); this.canvasEngine.recordHistory(); }
            });
            document.getElementById('pill-backward-btn')?.addEventListener('click', () => {
                const a = c.getActiveObject();
                if (a) { a.sendBackwards(); c.requestRenderAll(); this.canvasEngine.recordHistory(); }
            });

            const updateFloatingPill = () => {
                const pill = document.getElementById('floating-selection-pill');
                if (!pill) return;
                const active = c.getActiveObject();
                if (!active) {
                    pill.classList.add('hidden');
                    return;
                }
                const stageCard = document.getElementById('slide-stage-card');
                const wrapper = document.getElementById('canvas-wrapper');
                if (!stageCard || !wrapper) return;

                const bound = active.getBoundingRect(true);
                const scale = (this.canvasEngine.scale || 1) * (this.canvasEngine.userZoom || 1);
                const stageRect = stageCard.getBoundingClientRect();
                const wrapperRect = wrapper.getBoundingClientRect();

                const left = (stageRect.left - wrapperRect.left) + (bound.left + bound.width / 2) * scale;
                const top = (stageRect.top - wrapperRect.top) + bound.top * scale;

                pill.style.left = `${left}px`;
                pill.style.top = `${top}px`;
                pill.classList.remove('hidden');
            };

            c.on('selection:created', updateFloatingPill);
            c.on('selection:updated', updateFloatingPill);
            c.on('selection:cleared', () => document.getElementById('floating-selection-pill')?.classList.add('hidden'));
            c.on('object:moving', updateFloatingPill);
            c.on('object:scaling', updateFloatingPill);
            c.on('object:rotating', updateFloatingPill);
            window.addEventListener('resize', updateFloatingPill);
        }

        initNotes() {
            const toggle = document.getElementById('btn-toggle-notes');
            const drawer = document.getElementById('speaker-notes-drawer');
            const textarea = document.getElementById('speaker-notes-input');
            const closeBtn = document.getElementById('btn-close-notes');

            const setVisible = (show) => {
                const isVis = show !== undefined ? show : drawer.classList.contains('hidden');
                drawer.classList.toggle('hidden', !isVis);
                toggle?.classList.toggle('active', isVis);
                if (isVis && state.activeSlide && textarea) {
                    textarea.value = state.activeSlide.notes || '';
                    textarea.focus();
                }
                setTimeout(() => this.canvasEngine.resizeToFit(), 150);
            };

            toggle?.addEventListener('click', () => setVisible());
            closeBtn?.addEventListener('click', () => setVisible(false));
            textarea?.addEventListener('input', (e) => state.updateCurrentSlideNotes(e.target.value));
            state.on('slide:change', ({ slide }) => { if (textarea && slide) textarea.value = slide.notes || ''; });
        }

        initShortcuts() {
            window.addEventListener('keydown', (e) => {
                if (this.presenter.isActive) return;

                const el = document.activeElement;
                const tag = el ? el.tagName.toLowerCase() : '';
                const isFabricHidden = el?.classList?.contains('fabric-canvas-hidden-textarea') || el?.hasAttribute?.('data-fabric-hiddentextarea');

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

        initAutosave() {
            let timer = null;
            const trigger = () => {
                if (timer) clearTimeout(timer);
                timer = setTimeout(async () => {
                    if (state.isDirty) {
                        const json = this.canvasEngine.getJSON();
                        const thumb = this.canvasEngine.getThumbnail();
                        state.updateCurrentSlideCanvas(json, thumb);
                        await StorageService.saveDeck(state.deck);
                        state.isDirty = false;

                        const t = document.getElementById('status-toast');
                        if (t) {
                            t.innerText = 'Saved';
                            t.classList.add('visible');
                            setTimeout(() => t.classList.remove('visible'), 1200);
                        }
                    }
                }, 1000);
            };

            state.on('state:modified', trigger);
            this.canvasEngine.canvas.on('object:modified', trigger);
            this.canvasEngine.canvas.on('object:added', trigger);
            this.canvasEngine.canvas.on('object:removed', trigger);
        }
    }

    // Launch safely regardless of whether DOMContentLoaded already fired
    function bootstrap() {
        if (window.__VISION_STUDIO_STARTED__) return;
        window.__VISION_STUDIO_STARTED__ = true;
        try {
            window.app = new StudioApp();
        } catch (err) {
            console.error('Fatal error initializing presentation studio:', err);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }
})();