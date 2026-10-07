/**
 * Canvas Engine Module
 * Wraps Fabric.js with 16:9 responsive auto-scaling, magnetic alignment,
 * slide loading, object manipulation, and live thumbnail generation.
 */

export class CanvasEngine {
    constructor(canvasElementId, containerElementId) {
        this.canvasId = canvasElementId;
        this.containerId = containerElementId;
        this.canvas = null;
        this.container = null;

        // Native Virtual Resolution
        this.virtualWidth = 1920;
        this.virtualHeight = 1080;
        this.scale = 1;

        // Mobile & Desktop Interactive Zoom & Pan State
        this.userZoom = 1.0;
        this.panX = 0;
        this.panY = 0;

        // Snapping config
        this.snapThreshold = 12;
        this.isSnappingEnabled = true;

        // Undo/Redo stack for current slide
        this.undoStack = [];
        this.redoStack = [];
        this.isHistoryLocked = false;

        this.init();
    }

    init() {
        this.container = document.getElementById(this.containerId);
        
        // Initialize Fabric.js Canvas
        this.canvas = new fabric.Canvas(this.canvasId, {
            width: this.virtualWidth,
            height: this.virtualHeight,
            backgroundColor: '#ffffff',
            selection: true,
            preserveObjectStacking: true,
            fireRightClick: true,
            stopContextMenu: true
        });

        // Set modern minimalist selection styling (Apple / Figma style)
        fabric.Object.prototype.set({
            transparentCorners: false,
            cornerColor: '#ffffff',
            cornerStrokeColor: '#2563eb', // Modern Royal Blue
            borderColor: '#3b82f6',
            cornerSize: 10,
            padding: 4,
            cornerStyle: 'circle',
            borderDashArray: [3, 3],
            centeredScaling: false
        });

        // 60-120fps Smooth Performance Optimizations
        fabric.Object.prototype.objectCaching = true;
        fabric.Object.prototype.statefullCache = false;
        fabric.Object.prototype.noScaleCache = false;

        // Ensure text scaling is always proportional and doesn't vertically warp
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

        // Setup top rotation control handle
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

        // Window resize listener to auto-scale canvas to viewport
        window.addEventListener('resize', () => this.resizeToFit());
        
        // Bind object events for alignment & history
        this.bindEvents();

        // Initialize Zoom & Pan gestures
        this.initZoomAndPanGestures();
        
        // Initial responsive scale
        setTimeout(() => this.resizeToFit(), 50);
    }

    setAspectRatio(ratio) {
        if (ratio === '4:3') {
            this.virtualWidth = 1440;
            this.virtualHeight = 1080;
        } else if (ratio === '9:16') {
            this.virtualWidth = 1080;
            this.virtualHeight = 1920;
        } else {
            // Default 16:9 Widescreen
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

        // Adaptive padding: tighter on mobile screens for maximum canvas display area
        const padding = window.innerWidth <= 768 ? 12 : 40;
        const availableWidth = this.container.clientWidth - padding;
        const availableHeight = this.container.clientHeight - padding;

        if (availableWidth <= 0 || availableHeight <= 0) return;

        // Calculate aspect fit scale
        const scaleX = availableWidth / this.virtualWidth;
        const scaleY = availableHeight / this.virtualHeight;
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

        // Wire Zoom Pill Controls
        document.getElementById('btn-zoom-fit')?.addEventListener('click', () => this.zoomFit());
        document.getElementById('btn-zoom-in')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('btn-zoom-out')?.addEventListener('click', () => this.zoomOut());
        document.getElementById('btn-zoom-reset')?.addEventListener('click', () => this.toggleZoom());

        let isPanning = false;
        let startX = 0, startY = 0;
        let initialPinchDist = 0;
        let initialZoom = 1.0;

        // Pan with mouse/touch drag on empty space or when zoomed in
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

        // Touch pinch-to-zoom on mobile/tablets
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

        // Double-tap on canvas background to toggle between Fit and 1.75x Zoom on mobile
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
        // Magnetic alignment while moving
        this.canvas.on('object:moving', (e) => {
            if (this.isSnappingEnabled) {
                this.handleSnapping(e.target);
            }
        });

        // Prevent accidental extreme scaling beyond canvas limits
        this.canvas.on('object:scaling', (e) => {
            const obj = e.target;
            if (!obj) return;
            const maxDim = Math.max(this.virtualWidth, this.virtualHeight) * 2;
            if (obj.getScaledWidth() > maxDim) obj.scaleToWidth(maxDim);
            if (obj.getScaledHeight() > maxDim) obj.scaleToHeight(maxDim);
        });

        // History tracking
        this.canvas.on('object:added', () => this.recordHistory());
        this.canvas.on('object:modified', () => this.recordHistory());
        this.canvas.on('object:removed', () => this.recordHistory());
    }

    handleSnapping(obj) {
        if (!obj) return;
        const canvasW = this.virtualWidth;
        const canvasH = this.virtualHeight;
        const bound = obj.getBoundingRect();

        // Snap to Slide Center X
        const objCenterX = obj.left + (bound.width / 2);
        if (Math.abs(objCenterX - canvasW / 2) < this.snapThreshold) {
            obj.set('left', (canvasW / 2) - (bound.width / 2));
        }

        // Snap to Slide Center Y
        const objCenterY = obj.top + (bound.height / 2);
        if (Math.abs(objCenterY - canvasH / 2) < this.snapThreshold) {
            obj.set('top', (canvasH / 2) - (bound.height / 2));
        }

        // Snap to slide margins (40px padding)
        const margin = 60;
        if (Math.abs(obj.left - margin) < this.snapThreshold) {
            obj.set('left', margin);
        }
        if (Math.abs(obj.top - margin) < this.snapThreshold) {
            obj.set('top', margin);
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
        active.forEach(obj => {
            this.canvas.remove(obj);
        });
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
            cloned.set({
                left: active.left + 30,
                top: active.top + 30,
                evented: true
            });

            if (cloned.type === 'activeSelection') {
                cloned.canvas = this.canvas;
                cloned.forEachObject((obj) => {
                    this.canvas.add(obj);
                });
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
        this.redoStack = []; // Clear redo on new action
    }

    undo() {
        if (this.undoStack.length <= 1) return;
        this.isHistoryLocked = true;
        const current = this.undoStack.pop();
        this.redoStack.push(current);
        const previous = this.undoStack[this.undoStack.length - 1];

        this.canvas.loadFromJSON(previous, () => {
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

    loadSlide(slideData) {
        this.isHistoryLocked = true;
        this.undoStack = [];
        this.redoStack = [];

        const bg = slideData.background || '#ffffff';
        // Freeze rendering during bulk additions to prevent micro-stutter
        this.canvas.renderOnAddRemove = false;
        this.canvas.setBackgroundColor(bg, () => {});

        if (slideData.canvasJSON && slideData.canvasJSON.objects && slideData.canvasJSON.objects.length > 0) {
            this.canvas.loadFromJSON(slideData.canvasJSON, () => {
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

    setBackground(color) {
        this.canvas.setBackgroundColor(color, () => {
            this.canvas.requestRenderAll();
            this.recordHistory();
        });
    }

    getJSON() {
        return this.canvas.toJSON();
    }

    getThumbnail(width = 240, height = 135) {
        try {
            return this.canvas.toDataURL({
                format: 'jpeg',
                quality: 0.7,
                multiplier: width / this.virtualWidth
            });
        } catch (e) {
            console.warn('Could not generate thumbnail:', e);
            return '';
        }
    }

    getHighResImage() {
        return this.canvas.toDataURL({
            format: 'png',
            quality: 1.0,
            multiplier: 1.0
        });
    }
}
