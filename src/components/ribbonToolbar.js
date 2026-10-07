/**
 * RibbonToolbar Component
 * World-Class SaaS Ribbon & Contextual Inspector.
 * Sits securely below the top header, eliminating all floating clutter,
 * preventing any collision with speaker notes, and providing 100% predictable,
 * intelligent editing controls based on exactly what is selected.
 */

export class RibbonToolbar {
    constructor(canvasEngine, state) {
        this.canvasEngine = canvasEngine;
        this.state = state;
        this.canvas = canvasEngine.canvas;

        // Context panels
        this.panelSlide = document.getElementById('context-panel-slide');
        this.panelText = document.getElementById('context-panel-text');
        this.panelShape = document.getElementById('context-panel-shape');
        this.panelLine = document.getElementById('context-panel-line');
        this.panelImage = document.getElementById('context-panel-image');
        this.panelMulti = document.getElementById('context-panel-multi');

        this.init();
    }

    init() {
        this.bindInsertTools();
        this.bindUniversalActions();
        this.bindContextualEvents();
        this.bindTextControls();
        this.bindShapeControls();
        this.bindLineControls();
        this.bindImageControls();
        this.bindSlideControls();
        this.bindMultiControls();

        // Default to slide settings
        this.showPanel('slide');
    }

    // --- 1. INSERT TOOLS (Always accessible on ribbon left) ---
    bindInsertTools() {
        const c = this.canvas;
        const setTool = (id) => {
            document.querySelectorAll('.ribbon-tool-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(id)?.classList.add('active');
        };

        // Select Tool
        this.bind('tool-select', () => {
            setTool('tool-select');
            c.isDrawingMode = false;
            c.selection = true;
            c.defaultCursor = 'default';
        });

        // Add Heading
        this.bind('tool-add-heading', () => {
            setTool('tool-select');
            c.isDrawingMode = false;
            c.selection = true;
            const text = new fabric.IText('Presentation Heading', {
                left: (this.canvasEngine.virtualWidth - 650) / 2,
                top: (this.canvasEngine.virtualHeight - 120) / 2 - 60,
                fontSize: 64,
                fontWeight: '800',
                fill: '#0f172a',
                fontFamily: 'Outfit, Inter, sans-serif'
            });
            c.add(text);
            c.setActiveObject(text);
            c.requestRenderAll();
            this.canvasEngine.recordHistory();
        });

        // Add Subtitle
        this.bind('tool-add-subheading', () => {
            setTool('tool-select');
            c.isDrawingMode = false;
            c.selection = true;
            const text = new fabric.IText('A clear, compelling subtitle goes here', {
                left: (this.canvasEngine.virtualWidth - 560) / 2,
                top: (this.canvasEngine.virtualHeight - 60) / 2 + 20,
                fontSize: 32,
                fontWeight: '400',
                fill: '#64748b',
                fontFamily: 'Inter, sans-serif'
            });
            c.add(text);
            c.setActiveObject(text);
            c.requestRenderAll();
            this.canvasEngine.recordHistory();
        });

        // Add Body Text
        this.bind('tool-add-body', () => {
            setTool('tool-select');
            c.isDrawingMode = false;
            c.selection = true;
            const text = new fabric.Textbox('Add body text explaining your ideas, key points, or findings in concise sentences.', {
                left: (this.canvasEngine.virtualWidth - 600) / 2,
                top: (this.canvasEngine.virtualHeight - 100) / 2,
                width: 600,
                fontSize: 22,
                lineHeight: 1.4,
                fill: '#334155',
                fontFamily: 'Inter, sans-serif'
            });
            c.add(text);
            c.setActiveObject(text);
            c.requestRenderAll();
            this.canvasEngine.recordHistory();
        });

        // Add Presentation Card
        this.bind('tool-add-card', () => {
            setTool('tool-select');
            c.isDrawingMode = false;
            c.selection = true;
            const card = new fabric.Rect({
                left: (this.canvasEngine.virtualWidth - 440) / 2,
                top: (this.canvasEngine.virtualHeight - 280) / 2,
                width: 440,
                height: 280,
                rx: 16,
                ry: 16,
                fill: '#f8fafc',
                stroke: '#e2e8f0',
                strokeWidth: 2
            });
            c.add(card);
            c.setActiveObject(card);
            c.requestRenderAll();
            this.canvasEngine.recordHistory();
        });

        // Add Circle / Badge
        this.bind('tool-add-circle', () => {
            setTool('tool-select');
            c.isDrawingMode = false;
            c.selection = true;
            const circle = new fabric.Circle({
                left: (this.canvasEngine.virtualWidth - 160) / 2,
                top: (this.canvasEngine.virtualHeight - 160) / 2,
                radius: 80,
                fill: '#eff6ff',
                stroke: '#3b82f6',
                strokeWidth: 2
            });
            c.add(circle);
            c.setActiveObject(circle);
            c.requestRenderAll();
            this.canvasEngine.recordHistory();
        });

        // Add Arrow / Connector
        this.bind('tool-add-line', () => {
            setTool('tool-select');
            c.isDrawingMode = false;
            c.selection = true;
            const line = new fabric.Line([
                (this.canvasEngine.virtualWidth - 300) / 2,
                this.canvasEngine.virtualHeight / 2,
                (this.canvasEngine.virtualWidth + 300) / 2,
                this.canvasEngine.virtualHeight / 2
            ], {
                stroke: '#2563eb',
                strokeWidth: 4,
                selectable: true
            });
            c.add(line);
            c.setActiveObject(line);
            c.requestRenderAll();
            this.canvasEngine.recordHistory();
        });

        // Add Image
        const imgInput = document.getElementById('slide-img-upload-input');
        this.bind('tool-upload-image', () => imgInput?.click());
        if (imgInput) {
            imgInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (f) => {
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
                        c.add(img);
                        c.setActiveObject(img);
                        c.requestRenderAll();
                        this.canvasEngine.recordHistory();
                    });
                };
                reader.readAsDataURL(file);
                imgInput.value = '';
            });
        }

        // Draw Pen
        this.bind('tool-draw-pen', () => {
            setTool('tool-draw-pen');
            c.isDrawingMode = true;
            c.freeDrawingBrush.color = '#2563eb';
            c.freeDrawingBrush.width = 4;
        });
    }

    // --- 2. CONTEXTUAL SELECTION LOGIC ---
    bindContextualEvents() {
        const updateContext = () => {
            const active = this.canvas.getActiveObject();
            if (!active) {
                this.showPanel('slide');
                return;
            }

            // Check if multiple objects selected
            if (active.type === 'activeSelection') {
                this.showPanel('multi');
                this.syncMultiControls(active);
                return;
            }

            // Check specific object type
            if (active.type === 'i-text' || active.type === 'textbox') {
                this.showPanel('text');
                this.syncTextControls(active);
            } else if (active.type === 'rect' || active.type === 'circle') {
                this.showPanel('shape');
                this.syncShapeControls(active);
            } else if (active.type === 'line') {
                this.showPanel('line');
                this.syncLineControls(active);
            } else if (active.type === 'image') {
                this.showPanel('image');
                this.syncImageControls(active);
            } else {
                this.showPanel('shape');
                this.syncShapeControls(active);
            }
        };

        this.canvas.on('selection:created', updateContext);
        this.canvas.on('selection:updated', updateContext);
        this.canvas.on('selection:cleared', () => this.showPanel('slide'));

        // Slide change switches back to slide panel
        this.state.on('slide:change', () => this.showPanel('slide'));
    }

    showPanel(type) {
        const panels = [
            this.panelSlide, this.panelText, this.panelShape,
            this.panelLine, this.panelImage, this.panelMulti
        ];
        panels.forEach(p => p?.classList.add('hidden'));

        if (type === 'text') this.panelText?.classList.remove('hidden');
        else if (type === 'shape') this.panelShape?.classList.remove('hidden');
        else if (type === 'line') this.panelLine?.classList.remove('hidden');
        else if (type === 'image') this.panelImage?.classList.remove('hidden');
        else if (type === 'multi') this.panelMulti?.classList.remove('hidden');
        else this.panelSlide?.classList.remove('hidden');

        // Control Universal Actions Bar prominence and mobile ribbon mode
        const universalActions = document.getElementById('ribbon-universal-actions');
        const hasSelection = type !== 'slide';
        if (universalActions) {
            universalActions.style.opacity = hasSelection ? '1' : '0.4';
            universalActions.style.pointerEvents = hasSelection ? 'auto' : 'none';
        }

        // Toggle mobile single-panel state
        const ribbon = document.getElementById('saas-ribbon');
        if (ribbon) {
            ribbon.classList.toggle('has-selection', hasSelection);
        }

        // Toggle edit button on floating pill
        const editTextBtn = document.getElementById('pill-edit-text-btn');
        if (editTextBtn) {
            editTextBtn.style.display = (type === 'text') ? 'inline-flex' : 'none';
        }
    }

    // --- 2.5 UNIVERSAL ACTIONS & FLOATING ON-CANVAS PILL ---
    bindUniversalActions() {
        const c = this.canvas;
        this.bind('btn-universal-delete', () => this.canvasEngine.deleteActiveObjects());
        this.bind('btn-universal-clone', () => this.canvasEngine.cloneActiveObjects());
        this.bind('btn-universal-layer-up', () => {
            const obj = c.getActiveObject();
            if (obj) { obj.bringForward(); c.requestRenderAll(); this.canvasEngine.recordHistory(); }
        });
        this.bind('btn-universal-layer-down', () => {
            const obj = c.getActiveObject();
            if (obj) { obj.sendBackwards(); c.requestRenderAll(); this.canvasEngine.recordHistory(); }
        });

        // Mobile Done / Deselect button
        this.bind('btn-mobile-done-edit', () => {
            c.discardActiveObject();
            c.requestRenderAll();
            this.showPanel('slide');
        });

        // Mobile Quick Insert Background & Templates
        this.bind('tool-mobile-bg', () => {
            document.getElementById('mobile-bg-modal')?.classList.remove('hidden');
        });
        this.bind('tool-mobile-templates', () => {
            document.getElementById('templates-modal')?.classList.remove('hidden');
        });

        // Mobile Background Modal Events
        document.getElementById('btn-close-bg-modal')?.addEventListener('click', () => {
            document.getElementById('mobile-bg-modal')?.classList.add('hidden');
        });
        document.querySelectorAll('.mobile-color-card').forEach(card => {
            card.addEventListener('click', () => {
                const color = card.dataset.color;
                if (color) {
                    this.canvasEngine.setBackground(color);
                    this.state.updateCurrentSlideBackground(color);
                    document.getElementById('mobile-bg-modal')?.classList.add('hidden');
                }
            });
        });
        document.getElementById('mobile-bg-custom-picker')?.addEventListener('input', (e) => {
            const color = e.target.value;
            this.canvasEngine.setBackground(color);
            this.state.updateCurrentSlideBackground(color);
        });

        // Floating Selection Pill on Canvas
        this.bind('pill-delete-btn', () => this.canvasEngine.deleteActiveObjects());
        this.bind('pill-clone-btn', () => this.canvasEngine.cloneActiveObjects());
        this.bind('pill-forward-btn', () => {
            const obj = c.getActiveObject();
            if (obj) { obj.bringForward(); c.requestRenderAll(); this.canvasEngine.recordHistory(); }
        });
        this.bind('pill-backward-btn', () => {
            const obj = c.getActiveObject();
            if (obj) { obj.sendBackwards(); c.requestRenderAll(); this.canvasEngine.recordHistory(); }
        });

        // Mobile Direct Text Edit Modal
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

        this.bind('pill-edit-text-btn', openTextModal);

        // Double-tap or double-click on text on mobile also opens quick-edit
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
        c.on('selection:cleared', () => {
            document.getElementById('floating-selection-pill')?.classList.add('hidden');
        });
        c.on('object:moving', updateFloatingPill);
        c.on('object:scaling', updateFloatingPill);
        c.on('object:rotating', updateFloatingPill);
        window.addEventListener('resize', updateFloatingPill);
    }

    // --- 3. TEXT CONTROLS ---
    bindTextControls() {
        const c = this.canvas;

        // Custom Font Dropdown
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
                    if (fontVal) {
                        fontVal.innerText = font;
                        fontVal.style.fontFamily = font;
                    }
                    fontDropdown.classList.remove('open');
                    fontPopover.classList.add('hidden');

                    const obj = c.getActiveObject();
                    if (obj && (obj.type === 'i-text' || obj.type === 'textbox')) {
                        obj.set('fontFamily', font);
                        c.requestRenderAll();
                        this.canvasEngine.recordHistory();
                    }
                });
            });
        }

        // Font Size Stepper
        const sizeInput = document.getElementById('text-font-size-input');
        const btnSizeDec = document.getElementById('btn-font-size-dec');
        const btnSizeInc = document.getElementById('btn-font-size-inc');

        const updateFontSize = (delta) => {
            const obj = c.getActiveObject();
            if (!obj || !(obj.type === 'i-text' || obj.type === 'textbox')) return;
            let current = parseInt(obj.fontSize || 32, 10);
            current = Math.max(12, Math.min(180, current + delta));
            obj.set('fontSize', current);
            if (sizeInput) sizeInput.value = current;
            c.requestRenderAll();
            this.canvasEngine.recordHistory();
        };

        btnSizeDec?.addEventListener('click', () => updateFontSize(-4));
        btnSizeInc?.addEventListener('click', () => updateFontSize(4));
        sizeInput?.addEventListener('change', (e) => {
            const val = parseInt(e.target.value, 10);
            if (isNaN(val) || val < 10) return;
            const obj = c.getActiveObject();
            if (obj && (obj.type === 'i-text' || obj.type === 'textbox')) {
                obj.set('fontSize', val);
                c.requestRenderAll();
                this.canvasEngine.recordHistory();
            }
        });

        // Bold Toggle
        this.bind('btn-text-bold', () => {
            const obj = c.getActiveObject();
            if (!obj || !(obj.type === 'i-text' || obj.type === 'textbox')) return;
            const isBold = obj.fontWeight === 'bold' || obj.fontWeight === '700' || obj.fontWeight === '800';
            obj.set('fontWeight', isBold ? 'normal' : '700');
            document.getElementById('btn-text-bold')?.classList.toggle('active', !isBold);
            c.requestRenderAll();
            this.canvasEngine.recordHistory();
        });

        // Italic Toggle
        this.bind('btn-text-italic', () => {
            const obj = c.getActiveObject();
            if (!obj || !(obj.type === 'i-text' || obj.type === 'textbox')) return;
            const isItalic = obj.fontStyle === 'italic';
            obj.set('fontStyle', isItalic ? 'normal' : 'italic');
            document.getElementById('btn-text-italic')?.classList.toggle('active', !isItalic);
            c.requestRenderAll();
            this.canvasEngine.recordHistory();
        });

        // Alignment (Left, Center, Right)
        const alignBtns = ['left', 'center', 'right'];
        alignBtns.forEach(a => {
            this.bind(`btn-align-${a}`, () => {
                const obj = c.getActiveObject();
                if (!obj || !(obj.type === 'i-text' || obj.type === 'textbox')) return;
                obj.set('textAlign', a);
                alignBtns.forEach(x => document.getElementById(`btn-align-${x}`)?.classList.remove('active'));
                document.getElementById(`btn-align-${a}`)?.classList.add('active');
                c.requestRenderAll();
                this.canvasEngine.recordHistory();
            });
        });

        // Text Color Swatch
        const textColorInput = document.getElementById('text-color-input');
        const textColorSwatch = document.getElementById('text-color-swatch');
        textColorInput?.addEventListener('input', (e) => {
            const color = e.target.value;
            if (textColorSwatch) textColorSwatch.style.backgroundColor = color;
            const obj = c.getActiveObject();
            if (obj && (obj.type === 'i-text' || obj.type === 'textbox')) {
                obj.set('fill', color);
                c.requestRenderAll();
            }
        });
        textColorInput?.addEventListener('change', () => this.canvasEngine.recordHistory());

        // Text Actions: Layering, Clone, Delete
        this.bind('btn-text-bring-forward', () => { c.getActiveObject()?.bringForward(); c.requestRenderAll(); this.canvasEngine.recordHistory(); });
        this.bind('btn-text-send-back', () => { c.getActiveObject()?.sendBackwards(); c.requestRenderAll(); this.canvasEngine.recordHistory(); });
        this.bind('btn-text-clone', () => this.canvasEngine.cloneActiveObjects());
        this.bind('btn-text-delete', () => this.canvasEngine.deleteActiveObjects());
    }

    syncTextControls(active) {
        // Sync Font
        const fontVal = document.getElementById('val-font');
        if (fontVal && active.fontFamily) {
            fontVal.innerText = active.fontFamily.split(',')[0].replace(/['"]/g, '');
            fontVal.style.fontFamily = active.fontFamily;
        }

        // Sync Font Size
        const sizeInput = document.getElementById('text-font-size-input');
        if (sizeInput && active.fontSize) {
            sizeInput.value = Math.round(active.fontSize);
        }

        // Sync Bold / Italic
        const isBold = active.fontWeight === 'bold' || active.fontWeight === '700' || active.fontWeight === '800';
        document.getElementById('btn-text-bold')?.classList.toggle('active', isBold);

        const isItalic = active.fontStyle === 'italic';
        document.getElementById('btn-text-italic')?.classList.toggle('active', isItalic);

        // Sync Align
        const align = active.textAlign || 'left';
        ['left', 'center', 'right'].forEach(a => {
            document.getElementById(`btn-align-${a}`)?.classList.toggle('active', a === align);
        });

        // Sync Color
        const textColorInput = document.getElementById('text-color-input');
        const textColorSwatch = document.getElementById('text-color-swatch');
        if (textColorInput && typeof active.fill === 'string') {
            const col = active.fill.startsWith('#') ? active.fill : '#0f172a';
            textColorInput.value = col;
            if (textColorSwatch) textColorSwatch.style.backgroundColor = col;
        }
    }

    // --- 4. SHAPE CONTROLS ---
    bindShapeControls() {
        const c = this.canvas;

        // Fill Color
        const fillInput = document.getElementById('shape-fill-input');
        const fillSwatch = document.getElementById('shape-fill-swatch');
        fillInput?.addEventListener('input', (e) => {
            const col = e.target.value;
            if (fillSwatch) fillSwatch.style.backgroundColor = col;
            const obj = c.getActiveObject();
            if (obj) { obj.set('fill', col); c.requestRenderAll(); }
        });
        fillInput?.addEventListener('change', () => this.canvasEngine.recordHistory());

        // Border Color
        const strokeInput = document.getElementById('shape-stroke-input');
        const strokeSwatch = document.getElementById('shape-stroke-swatch');
        strokeInput?.addEventListener('input', (e) => {
            const col = e.target.value;
            if (strokeSwatch) strokeSwatch.style.backgroundColor = col;
            const obj = c.getActiveObject();
            if (obj) { obj.set('stroke', col); c.requestRenderAll(); }
        });
        strokeInput?.addEventListener('change', () => this.canvasEngine.recordHistory());

        // Border Thickness Segmented Pills
        const borders = [0, 2, 4];
        borders.forEach(w => {
            this.bind(`btn-border-${w}`, () => {
                const obj = c.getActiveObject();
                if (!obj) return;
                obj.set('strokeWidth', w);
                borders.forEach(x => document.getElementById(`btn-border-${x}`)?.classList.remove('active'));
                document.getElementById(`btn-border-${w}`)?.classList.add('active');
                c.requestRenderAll();
                this.canvasEngine.recordHistory();
            });
        });

        // Actions
        this.bind('btn-shape-bring-forward', () => { c.getActiveObject()?.bringForward(); c.requestRenderAll(); this.canvasEngine.recordHistory(); });
        this.bind('btn-shape-send-back', () => { c.getActiveObject()?.sendBackwards(); c.requestRenderAll(); this.canvasEngine.recordHistory(); });
        this.bind('btn-shape-clone', () => this.canvasEngine.cloneActiveObjects());
        this.bind('btn-shape-delete', () => this.canvasEngine.deleteActiveObjects());
    }

    syncShapeControls(active) {
        const fillInput = document.getElementById('shape-fill-input');
        const fillSwatch = document.getElementById('shape-fill-swatch');
        if (fillInput && typeof active.fill === 'string') {
            const col = active.fill.startsWith('#') ? active.fill : '#f8fafc';
            fillInput.value = col;
            if (fillSwatch) fillSwatch.style.backgroundColor = col;
        }

        const strokeInput = document.getElementById('shape-stroke-input');
        const strokeSwatch = document.getElementById('shape-stroke-swatch');
        if (strokeInput && typeof active.stroke === 'string') {
            const col = active.stroke.startsWith('#') ? active.stroke : '#e2e8f0';
            strokeInput.value = col;
            if (strokeSwatch) strokeSwatch.style.backgroundColor = col;
        }

        const sw = active.strokeWidth || 0;
        [0, 2, 4].forEach(w => {
            document.getElementById(`btn-border-${w}`)?.classList.toggle('active', w === sw);
        });
    }

    // --- 5. LINE CONTROLS ---
    bindLineControls() {
        const c = this.canvas;
        const lineInput = document.getElementById('line-color-input');
        const lineSwatch = document.getElementById('line-color-swatch');
        lineInput?.addEventListener('input', (e) => {
            const col = e.target.value;
            if (lineSwatch) lineSwatch.style.backgroundColor = col;
            const obj = c.getActiveObject();
            if (obj) { obj.set('stroke', col); c.requestRenderAll(); }
        });
        lineInput?.addEventListener('change', () => this.canvasEngine.recordHistory());

        this.bind('btn-line-clone', () => this.canvasEngine.cloneActiveObjects());
        this.bind('btn-line-delete', () => this.canvasEngine.deleteActiveObjects());
    }

    syncLineControls(active) {
        const lineInput = document.getElementById('line-color-input');
        const lineSwatch = document.getElementById('line-color-swatch');
        if (lineInput && typeof active.stroke === 'string') {
            const col = active.stroke.startsWith('#') ? active.stroke : '#2563eb';
            lineInput.value = col;
            if (lineSwatch) lineSwatch.style.backgroundColor = col;
        }
    }

    // --- 6. IMAGE CONTROLS ---
    bindImageControls() {
        this.bind('btn-image-clone', () => this.canvasEngine.cloneActiveObjects());
        this.bind('btn-image-delete', () => this.canvasEngine.deleteActiveObjects());
    }

    syncImageControls() {}

    // --- 7. SLIDE CONTROLS (When canvas is selected) ---
    bindSlideControls() {
        // Slide Background Palette Presets
        const palette = [
            { id: 'bg-white', color: '#ffffff' },
            { id: 'bg-slate', color: '#f8fafc' },
            { id: 'bg-warm', color: '#fefce8' },
            { id: 'bg-dark', color: '#0f172a' },
            { id: 'bg-blue', color: '#eff6ff' }
        ];

        palette.forEach(p => {
            this.bind(p.id, () => {
                this.canvasEngine.setBackground(p.color);
                this.state.updateCurrentSlideBackground(p.color);
                const bgPicker = document.getElementById('slide-bg-custom-picker');
                if (bgPicker) bgPicker.value = p.color;
            });
        });

        // Custom Slide Background Picker
        const bgPicker = document.getElementById('slide-bg-custom-picker');
        bgPicker?.addEventListener('input', (e) => {
            const col = e.target.value;
            this.canvasEngine.setBackground(col);
            this.state.updateCurrentSlideBackground(col);
        });

        // Open Templates Modal Button
        this.bind('btn-ribbon-templates', () => {
            document.getElementById('templates-modal')?.classList.remove('hidden');
        });
    }

    // --- 8. MULTI CONTROLS ---
    bindMultiControls() {
        const c = this.canvas;
        this.bind('btn-multi-group', () => {
            const active = c.getActiveObject();
            if (!active) return;
            if (active.type === 'activeSelection') {
                active.toGroup();
                c.requestRenderAll();
                this.canvasEngine.recordHistory();
                this.showPanel('shape');
            } else if (active.type === 'group') {
                active.toActiveSelection();
                c.requestRenderAll();
                this.canvasEngine.recordHistory();
                this.showPanel('multi');
            }
        });

        this.bind('btn-multi-clone', () => this.canvasEngine.cloneActiveObjects());
        this.bind('btn-multi-delete', () => this.canvasEngine.deleteActiveObjects());
    }

    syncMultiControls(active) {
        const countSpan = document.getElementById('multi-selection-count');
        if (countSpan && active._objects) {
            countSpan.innerText = `${active._objects.length} Elements Selected`;
        }
    }

    bind(id, fn) {
        document.getElementById(id)?.addEventListener('click', fn);
    }
}
