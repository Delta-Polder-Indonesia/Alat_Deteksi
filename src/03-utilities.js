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
            tabName === 'palette' || tabName === 'harmony';
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

