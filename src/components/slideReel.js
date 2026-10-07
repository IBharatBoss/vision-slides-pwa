/**
 * SlideReel Component
 * Left thumbnail sidebar for managing, reordering, duplicating,
 * and creating slides with 1-click templates.
 */

import { SlideTemplates } from '../templates/slideTemplates.js';

export class SlideReel {
    constructor(state, canvasEngine) {
        this.state = state;
        this.canvasEngine = canvasEngine;

        this.container = document.getElementById('slide-thumbnails-list');
        this.btnAddSlide = document.getElementById('btn-add-slide');
        this.templatesModal = document.getElementById('templates-modal');
        this.templatesGrid = document.getElementById('templates-grid');

        this.init();
    }

    init() {
        this.render();

        // Add Slide button opens template picker modal
        if (this.btnAddSlide) {
            this.btnAddSlide.addEventListener('click', () => {
                this.openTemplatesModal();
            });
        }

        // Render templates inside modal
        this.setupTemplatesModal();

        // Subscribe to state events
        this.state.on('slide:change', () => this.highlightActiveSlide());
        this.state.on('slide:added', () => this.render());
        this.state.on('slide:deleted', () => this.render());
        this.state.on('slide:reordered', () => this.render());
        this.state.on('slide:updated', ({ slide, index }) => this.updateThumbnail(index, slide.thumbnail));
        this.state.on('deck:loaded', () => this.render());
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';

        const slides = this.state.deck.slides;
        slides.forEach((slide, index) => {
            const item = document.createElement('div');
            item.className = `slide-thumbnail-card ${index === this.state.currentSlideIndex ? 'active' : ''}`;
            item.dataset.index = index;

            // Thumbnail Image or Placeholder
            const thumbContent = slide.thumbnail 
                ? `<img src="${slide.thumbnail}" class="thumb-img" alt="Slide ${index + 1}" />`
                : `<div class="thumb-placeholder"><span class="material-icons-round">space_dashboard</span></div>`;

            item.innerHTML = `
                <div class="thumb-header">
                    <span class="slide-number">${index + 1}</span>
                    <div class="thumb-actions">
                        <button class="thumb-btn-mini btn-move-up" title="Move Up" ${index === 0 ? 'disabled' : ''}>
                            <span class="material-icons-round">keyboard_arrow_up</span>
                        </button>
                        <button class="thumb-btn-mini btn-move-down" title="Move Down" ${index === slides.length - 1 ? 'disabled' : ''}>
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
                <div class="thumb-preview-box">
                    ${thumbContent}
                </div>
            `;

            // Click to select slide
            item.addEventListener('click', (e) => {
                if (e.target.closest('.thumb-actions')) return;
                this.selectSlide(index);
            });

            // Action: Duplicate
            item.querySelector('.btn-duplicate')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.state.duplicateSlide(index);
            });

            // Action: Move Up
            item.querySelector('.btn-move-up')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.state.moveSlide(index, index - 1);
            });

            // Action: Move Down
            item.querySelector('.btn-move-down')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.state.moveSlide(index, index + 1);
            });

            // Action: Delete
            item.querySelector('.btn-delete')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.state.deleteSlide(index);
            });

            this.container.appendChild(item);
        });

        this.highlightActiveSlide();
    }

    highlightActiveSlide() {
        const cards = this.container.querySelectorAll('.slide-thumbnail-card');
        cards.forEach((card, idx) => {
            if (idx === this.state.currentSlideIndex) {
                card.classList.add('active');
                if (this.container && card) {
                    const containerTop = this.container.scrollTop;
                    const containerHeight = this.container.clientHeight;
                    const cardTop = card.offsetTop;
                    const cardHeight = card.offsetHeight;
                    if (cardTop < containerTop) {
                        this.container.scrollTop = Math.max(0, cardTop - 12);
                    } else if (cardTop + cardHeight > containerTop + containerHeight) {
                        this.container.scrollTop = cardTop + cardHeight - containerHeight + 12;
                    }
                }
            } else {
                card.classList.remove('active');
            }
        });
    }

    updateThumbnail(index, thumbnailSrc) {
        if (!thumbnailSrc) return;
        const card = this.container.querySelector(`.slide-thumbnail-card[data-index="${index}"]`);
        if (card) {
            const previewBox = card.querySelector('.thumb-preview-box');
            if (previewBox) {
                previewBox.innerHTML = `<img src="${thumbnailSrc}" class="thumb-img" alt="Slide ${index + 1}" />`;
            }
        }
    }

    selectSlide(index) {
        if (index === this.state.currentSlideIndex) return;

        // Save current slide canvas first
        const currentJSON = this.canvasEngine.getJSON();
        const currentThumb = this.canvasEngine.getThumbnail();
        this.state.updateCurrentSlideCanvas(currentJSON, currentThumb);

        // Switch active slide in state
        this.state.setCurrentSlideIndex(index);

        // Load new slide into canvas engine
        const newSlide = this.state.activeSlide;
        if (newSlide) {
            this.canvasEngine.loadSlide(newSlide);
        }
    }

    setupTemplatesModal() {
        if (!this.templatesGrid) return;
        this.templatesGrid.innerHTML = '';

        // Option 1: Blank Slide
        const blankCard = document.createElement('div');
        blankCard.className = 'template-picker-card';
        blankCard.innerHTML = `
            <div class="template-card-preview blank-preview">
                <span class="material-icons-round">crop_landscape</span>
            </div>
            <div class="template-card-info">
                <h4>Blank Slide</h4>
                <p>Start with a clean white canvas</p>
            </div>
        `;
        blankCard.addEventListener('click', () => {
            this.createSlideFromTemplate(null);
            this.closeTemplatesModal();
        });
        this.templatesGrid.appendChild(blankCard);

        // Option 2...N: Curated templates
        SlideTemplates.forEach((tmpl) => {
            const card = document.createElement('div');
            card.className = 'template-picker-card';
            card.innerHTML = `
                <div class="template-card-preview">
                    <span class="material-icons-round">auto_awesome</span>
                </div>
                <div class="template-card-info">
                    <h4>${tmpl.name}</h4>
                    <p>${tmpl.description}</p>
                </div>
            `;
            card.addEventListener('click', () => {
                this.createSlideFromTemplate(tmpl);
                this.closeTemplatesModal();
            });
            this.templatesGrid.appendChild(card);
        });

        // Close button
        const btnClose = document.getElementById('close-templates-modal');
        if (btnClose) {
            btnClose.addEventListener('click', () => this.closeTemplatesModal());
        }

        // Outside click
        if (this.templatesModal) {
            this.templatesModal.addEventListener('click', (e) => {
                if (e.target === this.templatesModal) this.closeTemplatesModal();
            });
        }
    }

    openTemplatesModal() {
        if (this.templatesModal) {
            this.templatesModal.classList.remove('hidden');
        }
    }

    closeTemplatesModal() {
        if (this.templatesModal) {
            this.templatesModal.classList.add('hidden');
        }
    }

    createSlideFromTemplate(template) {
        // 1. Save current slide
        const currentJSON = this.canvasEngine.getJSON();
        const currentThumb = this.canvasEngine.getThumbnail();
        this.state.updateCurrentSlideCanvas(currentJSON, currentThumb);

        // 2. Add slide in state
        const title = template ? template.name : `Slide ${this.state.deck.slides.length + 1}`;
        const newSlide = this.state.addSlide({ title, background: '#ffffff' });

        // 3. Clear canvas & load template if selected
        this.canvasEngine.loadSlide(newSlide);
        if (template && typeof template.create === 'function') {
            template.create(this.canvasEngine.canvas);
        }

        // 4. Capture initial thumbnail
        setTimeout(() => {
            const thumb = this.canvasEngine.getThumbnail();
            const json = this.canvasEngine.getJSON();
            this.state.updateCurrentSlideCanvas(json, thumb);
        }, 100);
    }
}
