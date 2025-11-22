// Extract email
export function extractEmail(text) {
    const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return match ? match[0] : null;
}

// Extract phone
export function extractPhone(text) {
    const match = text.match(/(\+?\d[\d\-\s()]{7,}\d)/);
    return match ? match[0].replace(/\s+/g, ' ').trim() : null;
}

// Extract name (simple heuristic)
export function extractName(text, email) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    if (email) {
        const idx = lines.findIndex((l) => l.includes(email));
        if (idx > 0) {
            const candidate = lines[idx - 1];
            if (candidate.split(' ').length <= 4) return candidate;
        }
    }

    for (let i = 0; i < Math.min(6, lines.length); i++) {
        const line = lines[i];
        if (!line.match(/\d/) && line.split(' ').length <= 4) {
            return line;
        }
    }
    return null;
}
