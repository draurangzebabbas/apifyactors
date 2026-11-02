import { log } from 'apify';

/**
 * Parses and cleans an individual URL string or segmented strings.
 * @param {string} text
 * @returns {string[]}
 */
function parseUrlSegments(text) {
    if (!text || typeof text !== 'string') return [];
    const trimmed = text.trim();
    if (!trimmed) return [];

    const indices = [];
    const regex = /https?:\/\//gi;
    let match;
    while ((match = regex.exec(trimmed)) !== null) {
        indices.push(match.index);
    }

    if (indices.length <= 1) {
        try {
            const p = new URL(trimmed);
            if (['http:', 'https:'].includes(p.protocol)) {
                return [p.href];
            }
            log.warning(`Skipping non-http URL: ${trimmed}`);
        } catch {
            log.warning(`Skipping malformed URL: ${trimmed}`);
        }
        return [];
    }

    // Split concatenated URLs and extract each valid one
    const extracted = [];
    for (let i = 0; i < indices.length; i++) {
        const start = indices[i];
        const end = i + 1 < indices.length ? indices[i + 1] : trimmed.length;
        const segment = trimmed.slice(start, end).trim();
        try {
            const p = new URL(segment);
            if (['http:', 'https:'].includes(p.protocol)) {
                extracted.push(p.href);
            }
        } catch {
            // Ignore invalid segment
        }
    }

    if (extracted.length > 0) {
        log.warning(`[URL Sanitizer] Detected concatenated URLs: "${trimmed}". Cleaned into: ${extracted.join(', ')}`);
        return extracted;
    }
    log.warning(`Skipping malformed URL: ${trimmed}`);
    return [];
}

/**
 * Parses, sanitizes, and deduplicates input target items.
 * Supports:
 *   1. Plain URL strings
 *   2. Apify requestList objects with optional `serpQuery` or `userData.serpQuery`
 *   3. Optional multi-line `serpQueryList` text (line-by-line index mapping or "URL | query" mapping)
 *
 * @param {Array<string|{url?: string, serpQuery?: string, userData?: {serpQuery?: string}}>} rawList
 * @param {string} [serpQueryListText=''] - Multi-line string with queries
 * @returns {Array<{url: string, serpQuery?: string}>} Clean target items with optional per-URL queries
 */
export function extractTargetItems(rawList, serpQueryListText = '') {
    if (!Array.isArray(rawList)) return [];

    const items = [];
    const seenUrls = new Set();

    for (const item of rawList) {
        let urlText = '';
        let serpQuery = '';

        if (typeof item === 'string') {
            urlText = item;
        } else if (item && typeof item === 'object') {
            urlText = item.url || '';
            serpQuery = (item.serpQuery || item.userData?.serpQuery || '').trim();
        }

        const validUrls = parseUrlSegments(urlText);
        for (const cleanUrl of validUrls) {
            if (!seenUrls.has(cleanUrl)) {
                seenUrls.add(cleanUrl);
                items.push({
                    url: cleanUrl,
                    ...(serpQuery ? { serpQuery } : {}),
                });
            } else if (serpQuery) {
                // If previously seen without query, update with the query
                const existing = items.find((i) => i.url === cleanUrl);
                if (existing && !existing.serpQuery) {
                    existing.serpQuery = serpQuery;
                }
            }
        }
    }

    // Process optional serpQueryListText if provided
    if (typeof serpQueryListText === 'string' && serpQueryListText.trim().length > 0) {
        const lines = serpQueryListText
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean);

        const urlQueryMap = new Map();
        const indexedQueries = [];

        for (const line of lines) {
            if (line.includes('|')) {
                const [targetPart, ...queryParts] = line.split('|');
                const cleanTarget = (targetPart || '').trim().toLowerCase();
                const cleanQuery = queryParts.join('|').trim();
                if (cleanTarget && cleanQuery) {
                    urlQueryMap.set(cleanTarget, cleanQuery);
                }
            } else {
                indexedQueries.push(line);
            }
        }

        // Apply line-by-line or URL-mapped queries to items that don't already have one
        for (let i = 0; i < items.length; i++) {
            if (items[i].serpQuery) continue; // Keep explicitly provided object query

            const itemUrlLower = items[i].url.toLowerCase();
            let matchedQuery = '';

            // Check direct URL or slug match in map
            for (const [targetKey, queryVal] of urlQueryMap.entries()) {
                if (itemUrlLower.includes(targetKey) || targetKey.includes(itemUrlLower)) {
                    matchedQuery = queryVal;
                    break;
                }
            }

            // Fallback to indexed mapping (Line 0 -> URL 0, Line 1 -> URL 1)
            if (!matchedQuery && i < indexedQueries.length && indexedQueries[i]) {
                matchedQuery = indexedQueries[i];
            }

            if (matchedQuery) {
                items[i].serpQuery = matchedQuery;
            }
        }
    }

    return items;
}

/**
 * Parses, sanitizes, and deduplicates input URLs.
 * Retains 100% backward compatibility by returning an array of string URLs.
 *
 * @param {Array<string|{url?: string}>} rawList
 * @returns {string[]} Array of clean, valid HTTP/HTTPS URLs
 */
export function extractAndSanitizeUrls(rawList) {
    const items = extractTargetItems(rawList);
    return items.map((i) => i.url);
}
