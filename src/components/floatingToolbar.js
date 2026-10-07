/**
 * FloatingToolbar Component
 * Modern, floating dock for fast 1-click insertion of text, shapes,
 * images, and drawing tools onto the active slide.
 */

export class FloatingToolbar {
    constructor(canvasEngine, state) {
        this.canvasEngine = canvasEngine;
        this.state = state;
        this.currentTool = 'select';

        this.init();
    }

    init() {
        const c = this.canvasEngine.canvas;

        // Select Tool
        this.bindBtn('tool-select', () => {
            this.setTool('select');
            c.isDrawingMode = false;
            c.selection = true;
            c.defaultCursor = 'default';
        });

        // Add Heading
        this.bindBtn('tool-add-heading', () => {
            this.setTool('select');
            c.isDrawingMode = false;
            c.selection = true;
            const text = new fabric.IText('Presentation Heading', {
                left: (this.canvasEngine.virtualWidth - 650) / 2,
                top: (this.canvasEngine.virtualHeight - 120) / 2 - 50,
                fontSize: 60,
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
        this.bindBtn('tool-add-subheading', () => {
            this.setTool('select');
            c.isDrawingMode = false;
            c.selection = true;
            const text = new fabric.IText('A clear, compelling subtitle goes here', {
                left: (this.canvasEngine.virtualWidth - 560) / 2,
                top: (this.canvasEngine.virtualHeight - 60) / 2 + 30,
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
        this.bindBtn('tool-add-body', () => {
            this.setTool('select');
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

        // Add Rounded Card / Box
        this.bindBtn('tool-add-card', () => {
            this.setTool('select');
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

        // Add Circle
        this.bindBtn('tool-add-circle', () => {
            this.setTool('select');
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

        // Add Arrow / Direction
        this.bindBtn('tool-add-arrow', () => {
            this.setTool('select');
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

        // Add Image Upload
        const imgInput = document.getElementById('slide-img-upload-input');
        this.bindBtn('tool-upload-image', () => {
            if (imgInput) imgInput.click();
        });

        if (imgInput) {
            imgInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (f) => {
                    fabric.Image.fromURL(f.target.result, (img) => {
                        const maxW = 900;
                        const maxH = 650;
                        if (img.width > maxW || img.height > maxH) {
                            const scale = Math.min(maxW / img.width, maxH / img.height);
                            img.scale(scale);
                        }
                        const scaledW = img.getScaledWidth ? img.getScaledWidth() : img.width;
                        const scaledH = img.getScaledHeight ? img.getScaledHeight() : img.height;
                        img.set({
                            left: (this.canvasEngine.virtualWidth - scaledW) / 2,
                            top: (this.canvasEngine.virtualHeight - scaledH) / 2,
                            cornerStyle: 'circle'
                        });
                        c.add(img);
                        c.setActiveObject(img);
                        c.requestRenderAll();
                        this.canvasEngine.recordHistory();
                    });
                };
                reader.readAsDataURL(file);
                imgInput.value = ''; // Reset
            });
        }

        // Draw Tool (Pencil / Marker)
        this.bindBtn('tool-draw-pen', () => {
            this.setTool('draw');
            c.isDrawingMode = true;
            c.freeDrawingBrush.color = '#2563eb';
            c.freeDrawingBrush.width = 4;
        });

        // Slide Background Color presets
        const bgPicker = document.getElementById('slide-bg-color-picker');
        if (bgPicker) {
            bgPicker.addEventListener('input', (e) => {
                const color = e.target.value;
                this.canvasEngine.setBackground(color);
                this.state.updateCurrentSlideBackground(color);
            });
        }
    }

    bindBtn(id, handler) {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', handler);
        }
    }

    setTool(toolName) {
        this.currentTool = toolName;
        document.querySelectorAll('.dock-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`tool-${toolName}`);
        if (activeBtn) activeBtn.classList.add('active');
    }
}
