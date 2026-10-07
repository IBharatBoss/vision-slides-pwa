/**
 * Exporter Service
 * Generates multi-page PDF documents, individual PNG slide images,
 * and JSON project backups.
 */

export class ExporterService {
    constructor(state, canvasEngine) {
        this.state = state;
        this.canvasEngine = canvasEngine;
    }

    // Helper: Render a slide's Fabric JSON to high-res image DataURL
    async renderSlideToDataURL(slide) {
        return new Promise((resolve) => {
            const tempEl = document.createElement('canvas');
            tempEl.width = 1920;
            tempEl.height = 1080;

            const tempFabric = new fabric.Canvas(tempEl, {
                width: 1920,
                height: 1080,
                backgroundColor: slide.background || '#ffffff'
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

    // 1. Multi-Page PDF Export
    async exportToPDF() {
        const slides = this.state.deck.slides;
        if (!slides || slides.length === 0) {
            alert('No slides to export.');
            return;
        }

        // Show export progress toast
        this.showToast('Generating Presentation PDF... Please wait.');

        // Save current canvas state
        const currentJSON = this.canvasEngine.getJSON();
        const currentThumb = this.canvasEngine.getThumbnail();
        this.state.updateCurrentSlideCanvas(currentJSON, currentThumb);

        try {
            // Check jsPDF availability
            const { jsPDF } = window.jspdf || {};
            if (!jsPDF) {
                console.warn('jsPDF not found. Falling back to PNG export.');
                this.exportAllPNG();
                return;
            }

            // Create 16:9 Landscape PDF (1920pt x 1080pt)
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'pt',
                format: [1920, 1080]
            });

            for (let i = 0; i < slides.length; i++) {
                if (i > 0) doc.addPage([1920, 1080], 'landscape');
                const imgData = await this.renderSlideToDataURL(slides[i]);
                doc.addImage(imgData, 'PNG', 0, 0, 1920, 1080, '', 'FAST');
            }

            const cleanTitle = (this.state.deck.title || 'Presentation').replace(/[^a-z0-9_\-]/gi, '_');
            doc.save(`${cleanTitle}.pdf`);
            this.showToast('PDF Exported Successfully!');
        } catch (err) {
            console.error('PDF export failed:', err);
            this.showToast('PDF Export error. Exporting PNG slides instead.');
            this.exportAllPNG();
        }
    }

    // 2. Export All Slides as PNG Images
    async exportAllPNG() {
        const slides = this.state.deck.slides;
        this.showToast(`Exporting ${slides.length} slides as images...`);

        const cleanTitle = (this.state.deck.title || 'Presentation').replace(/[^a-z0-9_\-]/gi, '_');

        for (let i = 0; i < slides.length; i++) {
            const imgData = await this.renderSlideToDataURL(slides[i]);
            const link = document.createElement('a');
            link.download = `${cleanTitle}_Slide_${i + 1}.png`;
            link.href = imgData;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            // Small pause between downloads
            await new Promise(r => setTimeout(r, 200));
        }

        this.showToast('Slide Images Downloaded!');
    }

    // 3. Export Presentation JSON
    exportJSON() {
        // Sync current slide
        const currentJSON = this.canvasEngine.getJSON();
        const currentThumb = this.canvasEngine.getThumbnail();
        this.state.updateCurrentSlideCanvas(currentJSON, currentThumb);

        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.state.deck, null, 2));
        const cleanTitle = (this.state.deck.title || 'Presentation').replace(/[^a-z0-9_\-]/gi, '_');

        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', `${cleanTitle}.pptjson`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();

        this.showToast('Presentation Backup Saved!');
    }

    // 4. Import Presentation JSON
    importJSON(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const deck = JSON.parse(e.target.result);
                if (deck.slides && Array.isArray(deck.slides)) {
                    this.state.setDeck(deck);
                    const firstSlide = this.state.activeSlide;
                    if (firstSlide) {
                        this.canvasEngine.loadSlide(firstSlide);
                    }
                    this.showToast('Presentation Loaded Successfully!');
                } else {
                    alert('Invalid presentation file format.');
                }
            } catch (err) {
                alert('Error parsing presentation file: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    showToast(msg) {
        const toast = document.getElementById('status-toast');
        if (toast) {
            toast.innerText = msg;
            toast.classList.add('visible');
            setTimeout(() => toast.classList.remove('visible'), 3000);
        }
    }
}
