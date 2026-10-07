/**
 * PropertyInspector Component
 * Contextual floating formatting bar that shows relevant controls
 * when text, shapes, or objects are selected on the slide canvas.
 */

export class PropertyInspector {
    constructor(canvasEngine, state) {
        this.canvasEngine = canvasEngine;
        this.state = state;
        this.bubble = document.getElementById('property-bubble');

        this.init();
    }

    init() {
        const c = this.canvasEngine.canvas;

        c.on('selection:created', () => this.update());
        c.on('selection:updated', () => this.update());
        c.on('selection:cleared', () => this.hide());
        c.on('object:moving', () => this.positionBubble());
        c.on('object:scaling', () => this.positionBubble());

        // Actions: Layering
        this.bind('btn-layer-up', () => {
            const obj = c.getActiveObject();
            if (obj) { obj.bringForward(); c.renderAll(); }
        });

        this.bind('btn-layer-down', () => {
            const obj = c.getActiveObject();
            if (obj) { obj.sendBackwards(); c.renderAll(); }
        });

        // Action: Clone
        this.bind('btn-clone', () => {
            this.canvasEngine.cloneActiveObjects();
        });

        // Action: Group / Ungroup
        this.bind('btn-group-toggle', () => {
            const active = c.getActiveObject();
            if (!active) return;

            if (active.type === 'activeSelection') {
                active.toGroup();
                c.requestRenderAll();
                this.canvasEngine.recordHistory();
            } else if (active.type === 'group') {
                active.toActiveSelection();
                c.requestRenderAll();
                this.canvasEngine.recordHistory();
            }
        });

        // Action: Delete
        this.bind('btn-delete-obj', () => {
            this.canvasEngine.deleteActiveObjects();
            this.hide();
        });

        // Formatting: Fill Color
        const fillColorInput = document.getElementById('prop-fill-color');
        if (fillColorInput) {
            fillColorInput.addEventListener('input', (e) => {
                const color = e.target.value;
                const obj = c.getActiveObject();
                if (obj) {
                    obj.set('fill', color);
                    c.renderAll();
                }
            });
        }

        // Formatting: Stroke Color
        const strokeColorInput = document.getElementById('prop-stroke-color');
        if (strokeColorInput) {
            strokeColorInput.addEventListener('input', (e) => {
                const color = e.target.value;
                const obj = c.getActiveObject();
                if (obj) {
                    obj.set('stroke', color);
                    c.renderAll();
                }
            });
        }

        // Formatting: Stroke Width
        const strokeWidthInput = document.getElementById('prop-stroke-width');
        const strokeValDisplay = document.getElementById('stroke-val-display');
        if (strokeWidthInput) {
            strokeWidthInput.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                if (strokeValDisplay) strokeValDisplay.innerText = `${val}px`;
                const obj = c.getActiveObject();
                if (obj) {
                    obj.set('strokeWidth', val);
                    c.renderAll();
                }
            });
        }

        // Formatting: Font Family
        const fontFamilySelect = document.getElementById('prop-font-family');
        if (fontFamilySelect) {
            fontFamilySelect.addEventListener('change', (e) => {
                const font = e.target.value;
                const obj = c.getActiveObject();
                if (obj && (obj.type === 'i-text' || obj.type === 'textbox')) {
                    obj.set('fontFamily', font);
                    c.renderAll();
                }
            });
        }

        // Formatting: Bold Toggle
        this.bind('btn-toggle-bold', () => {
            const obj = c.getActiveObject();
            if (obj && (obj.type === 'i-text' || obj.type === 'textbox')) {
                const isBold = obj.fontWeight === 'bold' || obj.fontWeight === '700' || obj.fontWeight === '800';
                obj.set('fontWeight', isBold ? 'normal' : '700');
                c.renderAll();
            }
        });
    }

    bind(id, fn) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', fn);
    }

    update() {
        if (!this.bubble) return;
        const c = this.canvasEngine.canvas;
        const active = c.getActiveObject();
        if (!active) {
            this.hide();
            return;
        }

        // Show/hide font controls based on type
        const textControls = document.getElementById('bubble-text-controls');
        if (textControls) {
            if (active.type === 'i-text' || active.type === 'textbox') {
                textControls.classList.remove('hidden');
                const fontSelect = document.getElementById('prop-font-family');
                if (fontSelect && active.fontFamily) fontSelect.value = active.fontFamily;
            } else {
                textControls.classList.add('hidden');
            }
        }

        // Update fill color input
        const fillColorInput = document.getElementById('prop-fill-color');
        if (fillColorInput && typeof active.fill === 'string') {
            fillColorInput.value = active.fill.startsWith('#') ? active.fill : '#0f172a';
        }

        this.bubble.classList.remove('hidden_bubble');
        this.positionBubble();
    }

    positionBubble() {
        if (!this.bubble) return;
        const c = this.canvasEngine.canvas;
        const active = c.getActiveObject();
        if (!active) return;

        // Position bubble near the selected object in the viewport
        const bound = active.getBoundingRect();
        const stageCard = document.getElementById('slide-stage-card');
        const container = document.getElementById('canvas-wrapper');

        if (!stageCard || !container) return;

        const stageRect = stageCard.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Convert virtual canvas bound to screen space
        const scale = this.canvasEngine.scale;
        const screenX = stageRect.left + (bound.left * scale) + ((bound.width * scale) / 2);
        let screenY = stageRect.top + (bound.top * scale) - 15;

        if (screenY < 80) {
            // Place below object if too close to top bar
            screenY = stageRect.top + ((bound.top + bound.height) * scale) + 20;
            this.bubble.style.transform = 'translate(-50%, 0)';
        } else {
            this.bubble.style.transform = 'translate(-50%, -100%)';
        }

        const clampedX = Math.max(160, Math.min(window.innerWidth - 180, screenX));
        this.bubble.style.left = `${clampedX}px`;
        this.bubble.style.top = `${screenY}px`;
    }

    hide() {
        if (this.bubble) {
            this.bubble.classList.add('hidden_bubble');
        }
    }
}
