/**
 * PresenterMode Component
 * Cinema-grade presentation engine featuring fullscreen presentation,
 * smooth slide transitions, virtual laser pointer, live pen annotation,
 * timer, and intuitive keyboard navigation.
 */

export class PresenterMode {
    constructor(state, canvasEngine) {
        this.state = state;
        this.canvasEngine = canvasEngine;

        this.overlay = document.getElementById('presentation-overlay');
        this.slideContainer = document.getElementById('presenter-slide-display');
        this.hud = document.getElementById('presenter-hud');
        this.timerDisplay = document.getElementById('presenter-timer');
        this.counterDisplay = document.getElementById('presenter-slide-counter');

        // Laser pointer element
        this.laserDot = document.getElementById('presenter-laser-dot');
        this.isLaserActive = false;

        // Live pen annotation canvas
        this.penCanvas = document.getElementById('presenter-pen-canvas');
        this.penCtx = null;
        this.isPenActive = false;
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;

        // Presentation State
        this.isActive = false;
        this.currentIndex = 0;
        this.timerInterval = null;
        this.secondsElapsed = 0;

        this.init();
    }

    init() {
        if (!this.overlay) return;

        // Navigation Buttons
        document.getElementById('btn-present-prev')?.addEventListener('click', () => this.prevSlide());
        document.getElementById('btn-present-next')?.addEventListener('click', () => this.nextSlide());
        document.getElementById('btn-present-exit')?.addEventListener('click', () => this.exitPresentation());

        // Laser & Pen toggles
        document.getElementById('btn-toggle-laser')?.addEventListener('click', () => this.toggleLaser());
        document.getElementById('btn-toggle-pen')?.addEventListener('click', () => this.togglePen());
        document.getElementById('btn-clear-pen')?.addEventListener('click', () => this.clearPen());

        // Keyboard handler during presentation
        window.addEventListener('keydown', (e) => {
            if (!this.isActive) {
                // Shortcut F5 or Shift+F5 to start presentation
                if (e.key === 'F5') {
                    e.preventDefault();
                    this.startPresentation();
                }
                return;
            }

            if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown' || e.key === 'Enter') {
                e.preventDefault();
                this.nextSlide();
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') {
                e.preventDefault();
                this.prevSlide();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.exitPresentation();
            } else if (e.key.toLowerCase() === 'l') {
                this.toggleLaser();
            } else if (e.key.toLowerCase() === 'p') {
                this.togglePen();
            } else if (e.key.toLowerCase() === 'c') {
                this.clearPen();
            }
        });

        // Laser pointer mouse move
        this.overlay.addEventListener('mousemove', (e) => {
            if (this.isLaserActive && this.laserDot) {
                this.laserDot.style.left = `${e.clientX}px`;
                this.laserDot.style.top = `${e.clientY}px`;
            }
        });

        // Touch Swipe Gestures for Mobile & Tablet presentation
        let touchStartX = 0;
        let touchStartY = 0;
        this.overlay.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        this.overlay.addEventListener('touchend', (e) => {
            if (this.isPenActive) return; // allow drawing when pen mode is on
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;

            // Detect horizontal swipe (min 45px, mostly horizontal)
            if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX < 0) {
                    this.nextSlide(); // swipe left -> next slide
                } else {
                    this.prevSlide(); // swipe right -> prev slide
                }
            }
        }, { passive: true });

        // Live pen drawing events
        this.setupPenCanvas();
    }

    setupPenCanvas() {
        if (!this.penCanvas) return;
        this.penCtx = this.penCanvas.getContext('2d');

        const resizePen = () => {
            this.penCanvas.width = window.innerWidth;
            this.penCanvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resizePen);
        resizePen();

        this.penCanvas.addEventListener('mousedown', (e) => {
            if (!this.isPenActive) return;
            this.isDrawing = true;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
        });

        this.penCanvas.addEventListener('mousemove', (e) => {
            if (!this.isDrawing || !this.isPenActive) return;
            this.penCtx.beginPath();
            this.penCtx.moveTo(this.lastX, this.lastY);
            this.penCtx.lineTo(e.clientX, e.clientY);
            this.penCtx.strokeStyle = '#ef4444'; // Radiant Red Marker
            this.penCtx.lineWidth = 4;
            this.penCtx.lineCap = 'round';
            this.penCtx.lineJoin = 'round';
            this.penCtx.stroke();
            this.lastX = e.clientX;
            this.lastY = e.clientY;
        });

        window.addEventListener('mouseup', () => {
            this.isDrawing = false;
        });
    }

    startPresentation(fromCurrentSlide = true) {
        if (!this.overlay) return;

        // 1. Sync current canvas state first
        const currentJSON = this.canvasEngine.getJSON();
        const currentThumb = this.canvasEngine.getThumbnail();
        this.state.updateCurrentSlideCanvas(currentJSON, currentThumb);

        this.isActive = true;
        this.currentIndex = fromCurrentSlide ? this.state.currentSlideIndex : 0;
        this.overlay.classList.remove('hidden');

        // Request Browser Fullscreen if available
        try {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
        } catch (e) {}

        // Reset & Start Timer
        this.secondsElapsed = 0;
        this.updateTimerDisplay();
        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.secondsElapsed++;
            this.updateTimerDisplay();
        }, 1000);

        this.clearPen();
        this.showSlide(this.currentIndex);
    }

    exitPresentation() {
        this.isActive = false;
        this.overlay.classList.add('hidden');
        clearInterval(this.timerInterval);

        // Exit Browser Fullscreen
        try {
            if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
        } catch (e) {}

        // Disable laser & pen
        this.setLaser(false);
        this.setPen(false);
        this.clearPen();

        // Switch back to active slide in main editor
        this.state.setCurrentSlideIndex(this.currentIndex);
        const slide = this.state.activeSlide;
        if (slide) this.canvasEngine.loadSlide(slide);
    }

    showSlide(index) {
        if (index < 0 || index >= this.state.deck.slides.length) return;
        this.currentIndex = index;

        const slide = this.state.deck.slides[index];
        if (!slide) return;

        // Update counter display
        if (this.counterDisplay) {
            this.counterDisplay.innerText = `${index + 1} / ${this.state.deck.slides.length}`;
        }

        // Render Slide in 16:9 Fullscreen container
        this.slideContainer.innerHTML = '';
        this.clearPen();

        // Render with temporary offscreen fabric canvas or image
        const img = document.createElement('img');
        img.className = `presenter-slide-content transition-${slide.transition || 'fade'}`;
        
        // Render high-res snapshot
        const tempCanvasEl = document.createElement('canvas');
        tempCanvasEl.width = 1920;
        tempCanvasEl.height = 1080;
        const tempFabric = new fabric.Canvas(tempCanvasEl, {
            width: 1920,
            height: 1080,
            backgroundColor: slide.background || '#ffffff'
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

    nextSlide() {
        if (this.currentIndex < this.state.deck.slides.length - 1) {
            this.showSlide(this.currentIndex + 1);
        }
    }

    prevSlide() {
        if (this.currentIndex > 0) {
            this.showSlide(this.currentIndex - 1);
        }
    }

    toggleLaser() {
        this.setLaser(!this.isLaserActive);
    }

    setLaser(active) {
        this.isLaserActive = active;
        if (active) {
            this.setPen(false); // Can't draw and laser at the same time
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

    setPen(active) {
        this.isPenActive = active;
        if (active) {
            this.setLaser(false);
            this.penCanvas.style.pointerEvents = 'auto';
            document.getElementById('btn-toggle-pen')?.classList.add('active');
        } else {
            this.penCanvas.style.pointerEvents = 'none';
            document.getElementById('btn-toggle-pen')?.classList.remove('active');
        }
    }

    clearPen() {
        if (this.penCtx && this.penCanvas) {
            this.penCtx.clearRect(0, 0, this.penCanvas.width, this.penCanvas.height);
        }
    }

    updateTimerDisplay() {
        if (!this.timerDisplay) return;
        const mins = String(Math.floor(this.secondsElapsed / 60)).padStart(2, '0');
        const secs = String(this.secondsElapsed % 60).padStart(2, '0');
        this.timerDisplay.innerText = `${mins}:${secs}`;
    }
}
