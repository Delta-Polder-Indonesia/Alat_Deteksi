    /* ===== UTILITIES ===== */

    // Jalur tunggal pelaporan error runtime. Semua kegagalan wajib lewat
    // sini supaya langsung terlihat di console browser dengan prefiks dan
    // konteks yang jelas — tidak ada error yang ditelan diam-diam.
    function logError(context, err) {
        console.error(`${LOG_PREFIX} ${context}:`, err);
    }

    // Bungkus event handler agar exception di dalamnya tercatat di console
    // (dengan konteks) dan tidak merembet mengganggu halaman host.
    function guard(context, fn) {
        return function (...args) {
            try {
                return fn.apply(this, args);
            } catch (err) {
                logError(context, err);
            }
        };
    }

    // Escape teks sebelum dimasukkan ke innerHTML/atribut HTML.
    // Wajib dipakai untuk semua data eksternal (input user, respons API).
    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function safeGetValue(key, defaultValue) {
        try {
            if (typeof GM_getValue !== 'function') return defaultValue;
            return GM_getValue(key, defaultValue);
        } catch (err) {
            logError('safeGetValue ' + key, err);
            return defaultValue;
        }
    }

    function safeSetValue(key, value) {
        try {
            if (typeof GM_setValue === 'function') {
                GM_setValue(key, value);
            }
        } catch (err) {
            logError('safeSetValue ' + key, err);
        }
    }

    function readJsonValue(key, defaultValue) {
        const raw = safeGetValue(key, null);
        if (raw === null || raw === undefined) return defaultValue;
        if (typeof raw !== 'string') return raw;
        try {
            return JSON.parse(raw);
        } catch (err) {
            logError('readJsonValue ' + key, err);
            return defaultValue;
        }
    }

    function writeJsonValue(key, value) {
        try {
            safeSetValue(key, JSON.stringify(value));
        } catch (err) {
            logError('writeJsonValue ' + key, err);
        }
    }

    function isValidTabName(tabName) {
        return tabName === 'database' || tabName === 'history' ||
            tabName === 'palette' || tabName === 'harmony' ||
            tabName === 'assets' || tabName === 'site-info';
    }

    function loadStoredActiveTab() {
        const tabName = safeGetValue(STORAGE_KEYS.activeTab, 'database');
        if (isValidTabName(tabName)) return tabName;
        logError('loadStoredActiveTab', new Error('Invalid stored tab: ' + tabName));
        return 'database';
    }

    function saveActiveTab(tabName) {
        if (isValidTabName(tabName)) {
            safeSetValue(STORAGE_KEYS.activeTab, tabName);
        }
    }

    function savePanelPosition(panel) {
        const rect = panel.getBoundingClientRect();
        writeJsonValue(STORAGE_KEYS.panelPosition, {
            left: Math.round(rect.left),
            top: Math.round(rect.top),
        });
    }

    function restorePanelPosition(panel) {
        const pos = readJsonValue(STORAGE_KEYS.panelPosition, null);
        if (!pos) return;
        const left = Number(pos.left);
        const top = Number(pos.top);
        if (!Number.isFinite(left) || !Number.isFinite(top)) {
            logError('restorePanelPosition', new Error('Invalid stored panel position'));
            return;
        }
        panel.style.left = Math.max(4, left) + 'px';
        panel.style.top = Math.max(4, top) + 'px';
        panel.style.right = 'auto';
    }

    function normalizeStoredHistoryItem(item) {
        if (!item || typeof item !== 'object') return null;
        const hex = normalizeHex(item.hex);
        if (!hex) return null;
        return {
            hex,
            name: String(item.name || 'Unknown'),
            time: String(item.time || ''),
            element: String(item.element || 'pixel'),
        };
    }

    function loadStoredHistory() {
        const stored = readJsonValue(STORAGE_KEYS.history, []);
        if (!Array.isArray(stored)) {
            logError('loadStoredHistory', new Error('Stored history is not an array'));
            return [];
        }
        return stored
            .map(normalizeStoredHistoryItem)
            .filter(Boolean)
            .slice(0, MAX_HISTORY_ITEMS);
    }

    function saveDetectionHistory() {
        writeJsonValue(STORAGE_KEYS.history, detectionHistory.slice(0, MAX_HISTORY_ITEMS));
    }

    function updateHistoryBadge() {
        const badge = document.getElementById('cdp-history-count');
        if (badge) badge.textContent = detectionHistory.length;
    }

    function hexToRgb(hex) {
        const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return r ? { r: parseInt(r[1],16), g: parseInt(r[2],16), b: parseInt(r[3],16) } : null;
    }

    function normalizeHex(hex) {
        const rgb = hexToRgb(hex);
        if (!rgb) return null;
        return '#' + [rgb.r, rgb.g, rgb.b]
            .map(x => x.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();
    }

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r,g,b), min = Math.min(r,g,b);
        let h, s, l = (max + min) / 2;
        if (max === min) { h = s = 0; }
        else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return { h: Math.round(h*360), s: Math.round(s*100), l: Math.round(l*100) };
    }

    function colorDistance(hex1, hex2) {
        const c1 = hexToRgb(hex1), c2 = hexToRgb(hex2);
        if (!c1 || !c2) return Infinity;
        return Math.sqrt((c1.r-c2.r)**2 + (c1.g-c2.g)**2 + (c1.b-c2.b)**2);
    }

    function findClosestColor(hex) {
        let closest = null, minDist = Infinity;
        for (const color of colorDatabase) {
            const dist = colorDistance(hex, color.Code);
            if (dist < minDist) { minDist = dist; closest = color; }
        }
        return closest;
    }

    function getElementColor(el) {
        const cs = window.getComputedStyle(el);
        let bg = cs.backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return rgbStringToHex(bg);
        let c = cs.color;
        if (c) return rgbStringToHex(c);
        return null;
    }

    function rgbStringToHex(rgb) {
        const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!m) return null;
        return '#' + [m[1],m[2],m[3]].map(x => parseInt(x, 10).toString(16).padStart(2,'0')).join('').toUpperCase();
    }

    function getContrastColor(hex) {
        const rgb = hexToRgb(hex);
        if (!rgb) return '#FFFFFF';
        return (0.299*rgb.r + 0.587*rgb.g + 0.114*rgb.b) / 255 > 0.5 ? '#1a1a2e' : '#FFFFFF';
    }

    function clampNumber(value, min, max) {
        const number = Number(value);
        if (!Number.isFinite(number)) return min;
        return Math.min(max, Math.max(min, number));
    }

    function srgbChannelToLinear(channel) {
        const value = channel / 255;
        return value <= 0.03928
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4;
    }

    function relativeLuminance(hex) {
        const rgb = hexToRgb(hex);
        if (!rgb) return null;
        return 0.2126 * srgbChannelToLinear(rgb.r) +
            0.7152 * srgbChannelToLinear(rgb.g) +
            0.0722 * srgbChannelToLinear(rgb.b);
    }

    function contrastRatio(hex1, hex2) {
        const l1 = relativeLuminance(hex1);
        const l2 = relativeLuminance(hex2);
        if (l1 === null || l2 === null) return NaN;
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    function contrastGrade(ratio) {
        if (!Number.isFinite(ratio)) return 'Fail';
        if (ratio >= 7) return 'AAA';
        if (ratio >= 4.5) return 'AA';
        return 'Fail';
    }

    function formatContrastRatio(hex, againstHex) {
        const ratio = contrastRatio(hex, againstHex);
        if (!Number.isFinite(ratio)) return '-';
        return `${ratio.toFixed(2)}:1 ${contrastGrade(ratio)}`;
    }

    function hslToRgb(h, s, l) {
        const hueValue = Number(h);
        const hue = Number.isFinite(hueValue) ? ((hueValue % 360) + 360) % 360 : 0;
        const saturation = clampNumber(s, 0, 100) / 100;
        const lightness = clampNumber(l, 0, 100) / 100;
        const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
        const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
        const m = lightness - chroma / 2;
        let rp = 0, gp = 0, bp = 0;

        if (hue < 60) {
            rp = chroma; gp = x;
        } else if (hue < 120) {
            rp = x; gp = chroma;
        } else if (hue < 180) {
            gp = chroma; bp = x;
        } else if (hue < 240) {
            gp = x; bp = chroma;
        } else if (hue < 300) {
            rp = x; bp = chroma;
        } else {
            rp = chroma; bp = x;
        }

        return {
            r: Math.round(clampNumber((rp + m) * 255, 0, 255)),
            g: Math.round(clampNumber((gp + m) * 255, 0, 255)),
            b: Math.round(clampNumber((bp + m) * 255, 0, 255)),
        };
    }

    function hslToHex(h, s, l) {
        const rgb = hslToRgb(h, s, l);
        return '#' + [rgb.r, rgb.g, rgb.b]
            .map(x => x.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();
    }

    // Timer disimpan agar toast beruntun tidak saling menutup lebih cepat
    // (timeout milik toast lama tidak boleh menyembunyikan toast baru).
    let toastTimer = null;

    function showToast(msg) {
        const t = document.getElementById('cdp-toast');
        t.textContent = msg;
        t.classList.add('cdp-toast-show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('cdp-toast-show'), 2000);
    }

    function copyToClipboardFallback(text, clipboardErr) {
        let ta = null;
        try {
            ta = document.createElement('textarea');
            ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(ta); ta.select();
            if (!document.execCommand('copy')) {
                throw new Error('document.execCommand returned false');
            }
            showToast('Copied: ' + text);
        } catch (fallbackErr) {
            logError('copyToClipboard fallback', { clipboardErr, fallbackErr });
            showToast('Copy failed');
        } finally {
            if (ta && ta.parentNode) ta.parentNode.removeChild(ta);
        }
    }

    function copyToClipboard(text) {
        if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
            copyToClipboardFallback(text, new Error('Clipboard API is not available'));
            return;
        }
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied: ' + text);
        }).catch((clipboardErr) => {
            logError('copyToClipboard clipboard API', clipboardErr);
            copyToClipboardFallback(text, clipboardErr);
        });
    }


    function isCdpElement(el) {
        return !!(el && typeof el.closest === 'function' &&
            (el.closest('#cdp-panel') || el.closest('#cdp-toggle-btn') ||
            el.closest('#cdp-cursor-tooltip') || el.closest('#cdp-toast') ||
            el.closest('#cdp-asset-action-popover')));
    }

    function isDataUri(value) {
        return typeof value === 'string' && value.trim().toLowerCase().startsWith('data:');
    }

    function isSvgUrl(value) {
        if (!value) return false;
        const raw = String(value).trim().toLowerCase();
        if (raw.startsWith('data:image/svg+xml')) return true;
        try {
            return new URL(raw, document.baseURI).pathname.toLowerCase().endsWith('.svg');
        } catch (err) {
            logError('isSvgUrl', err);
            return raw.includes('.svg');
        }
    }

    function absolutizeUrl(value) {
        if (!value) return '';
        const trimmed = String(value).trim();
        if (isDataUri(trimmed)) return trimmed;
        try {
            return new URL(trimmed, document.baseURI).href;
        } catch (err) {
            logError('absolutizeUrl', err);
            return trimmed;
        }
    }

    function parseSrcset(srcset) {
        if (!srcset || typeof srcset !== 'string') return [];
        const trimmed = srcset.trim();
        const parts = trimmed.toLowerCase().startsWith('data:')
            ? [trimmed]
            : trimmed.split(/,(?=\s*\S)/);
        return parts.map(part => {
            const tokens = part.trim().split(/\s+/);
            const url = tokens.shift();
            if (!url) return null;
            let score = 1;
            tokens.forEach(token => {
                const value = parseFloat(token);
                if (!Number.isFinite(value)) return;
                if (token.endsWith('w')) score = Math.max(score, value);
                else if (token.endsWith('x')) score = Math.max(score, value * 1000);
            });
            return { url: absolutizeUrl(url), score };
        }).filter(Boolean);
    }

    function bestSrcsetCandidate(srcset) {
        const candidates = parseSrcset(srcset);
        if (candidates.length === 0) return '';
        candidates.sort((a, b) => b.score - a.score);
        return candidates[0].url;
    }

    function getBestImageSource(img) {
        const candidates = [];
        const picture = img.closest('picture');
        if (picture) {
            picture.querySelectorAll('source[srcset]').forEach(source => {
                if (source.media && window.matchMedia && !window.matchMedia(source.media).matches) return;
                candidates.push(...parseSrcset(source.getAttribute('srcset')));
            });
        }
        candidates.push(...parseSrcset(img.getAttribute('srcset')));
        if (img.currentSrc) candidates.push({ url: absolutizeUrl(img.currentSrc), score: 0.5 });
        if (img.src) candidates.push({ url: absolutizeUrl(img.src), score: 0.1 });
        if (candidates.length === 0) return '';
        candidates.sort((a, b) => b.score - a.score);
        return candidates[0].url;
    }

    function extractCssUrl(backgroundImage) {
        if (!backgroundImage || backgroundImage === 'none') return '';
        const match = /url\((['"]?)(.*?)\1\)/i.exec(backgroundImage);
        return match ? absolutizeUrl(match[2]) : '';
    }

    function cleanFilenamePart(value) {
        return String(value || 'asset')
            .trim()
            .replace(/[\\/:*?"<>|]+/g, '-')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 80) || 'asset';
    }

    function dataUriMime(value) {
        const match = /^data:([^;,]+)/i.exec(String(value || ''));
        return match ? match[1].toLowerCase() : '';
    }

    function extensionFromMime(mime) {
        const normalized = String(mime || '').toLowerCase();
        if (normalized.includes('svg')) return 'svg';
        if (normalized.includes('jpeg')) return 'jpg';
        if (normalized.includes('png')) return 'png';
        if (normalized.includes('webp')) return 'webp';
        if (normalized.includes('gif')) return 'gif';
        if (normalized.includes('avif')) return 'avif';
        if (normalized.includes('bmp')) return 'bmp';
        return '';
    }

    function extensionFromUrl(url) {
        if (isDataUri(url)) return extensionFromMime(dataUriMime(url));
        try {
            const pathname = new URL(url, document.baseURI).pathname;
            const match = /\.([a-z0-9]{2,5})$/i.exec(pathname);
            return match ? match[1].toLowerCase() : '';
        } catch (err) {
            logError('extensionFromUrl', err);
            return '';
        }
    }

    function assetDefaultExtension(asset) {
        if (asset.svgCode || asset.kind === 'svg-inline' || asset.kind === 'sprite') return 'svg';
        return extensionFromUrl(asset.url) || extensionFromMime(asset.mime) || 'png';
    }

    function assetFilename(asset) {
        const ext = assetDefaultExtension(asset);
        const base = cleanFilenamePart(asset.name || asset.typeLabel || 'asset');
        return base.toLowerCase().endsWith('.' + ext) ? base : `${base}.${ext}`;
    }

    function bytesToLabel(bytes) {
        const value = Number(bytes);
        if (!Number.isFinite(value) || value < 0) return 'Unknown';
        if (value < 1024) return `${value} B`;
        if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
        return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    }

    function textByteLength(text) {
        try {
            if (typeof TextEncoder === 'function') {
                return new TextEncoder().encode(String(text)).length;
            }
        } catch (err) {
            logError('textByteLength', err);
        }
        return String(text).length;
    }

    function dataUriByteLength(uri) {
        try {
            const commaIndex = uri.indexOf(',');
            if (commaIndex === -1) return uri.length;
            const header = uri.slice(0, commaIndex).toLowerCase();
            const data = uri.slice(commaIndex + 1);
            if (header.includes(';base64')) {
                return Math.floor(data.replace(/=+$/g, '').length * 3 / 4);
            }
            return textByteLength(decodeURIComponent(data));
        } catch (err) {
            logError('dataUriByteLength', err);
            return uri.length;
        }
    }

    function dataUriToText(uri) {
        const commaIndex = uri.indexOf(',');
        if (commaIndex === -1) return '';
        const header = uri.slice(0, commaIndex).toLowerCase();
        const data = uri.slice(commaIndex + 1);
        try {
            return header.includes(';base64') ? atob(data) : decodeURIComponent(data);
        } catch (err) {
            logError('dataUriToText', err);
            return '';
        }
    }

    function svgDataUrl(svgCode) {
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgCode);
    }

    function serializeSvgElement(svg) {
        try {
            const clone = svg.cloneNode(true);
            if (!clone.getAttribute('xmlns')) {
                clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            }
            return new XMLSerializer().serializeToString(clone);
        } catch (err) {
            logError('serializeSvgElement', err);
            return '';
        }
    }

    function elementLabel(el) {
        if (!el || typeof el.getAttribute !== 'function') return '';
        return el.getAttribute('alt') || el.getAttribute('aria-label') ||
            el.getAttribute('title') || el.id || '';
    }

    function nameFromUrl(url) {
        if (!url || isDataUri(url)) return 'asset';
        try {
            const pathname = new URL(url, document.baseURI).pathname;
            const segment = pathname.split('/').filter(Boolean).pop() || 'asset';
            return decodeURIComponent(segment).replace(/\.[a-z0-9]{2,5}$/i, '') || 'asset';
        } catch (err) {
            logError('nameFromUrl', err);
            return 'asset';
        }
    }

    function assetDisplayName(el, url, fallback) {
        return cleanFilenamePart(elementLabel(el) || nameFromUrl(url) || fallback || 'asset');
    }

    function getSvgDimensions(svg) {
        const viewBox = svg.getAttribute('viewBox');
        if (viewBox) {
            const parts = viewBox.trim().split(/[\s,]+/).map(Number);
            if (parts.length === 4 && parts.every(Number.isFinite)) {
                return `${Math.round(parts[2])} x ${Math.round(parts[3])}`;
            }
        }
        const width = parseFloat(svg.getAttribute('width'));
        const height = parseFloat(svg.getAttribute('height'));
        if (Number.isFinite(width) && Number.isFinite(height)) {
            return `${Math.round(width)} x ${Math.round(height)}`;
        }
        const rect = svg.getBoundingClientRect();
        if (rect.width && rect.height) return `${Math.round(rect.width)} x ${Math.round(rect.height)}`;
        return 'Unknown';
    }

    function rectDimensions(el) {
        if (!el || typeof el.getBoundingClientRect !== 'function') return 'Unknown';
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return 'Unknown';
        return `${Math.round(rect.width)} x ${Math.round(rect.height)}`;
    }

    function useHref(useEl) {
        return useEl.getAttribute('href') ||
            useEl.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || '';
    }

    function splitUseReference(value) {
        if (!value) return { url: '', id: '' };
        const hashIndex = value.indexOf('#');
        if (hashIndex === -1) return { url: '', id: '' };
        const urlPart = value.slice(0, hashIndex);
        const id = value.slice(hashIndex + 1);
        return { url: urlPart ? absolutizeUrl(urlPart) : '', id };
    }

    function symbolToSvgCode(symbol, hostSvg) {
        if (!symbol) return '';
        const viewBox = symbol.getAttribute('viewBox') ||
            (hostSvg && hostSvg.getAttribute('viewBox')) || '0 0 24 24';
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${escapeHtml(viewBox)}">${symbol.innerHTML}</svg>`;
    }

    function resolveInlineUseSvg(useEl) {
        const reference = splitUseReference(useHref(useEl));
        if (!reference.id || reference.url) return '';
        const symbol = document.getElementById(reference.id);
        return symbolToSvgCode(symbol, useEl.closest('svg'));
    }

    async function resolveExternalUseSvg(asset) {
        const text = await fetchAssetText(asset.spriteUrl);
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        const symbol = doc.getElementById(asset.symbolId);
        if (!symbol) throw new Error('Symbol not found: ' + asset.symbolId);
        return symbolToSvgCode(symbol, null);
    }

    function assetTypeLabel(asset) {
        if (asset.kind === 'svg-inline') return 'SVG inline';
        if (asset.kind === 'svg-external') return 'SVG external';
        if (asset.kind === 'sprite') return 'Sprite';
        if (asset.kind === 'background') return 'Background image';
        if (asset.kind === 'video-poster') return 'Video poster';
        if (isDataUri(asset.url)) return 'Data URI image';
        return 'Image';
    }

    function assetBadge(asset) {
        if (asset.kind === 'sprite') return 'SPR';
        if (asset.kind === 'background') return 'BG';
        if (asset.kind === 'svg-inline' || asset.kind === 'svg-external') return 'SVG';
        return 'IMG';
    }

    function makeAsset(base) {
        const asset = Object.assign({
            id: '',
            selected: true,
            kind: 'img',
            typeLabel: '',
            badge: '',
            element: null,
            url: '',
            svgCode: '',
            spriteUrl: '',
            symbolId: '',
            name: '',
            dimensions: 'Unknown',
            sizeBytes: null,
            sizeLabel: 'Unknown',
            thumbnailUrl: '',
            mime: '',
        }, base);
        asset.typeLabel = asset.typeLabel || assetTypeLabel(asset);
        asset.badge = asset.badge || assetBadge(asset);
        asset.name = asset.name || assetDisplayName(asset.element, asset.url, asset.typeLabel);
        if (!asset.thumbnailUrl) {
            asset.thumbnailUrl = asset.svgCode ? svgDataUrl(asset.svgCode) : asset.url;
        }
        if (asset.sizeBytes === null) {
            if (asset.svgCode) asset.sizeBytes = textByteLength(asset.svgCode);
            else if (isDataUri(asset.url)) asset.sizeBytes = dataUriByteLength(asset.url);
        }
        asset.sizeLabel = asset.sizeBytes === null ? asset.sizeLabel : bytesToLabel(asset.sizeBytes);
        return asset;
    }

    function findUseElement(target) {
        if (!target || typeof target.closest !== 'function') return null;
        if (target.tagName && target.tagName.toLowerCase() === 'use') return target;
        const svg = target.closest('svg');
        return svg ? svg.querySelector('use') : null;
    }

    function assetFromUse(useEl) {
        const reference = splitUseReference(useHref(useEl));
        if (!reference.id) return null;
        const inlineCode = resolveInlineUseSvg(useEl);
        const hostSvg = useEl.closest('svg');
        return makeAsset({
            kind: 'sprite',
            element: hostSvg || useEl,
            url: reference.url ? `${reference.url}#${reference.id}` : '#' + reference.id,
            spriteUrl: reference.url,
            symbolId: reference.id,
            svgCode: inlineCode,
            name: assetDisplayName(hostSvg || useEl, reference.url, reference.id || 'sprite'),
            dimensions: hostSvg ? getSvgDimensions(hostSvg) : 'Unknown',
        });
    }

    function assetFromInlineSvg(svg) {
        return makeAsset({
            kind: 'svg-inline',
            element: svg,
            svgCode: serializeSvgElement(svg),
            name: assetDisplayName(svg, '', 'inline-svg'),
            dimensions: getSvgDimensions(svg),
        });
    }

    function assetFromImage(img) {
        const url = getBestImageSource(img);
        if (!url) return null;
        return makeAsset({
            kind: isSvgUrl(url) ? 'svg-external' : 'img',
            element: img,
            url,
            name: assetDisplayName(img, url, 'image'),
            dimensions: img.naturalWidth && img.naturalHeight
                ? `${img.naturalWidth} x ${img.naturalHeight}`
                : rectDimensions(img),
        });
    }

    function assetFromVideoPoster(video) {
        const url = absolutizeUrl(video.getAttribute('poster'));
        if (!url) return null;
        return makeAsset({
            kind: isSvgUrl(url) ? 'svg-external' : 'video-poster',
            element: video,
            url,
            name: assetDisplayName(video, url, 'video-poster'),
            dimensions: video.videoWidth && video.videoHeight
                ? `${video.videoWidth} x ${video.videoHeight}`
                : rectDimensions(video),
        });
    }

    function assetFromBackground(el) {
        const style = window.getComputedStyle(el);
        const url = extractCssUrl(style.backgroundImage);
        if (!url) return null;
        const position = style.backgroundPosition || '';
        const isSprite = position && position !== '0% 0%' && position !== '0px 0px';
        return makeAsset({
            kind: isSprite ? 'sprite' : isSvgUrl(url) ? 'svg-external' : 'background',
            element: el,
            url,
            name: assetDisplayName(el, url, isSprite ? 'sprite' : 'background'),
            dimensions: rectDimensions(el),
        });
    }

    function detectAssetFromElement(target) {
        if (!target || isCdpElement(target)) return null;
        const useEl = findUseElement(target);
        if (useEl && !isCdpElement(useEl)) {
            const useAsset = assetFromUse(useEl);
            if (useAsset) return useAsset;
        }
        const svg = target.closest && target.closest('svg');
        if (svg && !isCdpElement(svg)) return assetFromInlineSvg(svg);
        const img = target.closest && target.closest('img');
        if (img && !isCdpElement(img)) return assetFromImage(img);
        const video = target.closest && target.closest('video[poster]');
        if (video && !isCdpElement(video)) return assetFromVideoPoster(video);
        let el = target;
        while (el && el !== document.documentElement) {
            if (isCdpElement(el)) return null;
            if (el.nodeType === 1) {
                const asset = assetFromBackground(el);
                if (asset) return asset;
            }
            el = el.parentElement;
        }
        return null;
    }

    function gmRequest(options) {
        return new Promise((resolve, reject) => {
            try {
                if (typeof GM_xmlhttpRequest !== 'function') {
                    reject(new Error('GM_xmlhttpRequest is not available'));
                    return;
                }
                let settled = false;
                const timeoutMs = options.timeout || ASSET_FETCH_TIMEOUT_MS;
                const timer = setTimeout(() => {
                    if (settled) return;
                    settled = true;
                    reject(new Error('Request timed out: ' + options.url));
                }, timeoutMs + 1000);
                GM_xmlhttpRequest(Object.assign({}, options, {
                    timeout: timeoutMs,
                    onload(response) {
                        if (settled) return;
                        settled = true;
                        clearTimeout(timer);
                        resolve(response);
                    },
                    onerror(error) {
                        if (settled) return;
                        settled = true;
                        clearTimeout(timer);
                        reject(error || new Error('Request failed: ' + options.url));
                    },
                    ontimeout() {
                        if (settled) return;
                        settled = true;
                        clearTimeout(timer);
                        reject(new Error('Request timed out: ' + options.url));
                    },
                }));
            } catch (err) {
                reject(err);
            }
        });
    }

    async function fetchAssetText(url) {
        if (isDataUri(url)) return dataUriToText(url);
        const response = await gmRequest({ method: 'GET', url, timeout: ASSET_FETCH_TIMEOUT_MS });
        if (response.status < 200 || response.status >= 300) {
            throw new Error('HTTP status ' + response.status + ' for ' + url);
        }
        return response.responseText || '';
    }

    function headerValue(headers, name) {
        const pattern = new RegExp('^' + name + ':\\s*(.+)$', 'im');
        const match = pattern.exec(headers || '');
        return match ? match[1].trim() : '';
    }

    async function fetchAssetHeadMeta(asset) {
        if (!asset.url || isDataUri(asset.url)) return asset;
        try {
            const response = await gmRequest({ method: 'HEAD', url: asset.url, timeout: ASSET_FETCH_TIMEOUT_MS });
            if (response.status < 200 || response.status >= 400) {
                throw new Error('HTTP status ' + response.status + ' for ' + asset.url);
            }
            const length = parseInt(headerValue(response.responseHeaders, 'content-length'), 10);
            if (Number.isFinite(length)) {
                asset.sizeBytes = length;
                asset.sizeLabel = bytesToLabel(length);
            }
            const mime = headerValue(response.responseHeaders, 'content-type');
            if (mime && asset.kind !== 'svg-inline' && asset.kind !== 'sprite') {
                asset.mime = mime;
                if (mime.toLowerCase().includes('svg')) {
                    asset.kind = 'svg-external';
                    asset.typeLabel = assetTypeLabel(asset);
                    asset.badge = assetBadge(asset);
                }
            }
        } catch (err) {
            logError('fetchAssetHeadMeta', err);
        }
        return asset;
    }

    async function assetSvgCode(asset) {
        if (asset.svgCode) return asset.svgCode;
        if (asset.kind === 'sprite' && asset.spriteUrl && asset.symbolId) {
            return resolveExternalUseSvg(asset);
        }
        if (asset.url && (isSvgUrl(asset.url) || String(asset.mime || '').toLowerCase().includes('svg'))) {
            return fetchAssetText(asset.url);
        }
        return '';
    }

    function assetCanCopySvg(asset) {
        return !!(asset && (asset.svgCode || asset.kind === 'sprite' ||
            isSvgUrl(asset.url) || String(asset.mime || '').toLowerCase().includes('svg')));
    }

    async function copyAssetSvgCode(asset) {
        try {
            if (!assetCanCopySvg(asset)) {
                showToast('SVG code unavailable');
                return;
            }
            const svgCode = await assetSvgCode(asset);
            if (!svgCode) throw new Error('SVG code is empty');
            copyToClipboard(svgCode);
        } catch (err) {
            logError('copyAssetSvgCode', err);
            showToast('Copy SVG failed');
        }
    }

    async function assetDownloadUrl(asset) {
        if (asset.svgCode) return svgDataUrl(asset.svgCode);
        if (asset.kind === 'sprite' && asset.spriteUrl && asset.symbolId) {
            return svgDataUrl(await resolveExternalUseSvg(asset));
        }
        if (asset.url) return asset.url;
        throw new Error('Asset has no downloadable source');
    }

    function gmDownload(url, filename) {
        return new Promise((resolve, reject) => {
            try {
                if (typeof GM_download !== 'function') {
                    reject(new Error('GM_download is not available'));
                    return;
                }
                let settled = false;
                let handle = null;
                const timer = setTimeout(() => {
                    if (settled) return;
                    settled = true;
                    try {
                        if (handle && typeof handle.abort === 'function') handle.abort();
                    } catch (err) {
                        logError('gmDownload abort', err);
                    }
                    reject(new Error('Download timed out: ' + filename));
                }, ASSET_DOWNLOAD_TIMEOUT_MS);
                handle = GM_download({
                    url,
                    name: filename,
                    saveAs: false,
                    onload() {
                        if (settled) return;
                        settled = true;
                        clearTimeout(timer);
                        resolve();
                    },
                    onerror(error) {
                        if (settled) return;
                        settled = true;
                        clearTimeout(timer);
                        reject(error || new Error('Download failed: ' + filename));
                    },
                    ontimeout() {
                        if (settled) return;
                        settled = true;
                        clearTimeout(timer);
                        reject(new Error('Download timed out: ' + filename));
                    },
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    async function downloadAsset(asset) {
        try {
            const url = await assetDownloadUrl(asset);
            await gmDownload(url, assetFilename(asset));
            showToast('Downloaded: ' + assetFilename(asset));
        } catch (err) {
            logError('downloadAsset', err);
            showToast('Download failed');
            throw err;
        }
    }

    async function downloadAssetsSequential(assets) {
        if (isDownloadingAssets) return;
        isDownloadingAssets = true;
        try {
            for (const asset of assets) {
                try {
                    await downloadAsset(asset);
                } catch (err) {
                    logError('downloadAssetsSequential item', err);
                }
            }
        } catch (err) {
            logError('downloadAssetsSequential', err);
        } finally {
            isDownloadingAssets = false;
            if (activeTab === 'assets') renderCurrentTab();
        }
    }

    function assetKey(asset) {
        if (asset.kind === 'svg-inline') return 'inline:' + asset.svgCode;
        if (asset.kind === 'sprite') return 'sprite:' + asset.url + ':' + asset.symbolId;
        return asset.kind + ':' + (asset.url || asset.name);
    }

    function collectPageAssetCandidates() {
        const map = new Map();
        function add(asset) {
            if (!asset) return;
            const key = assetKey(asset);
            if (!map.has(key)) map.set(key, asset);
        }

        document.querySelectorAll('svg').forEach(svg => {
            if (isCdpElement(svg)) return;
            add(assetFromInlineSvg(svg));
            svg.querySelectorAll('use').forEach(useEl => add(assetFromUse(useEl)));
        });
        document.querySelectorAll('img').forEach(img => {
            if (!isCdpElement(img)) add(assetFromImage(img));
        });
        document.querySelectorAll('picture source[srcset]').forEach(source => {
            if (isCdpElement(source) || source.closest('picture')?.querySelector('img')) return;
            const url = bestSrcsetCandidate(source.getAttribute('srcset'));
            if (!url) return;
            add(makeAsset({
                kind: isSvgUrl(url) ? 'svg-external' : 'img',
                element: source,
                url,
                name: assetDisplayName(source, url, 'picture-source'),
                dimensions: 'Unknown',
            }));
        });
        document.querySelectorAll('video[poster]').forEach(video => {
            if (!isCdpElement(video)) add(assetFromVideoPoster(video));
        });
        document.querySelectorAll('body *').forEach(el => {
            if (!isCdpElement(el)) add(assetFromBackground(el));
        });

        return Array.from(map.values()).map((asset, index) => {
            asset.id = 'asset-' + index;
            return asset;
        });
    }

    async function scanPageAssets() {
        if (isScanningAssets) return;
        isScanningAssets = true;
        pageAssets = [];
        renderCurrentTab();
        try {
            pageAssets = collectPageAssetCandidates();
            for (const asset of pageAssets) {
                await fetchAssetHeadMeta(asset);
            }
            showToast(pageAssets.length + ' assets found');
        } catch (err) {
            logError('scanPageAssets', err);
            showToast('Asset scan failed');
        } finally {
            isScanningAssets = false;
            if (activeTab === 'assets') renderCurrentTab();
        }
    }

    function elementDescriptor(el) {
        if (!el || !el.tagName) return 'element';
        const tag = el.tagName.toLowerCase();
        const id = el.id ? '#' + cleanFilenamePart(el.id) : '';
        const classText = typeof el.className === 'string'
            ? el.className
            : (el.getAttribute && el.getAttribute('class')) || '';
        const classes = classText.trim().split(/\s+/).filter(Boolean).slice(0, 3)
            .map(name => '.' + cleanFilenamePart(name)).join('');
        return tag + id + classes;
    }

    function inspectCssValue(style, property) {
        if (property === 'background') {
            const bgImage = style.backgroundImage;
            if (bgImage && bgImage !== 'none') return style.background;
            return style.backgroundColor;
        }
        return style.getPropertyValue(property) || '';
    }

    function inspectDataFromElement(el) {
        const style = window.getComputedStyle(el);
        const rows = INSPECT_CSS_PROPERTIES.map(property => ({
            property,
            value: inspectCssValue(style, property).trim() || 'initial',
        }));
        return {
            element: el,
            title: elementDescriptor(el),
            subtitle: rectDimensions(el),
            rows,
            cssText: rows.map(row => `${row.property}: ${row.value};`).join('\n'),
        };
    }

    function normalizeFontName(name) {
        return String(name || '')
            .trim()
            .replace(/^['"]|['"]$/g, '')
            .trim();
    }

    function splitFontFamily(value) {
        if (!value) return [];
        return String(value).split(',')
            .map(normalizeFontName)
            .filter(Boolean);
    }

    function elementTextSample(el) {
        if (!el || !el.textContent) return '';
        return el.textContent.replace(/\s+/g, ' ').trim().slice(0, 90);
    }

    function normalizeCssColor(value) {
        if (!value || value === 'transparent') return '';
        const match = /rgba?\(([^)]+)\)/i.exec(value);
        if (!match) return '';
        const parts = match[1].split(',').map(part => part.trim());
        if (parts.length < 3) return '';
        const alpha = parts.length >= 4 ? parseFloat(parts[3]) : 1;
        if (Number.isFinite(alpha) && alpha <= 0) return '';
        const channels = parts.slice(0, 3).map(part => {
            if (part.endsWith('%')) {
                return Math.round(clampNumber(parseFloat(part), 0, 100) * 2.55);
            }
            return Math.round(clampNumber(parseFloat(part), 0, 255));
        });
        if (channels.some(channel => !Number.isFinite(channel))) return '';
        return '#' + channels.map(channel => channel.toString(16).padStart(2, '0')).join('').toUpperCase();
    }

    function scanClassEvidence(el, evidence) {
        const classText = typeof el.className === 'string'
            ? el.className
            : (el.getAttribute && el.getAttribute('class')) || '';
        if (!classText) return;
        const classes = classText.split(/\s+/).filter(Boolean);
        classes.forEach(name => {
            if (/^(flex|grid|block|inline-block|hidden|container|text-|bg-|p[trblxy]?-[\w/.-]+|m[trblxy]?-[\w/.-]+|w-[\w/.-]+|h-[\w/.-]+|rounded|shadow|font-|items-|justify-|gap-|space-|border-|leading-|tracking-)/.test(name)) {
                evidence.tailwind += 1;
            }
            if (/^(container|row|col(?:-|$)|btn(?:-|$)|navbar|card|alert|modal|badge|d-flex|text-|bg-|mt-|mb-|ms-|me-|pt-|pb-|ps-|pe-)/.test(name)) {
                evidence.bootstrap += 1;
            }
        });
    }

    function scanDomFrameworkEvidence(el, evidence) {
        try {
            if (Object.keys(el).some(key => key.startsWith('__reactFiber') || key.startsWith('__reactProps'))) {
                evidence.reactDom += 1;
            }
        } catch (err) {
            logError('scanDomFrameworkEvidence React', err);
        }
        if (el.hasAttribute && (el.hasAttribute('data-v-app') || el.hasAttribute('data-reactroot'))) {
            if (el.hasAttribute('data-v-app')) evidence.vueDom += 1;
            if (el.hasAttribute('data-reactroot')) evidence.reactDom += 1;
        }
        if (el.attributes) {
            for (const attr of el.attributes) {
                if (/^data-v-[a-z0-9]+$/i.test(attr.name)) {
                    evidence.vueDom += 1;
                    break;
                }
            }
        }
    }

    function addTechnology(items, name, evidence, confidence) {
        if (!evidence) return;
        items.push({ name, evidence, confidence });
    }

    function confidenceFromCount(count, high, medium) {
        if (count >= high) return 'High';
        if (count >= medium) return 'Medium';
        return 'Low';
    }

    function detectTechnologies(evidence) {
        const items = [];
        addTechnology(items, 'Tailwind CSS', `${evidence.tailwind} utility-like classes`,
            evidence.tailwind >= 8 ? confidenceFromCount(evidence.tailwind, 80, 25) : '');
        addTechnology(items, 'Bootstrap', `${evidence.bootstrap} Bootstrap-like classes`,
            evidence.bootstrap >= 4 ? confidenceFromCount(evidence.bootstrap, 45, 15) : '');
        addTechnology(items, 'React', evidence.reactGlobal ? 'React global detected' : `${evidence.reactDom} React DOM markers`,
            evidence.reactGlobal || evidence.reactDom > 0 ? (evidence.reactGlobal ? 'High' : 'Medium') : '');
        addTechnology(items, 'Vue', evidence.vueGlobal ? 'Vue global detected' : `${evidence.vueDom} Vue DOM markers`,
            evidence.vueGlobal || evidence.vueDom > 0 ? (evidence.vueGlobal ? 'High' : 'Medium') : '');
        addTechnology(items, 'jQuery', evidence.jqueryGlobal, evidence.jqueryGlobal ? 'High' : '');
        addTechnology(items, 'Next.js', evidence.nextEvidence, evidence.nextEvidence ? 'High' : '');
        if (evidence.generator) {
            addTechnology(items, 'CMS or generator', evidence.generator, 'Medium');
        }
        return items.filter(item => item.confidence);
    }

    function readRootCustomProperties() {
        const tokens = [];
        try {
            const rootStyle = window.getComputedStyle(document.documentElement);
            for (let i = 0; i < rootStyle.length; i += 1) {
                const name = rootStyle[i];
                if (!name || !name.startsWith('--')) continue;
                const value = rootStyle.getPropertyValue(name).trim();
                if (!value) continue;
                tokens.push({ name, value });
            }
        } catch (err) {
            logError('readRootCustomProperties', err);
        }
        return tokens.sort((a, b) => a.name.localeCompare(b.name));
    }

    function getFontFaceStatusMap() {
        const map = new Map();
        try {
            if (document.fonts && typeof document.fonts.forEach === 'function') {
                document.fonts.forEach(face => {
                    const family = normalizeFontName(face.family);
                    if (!family) return;
                    map.set(family.toLowerCase(), face.status || 'known');
                });
            }
        } catch (err) {
            logError('getFontFaceStatusMap', err);
        }
        return map;
    }

    function waitForNextScanBatch() {
        return new Promise(resolve => setTimeout(resolve, 0));
    }

    async function scanSiteInfo() {
        if (isScanningSiteInfo) return;
        isScanningSiteInfo = true;
        siteInfo = {
            fonts: [],
            colors: [],
            tokens: [],
            technologies: [],
            scannedCount: 0,
            limitReached: false,
            scannedAt: null,
        };
        renderCurrentTab();
        try {
            const fontMap = new Map();
            const colorMap = new Map();
            const evidence = {
                tailwind: 0,
                bootstrap: 0,
                reactDom: 0,
                vueDom: 0,
                reactGlobal: !!window.React,
                vueGlobal: !!window.Vue,
                jqueryGlobal: window.jQuery && window.jQuery.fn
                    ? 'jQuery ' + window.jQuery.fn.jquery
                    : '',
                nextEvidence: window.__NEXT_DATA__ || document.getElementById('__next') || document.querySelector('script[src*="/_next/"]')
                    ? 'Next.js marker detected'
                    : '',
                generator: '',
            };
            const generatorMeta = document.querySelector('meta[name="generator"], meta[property="generator"]');
            if (generatorMeta) evidence.generator = generatorMeta.getAttribute('content') || 'Generator meta tag detected';

            const elements = document.body ? document.body.getElementsByTagName('*') : [];
            const limit = Math.min(elements.length, SITE_SCAN_ELEMENT_LIMIT);
            siteInfo.limitReached = elements.length > limit;
            const fontFaceStatus = getFontFaceStatusMap();

            for (let index = 0; index < limit; index += SITE_SCAN_BATCH_SIZE) {
                const end = Math.min(index + SITE_SCAN_BATCH_SIZE, limit);
                for (let i = index; i < end; i += 1) {
                    const el = elements[i];
                    if (!el || isCdpElement(el)) continue;
                    let style = null;
                    try {
                        style = window.getComputedStyle(el);
                    } catch (err) {
                        logError('scanSiteInfo computed style', err);
                        continue;
                    }
                    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

                    scanClassEvidence(el, evidence);
                    scanDomFrameworkEvidence(el, evidence);

                    const sample = elementTextSample(el);
                    splitFontFamily(style.fontFamily).forEach(font => {
                        const key = font.toLowerCase();
                        const current = fontMap.get(key) || {
                            name: font,
                            count: 0,
                            sample: '',
                            status: fontFaceStatus.get(key) || '',
                        };
                        current.count += 1;
                        if (!current.sample && sample) current.sample = sample;
                        if (!current.status && fontFaceStatus.has(key)) current.status = fontFaceStatus.get(key);
                        fontMap.set(key, current);
                    });

                    ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'].forEach(prop => {
                        const hex = normalizeCssColor(style[prop]);
                        if (!hex) return;
                        const current = colorMap.get(hex) || { hex, count: 0 };
                        current.count += 1;
                        colorMap.set(hex, current);
                    });
                }
                siteInfo.scannedCount = end;
                if (activeTab === 'site-info') renderCurrentTab();
                await waitForNextScanBatch();
            }

            siteInfo = {
                fonts: Array.from(fontMap.values()).sort((a, b) => b.count - a.count),
                colors: Array.from(colorMap.values()).sort((a, b) => b.count - a.count),
                tokens: readRootCustomProperties(),
                technologies: detectTechnologies(evidence),
                scannedCount: limit,
                limitReached: elements.length > limit,
                scannedAt: new Date().toLocaleTimeString(),
            };
            showToast('Site info scan complete');
        } catch (err) {
            logError('scanSiteInfo', err);
            showToast('Site info scan failed');
        } finally {
            isScanningSiteInfo = false;
            if (activeTab === 'site-info') renderCurrentTab();
        }
    }
