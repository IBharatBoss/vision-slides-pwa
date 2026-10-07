/**
 * Slide Templates Module
 * Provides 1-click world-class modern slide layouts.
 * All coordinates are tailored to 1920x1080 native resolution.
 */

export const SlideTemplates = [
    {
        id: 'hero-title',
        name: 'Title & Hero Pitch',
        description: 'Bold presentation title with subtitle and category pill',
        create(canvas) {
            canvas.clear();
            canvas.setBackgroundColor('#ffffff', () => {});

            // Category Badge Pill
            const pillBg = new fabric.Rect({
                left: 140,
                top: 260,
                width: 170,
                height: 44,
                rx: 22,
                ry: 22,
                fill: '#eff6ff', // Light Blue
                stroke: '#bfdbfe',
                strokeWidth: 1.5,
                selectable: true
            });

            const pillText = new fabric.IText('PRESENTATION', {
                left: 165,
                top: 274,
                fontSize: 14,
                fontWeight: '700',
                fill: '#2563eb',
                fontFamily: 'Inter',
                selectable: true
            });

            // Big Bold Title
            const title = new fabric.IText('The Future of Digital Ideas', {
                left: 140,
                top: 340,
                fontSize: 72,
                fontWeight: '800',
                fill: '#0f172a', // Slate 900
                fontFamily: 'Outfit, Inter, sans-serif',
                selectable: true
            });

            // Subtitle
            const subtitle = new fabric.IText('How modern teams create, present, and inspire with world-class clarity.', {
                left: 140,
                top: 450,
                fontSize: 28,
                fontWeight: '400',
                fill: '#64748b', // Slate 500
                fontFamily: 'Inter, sans-serif',
                selectable: true
            });

            // Presenter info line
            const presenter = new fabric.IText('Presented by Executive Team  •  2026 Edition', {
                left: 140,
                top: 780,
                fontSize: 20,
                fontWeight: '500',
                fill: '#94a3b8',
                fontFamily: 'Inter, sans-serif',
                selectable: true
            });

            // Decorative Accent Bar
            const accentLine = new fabric.Rect({
                left: 140,
                top: 530,
                width: 100,
                height: 6,
                rx: 3,
                ry: 3,
                fill: '#3b82f6',
                selectable: true
            });

            canvas.add(pillBg, pillText, title, subtitle, accentLine, presenter);
            canvas.renderAll();
        }
    },

    {
        id: 'feature-cards',
        name: '3 Feature Cards',
        description: 'Clean three-column modern benefit cards',
        create(canvas) {
            canvas.clear();
            canvas.setBackgroundColor('#ffffff', () => {});

            // Header Section
            const sectionTitle = new fabric.IText('Key Pillars of Success', {
                left: 140,
                top: 140,
                fontSize: 48,
                fontWeight: '800',
                fill: '#0f172a',
                fontFamily: 'Outfit, Inter, sans-serif',
                selectable: true
            });

            const sectionSubtitle = new fabric.IText('Engineered for lightning speed, unmatched aesthetics, and instant collaboration.', {
                left: 140,
                top: 210,
                fontSize: 22,
                fill: '#64748b',
                fontFamily: 'Inter, sans-serif',
                selectable: true
            });

            canvas.add(sectionTitle, sectionSubtitle);

            // 3 Column Cards
            const cardWidth = 490;
            const cardHeight = 520;
            const startX = 140;
            const gap = 85;
            const topY = 320;

            const cardsData = [
                { num: '01', title: 'Ultra Fast', desc: 'Instant zero-lag interactions. Create complete slide decks in under 5 minutes without tedious menus.' },
                { num: '02', title: 'World-Class UI', desc: 'Crafted with Apple-grade precision, clean light aesthetics, and modern typography.' },
                { num: '03', title: 'Live Presenter', desc: 'Built-in virtual laser pointer, slide transitions, and real-time presenter drawing pen.' }
            ];

            cardsData.forEach((item, i) => {
                const x = startX + i * (cardWidth + gap);

                const cardBg = new fabric.Rect({
                    left: x,
                    top: topY,
                    width: cardWidth,
                    height: cardHeight,
                    rx: 16,
                    ry: 16,
                    fill: '#f8fafc',
                    stroke: '#e2e8f0',
                    strokeWidth: 1.5,
                    selectable: true
                });

                const badge = new fabric.IText(item.num, {
                    left: x + 40,
                    top: topY + 40,
                    fontSize: 20,
                    fontWeight: '700',
                    fill: '#3b82f6',
                    fontFamily: 'Inter, sans-serif',
                    selectable: true
                });

                const cardTitle = new fabric.IText(item.title, {
                    left: x + 40,
                    top: topY + 110,
                    fontSize: 32,
                    fontWeight: '700',
                    fill: '#0f172a',
                    fontFamily: 'Outfit, Inter, sans-serif',
                    selectable: true
                });

                const cardDesc = new fabric.Textbox(item.desc, {
                    left: x + 40,
                    top: topY + 180,
                    width: cardWidth - 80,
                    fontSize: 20,
                    lineHeight: 1.4,
                    fill: '#64748b',
                    fontFamily: 'Inter, sans-serif',
                    selectable: true
                });

                canvas.add(cardBg, badge, cardTitle, cardDesc);
            });

            canvas.renderAll();
        }
    },

    {
        id: 'big-metric',
        name: 'Big Metric & Impact',
        description: 'Showcase massive KPI stats and growth metrics',
        create(canvas) {
            canvas.clear();
            canvas.setBackgroundColor('#ffffff', () => {});

            const title = new fabric.IText('Measurable Impact & Results', {
                left: 140,
                top: 140,
                fontSize: 48,
                fontWeight: '800',
                fill: '#0f172a',
                fontFamily: 'Outfit, Inter, sans-serif',
                selectable: true
            });

            // Big Stat 1
            const stat1Number = new fabric.IText('+240%', {
                left: 140,
                top: 320,
                fontSize: 110,
                fontWeight: '900',
                fill: '#2563eb',
                fontFamily: 'Outfit, Inter, sans-serif',
                selectable: true
            });

            const stat1Label = new fabric.IText('Productivity Increase', {
                left: 140,
                top: 470,
                fontSize: 28,
                fontWeight: '700',
                fill: '#0f172a',
                fontFamily: 'Inter, sans-serif',
                selectable: true
            });

            const stat1Sub = new fabric.Textbox('Teams reported saving an average of 4.5 hours per week when designing presentations.', {
                left: 140,
                top: 520,
                width: 600,
                fontSize: 20,
                lineHeight: 1.4,
                fill: '#64748b',
                fontFamily: 'Inter, sans-serif',
                selectable: true
            });

            // Big Stat 2
            const stat2Number = new fabric.IText('99.8%', {
                left: 980,
                top: 320,
                fontSize: 110,
                fontWeight: '900',
                fill: '#059669', // Emerald Green
                fontFamily: 'Outfit, Inter, sans-serif',
                selectable: true
            });

            const stat2Label = new fabric.IText('Satisfaction Rate', {
                left: 980,
                top: 470,
                fontSize: 28,
                fontWeight: '700',
                fill: '#0f172a',
                fontFamily: 'Inter, sans-serif',
                selectable: true
            });

            const stat2Sub = new fabric.Textbox('Unanimous approval across enterprise executives and creative directors worldwide.', {
                left: 980,
                top: 520,
                width: 600,
                fontSize: 20,
                lineHeight: 1.4,
                fill: '#64748b',
                fontFamily: 'Inter, sans-serif',
                selectable: true
            });

            canvas.add(title, stat1Number, stat1Label, stat1Sub, stat2Number, stat2Label, stat2Sub);
            canvas.renderAll();
        }
    },

    {
        id: 'quote-slide',
        name: 'Executive Quote',
        description: 'Elegant testimonial or vision quote',
        create(canvas) {
            canvas.clear();
            canvas.setBackgroundColor('#ffffff', () => {});

            // Large quote mark
            const quoteMark = new fabric.IText('“', {
                left: 140,
                top: 180,
                fontSize: 160,
                fontWeight: '800',
                fill: '#dbeafe', // Soft Blue Accent
                fontFamily: 'Outfit, serif',
                selectable: true
            });

            // The Quote
            const quoteText = new fabric.Textbox('Simplicity is about subtracting the obvious and adding the meaningful. Great presentations don’t distract; they clarify.', {
                left: 140,
                top: 360,
                width: 1400,
                fontSize: 44,
                lineHeight: 1.4,
                fontWeight: '600',
                fill: '#0f172a',
                fontFamily: 'Inter, sans-serif',
                selectable: true
            });

            // Author
            const author = new fabric.IText('— John Maeda', {
                left: 140,
                top: 600,
                fontSize: 28,
                fontWeight: '700',
                fill: '#2563eb',
                fontFamily: 'Inter, sans-serif',
                selectable: true
            });

            const role = new fabric.IText('Author of The Laws of Simplicity', {
                left: 140,
                top: 645,
                fontSize: 20,
                fill: '#64748b',
                fontFamily: 'Inter, sans-serif',
                selectable: true
            });

            canvas.add(quoteMark, quoteText, author, role);
            canvas.renderAll();
        }
    },

    {
        id: 'process-timeline',
        name: '4-Step Roadmap',
        description: 'Sequential milestones or process roadmap',
        create(canvas) {
            canvas.clear();
            canvas.setBackgroundColor('#ffffff', () => {});

            const title = new fabric.IText('Strategic Roadmap & Timeline', {
                left: 140,
                top: 140,
                fontSize: 48,
                fontWeight: '800',
                fill: '#0f172a',
                fontFamily: 'Outfit, Inter, sans-serif',
                selectable: true
            });

            // Horizontal connecting line
            const line = new fabric.Line([180, 480, 1600, 480], {
                stroke: '#e2e8f0',
                strokeWidth: 4,
                selectable: true
            });

            canvas.add(title, line);

            const steps = [
                { step: '01', title: 'Discover', desc: 'Identify core opportunities and audience needs.' },
                { step: '02', title: 'Design', desc: 'Develop high-impact concepts and prototypes.' },
                { step: '03', title: 'Deliver', desc: 'Execute with precision and real-time feedback.' },
                { step: '04', title: 'Scale', desc: 'Expand globally with sustainable momentum.' }
            ];

            const startX = 180;
            const stepGap = 440;

            steps.forEach((s, idx) => {
                const x = startX + idx * stepGap;

                // Step Circle
                const circle = new fabric.Circle({
                    left: x - 30,
                    top: 450,
                    radius: 30,
                    fill: '#ffffff',
                    stroke: '#2563eb',
                    strokeWidth: 4,
                    selectable: true
                });

                const stepNum = new fabric.IText(s.step, {
                    left: x - 13,
                    top: 468,
                    fontSize: 20,
                    fontWeight: '800',
                    fill: '#2563eb',
                    fontFamily: 'Inter, sans-serif',
                    selectable: true
                });

                const stepTitle = new fabric.IText(s.title, {
                    left: x - 30,
                    top: 540,
                    fontSize: 28,
                    fontWeight: '700',
                    fill: '#0f172a',
                    fontFamily: 'Outfit, Inter, sans-serif',
                    selectable: true
                });

                const stepDesc = new fabric.Textbox(s.desc, {
                    left: x - 30,
                    top: 590,
                    width: 320,
                    fontSize: 18,
                    lineHeight: 1.3,
                    fill: '#64748b',
                    fontFamily: 'Inter, sans-serif',
                    selectable: true
                });

                canvas.add(circle, stepNum, stepTitle, stepDesc);
            });

            canvas.renderAll();
        }
    }
];
