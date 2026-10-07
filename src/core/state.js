/**
 * State Management Module
 * Holds the reactive presentation state, slides collection, active slide index,
 * and notifies listeners on changes.
 */

export class PresentationState {
    constructor() {
        this.deck = {
            id: 'deck-default',
            title: 'Untitled Presentation',
            aspectRatio: '16:9', // '16:9', '4:3', '9:16'
            theme: 'white',
            slides: []
        };
        this.currentSlideIndex = 0;
        this.listeners = new Map();
        
        // History for Undo/Redo per slide
        this.slideHistories = new Map(); // slideId -> { undo: [], redo: [] }
        this.isHistoryLocked = false;
        this.isDirty = false;
    }

    // Subscribe to state change events
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            for (const cb of this.listeners.get(event)) {
                try {
                    cb(data);
                } catch (e) {
                    console.error(`Error in event listener for ${event}:`, e);
                }
            }
        }
    }

    get activeSlide() {
        if (!this.deck.slides || this.deck.slides.length === 0) return null;
        return this.deck.slides[this.currentSlideIndex] || this.deck.slides[0];
    }

    setDeck(newDeck) {
        this.deck = newDeck;
        this.currentSlideIndex = Math.min(this.currentSlideIndex, Math.max(0, this.deck.slides.length - 1));
        this.emit('deck:loaded', this.deck);
        this.emit('slide:change', { index: this.currentSlideIndex, slide: this.activeSlide });
    }

    setTitle(newTitle) {
        this.deck.title = newTitle || 'Untitled Presentation';
        this.isDirty = true;
        this.emit('deck:titleChange', this.deck.title);
        this.emit('state:modified');
    }

    setAspectRatio(ratio) {
        this.deck.aspectRatio = ratio;
        this.isDirty = true;
        this.emit('deck:aspectRatioChange', ratio);
        this.emit('state:modified');
    }

    setCurrentSlideIndex(index) {
        if (index < 0 || index >= this.deck.slides.length) return;
        this.currentSlideIndex = index;
        this.emit('slide:change', { index, slide: this.activeSlide });
    }

    addSlide(slideData, atIndex = null) {
        const newSlide = {
            id: 'slide_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            title: slideData?.title || `Slide ${this.deck.slides.length + 1}`,
            canvasJSON: slideData?.canvasJSON || { version: "5.3.0", objects: [] },
            background: slideData?.background || '#ffffff',
            thumbnail: slideData?.thumbnail || '',
            notes: slideData?.notes || '',
            transition: slideData?.transition || 'fade'
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

    duplicateSlide(index) {
        if (index < 0 || index >= this.deck.slides.length) return;
        const source = this.deck.slides[index];
        const copy = {
            ...JSON.parse(JSON.stringify(source)),
            id: 'slide_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            title: `${source.title} (Copy)`
        };
        const nextIndex = index + 1;
        this.deck.slides.splice(nextIndex, 0, copy);
        this.currentSlideIndex = nextIndex;
        this.isDirty = true;

        this.emit('slide:added', { slide: copy, index: nextIndex });
        this.emit('slide:change', { index: nextIndex, slide: copy });
        this.emit('state:modified');
    }

    deleteSlide(index) {
        if (this.deck.slides.length <= 1) {
            // Can't delete the last remaining slide, just clear it
            const onlySlide = this.deck.slides[0];
            onlySlide.canvasJSON = { version: "5.3.0", objects: [] };
            onlySlide.background = '#ffffff';
            onlySlide.notes = '';
            onlySlide.thumbnail = '';
            this.emit('slide:cleared', { slide: onlySlide, index: 0 });
            this.emit('state:modified');
            return;
        }

        const removed = this.deck.slides.splice(index, 1)[0];
        if (this.currentSlideIndex >= this.deck.slides.length) {
            this.currentSlideIndex = this.deck.slides.length - 1;
        }
        this.isDirty = true;

        this.emit('slide:deleted', { slide: removed, index });
        this.emit('slide:change', { index: this.currentSlideIndex, slide: this.activeSlide });
        this.emit('state:modified');
    }

    moveSlide(fromIndex, toIndex) {
        if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 ||
            fromIndex >= this.deck.slides.length || toIndex >= this.deck.slides.length) return;

        const [moved] = this.deck.slides.splice(fromIndex, 1);
        this.deck.slides.splice(toIndex, 0, moved);
        this.currentSlideIndex = toIndex;
        this.isDirty = true;

        this.emit('slide:reordered', { fromIndex, toIndex });
        this.emit('slide:change', { index: toIndex, slide: moved });
        this.emit('state:modified');
    }

    updateCurrentSlideCanvas(canvasJSON, thumbnail = '') {
        const slide = this.activeSlide;
        if (!slide) return;
        slide.canvasJSON = canvasJSON;
        if (thumbnail) slide.thumbnail = thumbnail;
        this.isDirty = true;
        this.emit('slide:updated', { slide, index: this.currentSlideIndex });
        this.emit('state:modified');
    }

    updateCurrentSlideBackground(color) {
        const slide = this.activeSlide;
        if (!slide) return;
        slide.background = color;
        this.isDirty = true;
        this.emit('slide:backgroundChange', { color, slide });
        this.emit('state:modified');
    }

    updateCurrentSlideNotes(notes) {
        const slide = this.activeSlide;
        if (!slide) return;
        slide.notes = notes;
        this.isDirty = true;
        this.emit('slide:notesChange', { notes, slide });
        this.emit('state:modified');
    }

    updateCurrentSlideTransition(transition) {
        const slide = this.activeSlide;
        if (!slide) return;
        slide.transition = transition;
        this.isDirty = true;
        this.emit('slide:transitionChange', { transition, slide });
        this.emit('state:modified');
    }
}

export const state = new PresentationState();
