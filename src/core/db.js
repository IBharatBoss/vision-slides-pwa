/**
 * Database Module (Dexie.js)
 * Manages persistent storage for presentations, slides, and autosave.
 */

export const db = new Dexie('PresentationStudioDB');

db.version(1).stores({
    decks: '++id, title, modified, created',
    slides: '++id, deckId, order, modified'
});

export const StorageService = {
    // Save or update an entire presentation deck
    async saveDeck(deckData) {
        try {
            const existing = await db.decks.get(deckData.id);
            if (existing) {
                await db.decks.update(deckData.id, {
                    ...deckData,
                    modified: Date.now()
                });
                return deckData.id;
            } else {
                const id = await db.decks.add({
                    ...deckData,
                    created: Date.now(),
                    modified: Date.now()
                });
                return id;
            }
        } catch (err) {
            console.error('Failed to save deck to DB:', err);
            // Fallback to localStorage
            localStorage.setItem('ppt_backup_' + deckData.id, JSON.stringify(deckData));
            return deckData.id;
        }
    },

    // Load deck by ID
    async loadDeck(id) {
        try {
            const deck = await db.decks.get(id);
            if (deck) return deck;
            const fallback = localStorage.getItem('ppt_backup_' + id);
            return fallback ? JSON.parse(fallback) : null;
        } catch (err) {
            console.error('Failed to load deck from DB:', err);
            const fallback = localStorage.getItem('ppt_backup_' + id);
            return fallback ? JSON.parse(fallback) : null;
        }
    },

    // Get all saved decks
    async getAllDecks() {
        try {
            return await db.decks.orderBy('modified').reverse().toArray();
        } catch (err) {
            console.error('Failed to get decks:', err);
            return [];
        }
    },

    // Delete a deck
    async deleteDeck(id) {
        try {
            await db.decks.delete(id);
            localStorage.removeItem('ppt_backup_' + id);
        } catch (err) {
            console.error('Failed to delete deck:', err);
        }
    }
};
