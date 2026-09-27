// ==UserScript==
// @name         Color Detector Pro — Real-Time Color Inspector
// @namespace    https://github.com/JD-YH03D/release
// @version      2.2.0
// @description  Real-time color detection on any web page. Hover over any element to identify colors & hex codes. Professional panel with 500+ color database.
// @author       Bintang Toba Pro Team
// @license      MIT
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      api.npoint.io
// @run-at       document-idle
// @icon         https://raw.githubusercontent.com/JD-YH03D/BintangToba/main/icon.svg
// @updateURL    https://raw.githubusercontent.com/Delta-Polder-Indonesia/Alat_Deteksi/main/dist/ColorDetektor.user.js
// @downloadURL  https://raw.githubusercontent.com/Delta-Polder-Indonesia/Alat_Deteksi/main/dist/ColorDetektor.user.js
// ==/UserScript==

(function () {
    'use strict';

    /* ===== CONFIG ===== */
    const API_URL = 'https://api.npoint.io/a54d755ded5ab6c0e7d1';
    const LOG_PREFIX = '[Color Detector Pro]';
    let colorDatabase = [];
    let isPanelOpen = false;
    let isDetecting = false;
    let isPanelMinimized = false;
    let currentHighlight = null;
    let detectionHistory = [];

    /* ===== STYLES ===== */
    GM_addStyle(`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        :root {
            --cdp-primary: #667eea;
            --cdp-primary-dark: #5a67d8;
            --cdp-secondary: #764ba2;
            --cdp-accent: #f093fb;
            --cdp-bg-dark: #0f0f23;
            --cdp-bg-card: #1a1a2e;
            --cdp-bg-card-alt: #16213e;
            --cdp-text-primary: #e2e8f0;
            --cdp-text-secondary: #a0aec0;
            --cdp-text-muted: #718096;
            --cdp-border: rgba(102, 126, 234, 0.2);
            --cdp-glow: rgba(102, 126, 234, 0.4);
            --cdp-success: #48bb78;
            --cdp-warning: #ed8936;
            --cdp-danger: #fc8181;
            --cdp-radius: 14px;
            --cdp-transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ----- PANEL ----- */
        #cdp-panel {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 420px;
            max-height: 92vh;
            background: var(--cdp-bg-dark);
            border: 1px solid var(--cdp-border);
            border-radius: var(--cdp-radius);
            box-shadow:
                0 0 0 1px rgba(102,126,234,0.1),
                0 20px 60px rgba(0,0,0,0.5),
                0 0 40px rgba(102,126,234,0.08);
            z-index: 2147483647;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            color: var(--cdp-text-primary);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transition: var(--cdp-transition);
            backdrop-filter: blur(20px);
            animation: cdp-slideIn 0.4s cubic-bezier(0.16,1,0.3,1);
        }

        #cdp-panel.cdp-minimized {
            width: 420px;
            max-height: 60px;
            min-height: 60px;
            overflow: hidden;
        }

        #cdp-panel.cdp-hidden {
            transform: translateX(500px);
            opacity: 0;
            pointer-events: none;
        }

        @keyframes cdp-slideIn {
            from { transform: translateX(100px) scale(0.95); opacity: 0; }
            to   { transform: translateX(0) scale(1); opacity: 1; }
        }
        @keyframes cdp-pulse {
            0%,100% { box-shadow: 0 0 0 0 rgba(72,187,120,0.4); }
            50%     { box-shadow: 0 0 0 8px rgba(72,187,120,0); }
        }
        @keyframes cdp-fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cdp-shimmer {
            0%   { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }

        /* ----- HEADER ----- */
        #cdp-header {
            padding: 14px 18px;
            background: linear-gradient(135deg, var(--cdp-primary), var(--cdp-secondary));
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: grab;
            user-select: none;
            flex-shrink: 0;
            position: relative;
            overflow: hidden;
        }
        #cdp-header:active,
        #cdp-header.cdp-dragging {
            cursor: grabbing;
        }
        #cdp-header::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
            background-size: 200% 100%;
            animation: cdp-shimmer 3s infinite;
        }
        #cdp-header-left {
            display: flex;
            align-items: center;
            gap: 10px;
            position: relative;
            z-index: 1;
        }
        #cdp-logo {
            width: 32px; height: 32px;
            background: rgba(255,255,255,0.2);
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            font-size: 18px;
            backdrop-filter: blur(10px);
        }
        #cdp-title {
            font-size: 15px; font-weight: 700; color: #fff; letter-spacing: -0.3px;
        }
        #cdp-version {
            font-size: 10px;
            background: rgba(255,255,255,0.2);
            color: rgba(255,255,255,0.9);
            padding: 2px 7px; border-radius: 20px; font-weight: 600;
        }
        #cdp-header-actions {
            display: flex; gap: 6px;
            position: relative; z-index: 1;
        }
        .cdp-header-btn {
            width: 28px; height: 28px;
            border: none; border-radius: 8px;
            background: rgba(255,255,255,0.15);
            color: #fff; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            font-size: 14px;
            transition: var(--cdp-transition);
            backdrop-filter: blur(10px);
        }
        .cdp-header-btn:hover {
            background: rgba(255,255,255,0.3);
            transform: scale(1.1);
        }

        /* ----- TOOLBAR ----- */
        #cdp-toolbar {
            padding: 12px 18px;
            background: var(--cdp-bg-card);
            border-bottom: 1px solid var(--cdp-border);
            display: flex; align-items: center; gap: 10px;
            flex-shrink: 0;
        }
        #cdp-detect-btn {
            flex: 1;
            padding: 10px 16px; border: none; border-radius: 10px;
            font-family: inherit; font-size: 13px; font-weight: 600;
            cursor: pointer; transition: var(--cdp-transition);
            display: flex; align-items: center; justify-content: center;
            gap: 8px; letter-spacing: 0.3px;
        }
        #cdp-detect-btn.cdp-inactive {
            background: linear-gradient(135deg, var(--cdp-primary), var(--cdp-secondary));
            color: #fff;
            box-shadow: 0 4px 15px rgba(102,126,234,0.3);
        }
        #cdp-detect-btn.cdp-inactive:hover {
            box-shadow: 0 6px 25px rgba(102,126,234,0.5);
            transform: translateY(-1px);
        }
        #cdp-detect-btn.cdp-active {
            background: linear-gradient(135deg, var(--cdp-success), #38a169);
            color: #fff;
            animation: cdp-pulse 2s infinite;
        }
        #cdp-clear-btn {
            padding: 10px 14px;
            border: 1px solid var(--cdp-border);
            border-radius: 10px;
            background: transparent;
            color: var(--cdp-text-secondary);
            font-family: inherit; font-size: 13px; font-weight: 500;
            cursor: pointer; transition: var(--cdp-transition);
        }
        #cdp-clear-btn:hover {
            background: rgba(252,129,129,0.1);
            border-color: var(--cdp-danger);
            color: var(--cdp-danger);
        }

        /* ----- DETECTOR DISPLAY ----- */
        #cdp-detector-display {
            padding: 18px;
            background: var(--cdp-bg-card-alt);
            border-bottom: 1px solid var(--cdp-border);
            flex-shrink: 0;
        }
        #cdp-color-preview-area {
            display: flex; gap: 16px; align-items: stretch;
        }
        #cdp-big-swatch {
            width: 90px; height: 90px;
            border-radius: 14px;
            border: 3px solid rgba(255,255,255,0.1);
            flex-shrink: 0;
            transition: var(--cdp-transition);
            position: relative; overflow: hidden;
            background: repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 16px 16px;
        }
        #cdp-big-swatch-inner {
            position: absolute; inset: 0;
            border-radius: 11px;
            transition: background-color 0.15s ease;
        }
        #cdp-color-info {
            flex: 1; display: flex; flex-direction: column;
            justify-content: center; gap: 6px;
        }
        #cdp-color-name {
            font-size: 18px; font-weight: 700; color: #fff;
            letter-spacing: -0.3px; line-height: 1.2;
        }
        #cdp-color-hex {
            font-size: 22px; font-weight: 800;
            font-family: 'SF Mono','Cascadia Code','Fira Code', monospace;
            letter-spacing: 1px;
        }
        #cdp-color-rgb {
            font-size: 12px; color: var(--cdp-text-muted);
            font-family: 'SF Mono', monospace;
        }
        #cdp-color-hsl {
            font-size: 12px; color: var(--cdp-text-muted);
            font-family: 'SF Mono', monospace;
        }
        .cdp-copy-hint {
            font-size: 10px; color: var(--cdp-text-muted);
            margin-top: 2px; opacity: 0.7;
        }

        /* ----- TABS ----- */
        #cdp-tabs {
            display: flex;
            background: var(--cdp-bg-card);
            border-bottom: 1px solid var(--cdp-border);
            flex-shrink: 0;
        }
        .cdp-tab {
            flex: 1; padding: 11px 0;
            border: none; background: transparent;
            color: var(--cdp-text-muted);
            font-family: inherit; font-size: 12px; font-weight: 600;
            cursor: pointer; transition: var(--cdp-transition);
            position: relative;
            display: flex; align-items: center; justify-content: center;
            gap: 6px; letter-spacing: 0.3px; text-transform: uppercase;
        }
        .cdp-tab:hover {
            color: var(--cdp-text-primary);
            background: rgba(102,126,234,0.05);
        }
        .cdp-tab.cdp-tab-active { color: var(--cdp-primary); }
        .cdp-tab.cdp-tab-active::after {
            content: '';
            position: absolute; bottom: 0; left: 20%; right: 20%; height: 2px;
            background: linear-gradient(90deg, var(--cdp-primary), var(--cdp-secondary));
            border-radius: 2px 2px 0 0;
        }
        .cdp-tab-badge {
            font-size: 10px;
            background: rgba(102,126,234,0.2);
            color: var(--cdp-primary);
            padding: 1px 6px; border-radius: 10px; font-weight: 700;
        }

        /* ----- SEARCH ----- */
        #cdp-search-box {
            padding: 12px 18px;
            background: var(--cdp-bg-card);
            border-bottom: 1px solid var(--cdp-border);
            flex-shrink: 0;
        }
        #cdp-search-input {
            width: 100%;
            padding: 10px 14px 10px 38px;
            border: 1px solid var(--cdp-border);
            border-radius: 10px;
            background: var(--cdp-bg-dark);
            color: var(--cdp-text-primary);
            font-family: inherit; font-size: 13px;
            outline: none; transition: var(--cdp-transition);
            box-sizing: border-box;
        }
        #cdp-search-input:focus {
            border-color: var(--cdp-primary);
            box-shadow: 0 0 0 3px rgba(102,126,234,0.15);
        }
        #cdp-search-input::placeholder { color: var(--cdp-text-muted); }
        #cdp-search-wrapper { position: relative; }
        #cdp-search-icon {
            position: absolute; left: 12px; top: 50%;
            transform: translateY(-50%);
            display: flex; align-items: center;
            color: var(--cdp-text-muted); font-size: 14px; pointer-events: none;
        }

        /* ----- PALETTE ----- */
        .cdp-palette-grid {
            display: flex; flex-wrap: wrap; gap: 6px; padding: 12px 18px;
        }
        .cdp-palette-swatch {
            width: 54px; height: 54px; border-radius: 12px;
            border: 2px solid rgba(255,255,255,0.1);
            display: flex; align-items: center; justify-content: center;
            font-size: 9px; font-family: monospace; font-weight: 700;
            cursor: pointer; transition: transform 0.2s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .cdp-palette-swatch:hover { transform: scale(1.15); }

        /* ----- COLOR LIST ----- */
        #cdp-color-list-container {
            flex: 1; overflow-y: auto; min-height: 0;
            scrollbar-width: thin;
            scrollbar-color: var(--cdp-primary) transparent;
        }
        #cdp-color-list-container::-webkit-scrollbar { width: 6px; }
        #cdp-color-list-container::-webkit-scrollbar-track { background: transparent; }
        #cdp-color-list-container::-webkit-scrollbar-thumb {
            background: var(--cdp-primary); border-radius: 10px;
        }

        .cdp-color-item {
            display: flex; align-items: center; gap: 12px;
            padding: 10px 18px; cursor: pointer;
            transition: var(--cdp-transition);
            border-bottom: 1px solid rgba(255,255,255,0.03);
            animation: cdp-fadeIn 0.3s ease;
        }
        .cdp-color-item:hover { background: rgba(102,126,234,0.08); }
        .cdp-color-item:active { background: rgba(102,126,234,0.15); }

        .cdp-color-swatch {
            width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
            border: 2px solid rgba(255,255,255,0.08);
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: var(--cdp-transition);
        }
        .cdp-color-item:hover .cdp-color-swatch {
            transform: scale(1.12);
            border-color: rgba(255,255,255,0.2);
        }
        .cdp-color-item-info { flex: 1; min-width: 0; }
        .cdp-color-item-name {
            font-size: 13px; font-weight: 600; color: var(--cdp-text-primary);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cdp-color-item-code {
            font-size: 12px;
            font-family: 'SF Mono', monospace;
            color: var(--cdp-text-muted); margin-top: 2px;
        }
        .cdp-color-item-copy {
            padding: 5px 10px;
            border: 1px solid var(--cdp-border);
            border-radius: 6px; background: transparent;
            color: var(--cdp-text-muted);
            font-family: inherit; font-size: 11px;
            cursor: pointer; transition: var(--cdp-transition);
            opacity: 0; flex-shrink: 0;
        }
        .cdp-color-item:hover .cdp-color-item-copy { opacity: 1; }
        .cdp-color-item-copy:hover {
            background: var(--cdp-primary);
            border-color: var(--cdp-primary);
            color: #fff;
        }

        /* ----- HISTORY ----- */
        .cdp-history-time {
            font-size: 10px; color: var(--cdp-text-muted);
            flex-shrink: 0; font-family: monospace;
        }

        /* ----- FOOTER ----- */
        #cdp-footer {
            padding: 10px 18px;
            background: var(--cdp-bg-card);
            border-top: 1px solid var(--cdp-border);
            display: flex; align-items: center; justify-content: space-between;
            flex-shrink: 0;
        }
        #cdp-footer-left {
            font-size: 10px; color: var(--cdp-text-muted);
            display: flex; align-items: center; gap: 6px;
        }
        #cdp-status-dot {
            width: 7px; height: 7px; border-radius: 50%;
            background: var(--cdp-success);
            box-shadow: 0 0 6px rgba(72,187,120,0.5);
        }
        #cdp-footer-right {
            font-size: 10px; color: var(--cdp-text-muted);
        }

        /* ----- TOGGLE BUTTON ----- */
        #cdp-toggle-btn {
            position: fixed; bottom: 24px; right: 24px;
            width: 56px; height: 56px; border-radius: 16px;
            border: none;
            background: linear-gradient(135deg, var(--cdp-primary), var(--cdp-secondary));
            color: #fff; font-size: 24px; cursor: pointer;
            z-index: 2147483646;
            box-shadow: 0 8px 32px rgba(102,126,234,0.4), 0 0 0 1px rgba(102,126,234,0.2);
            transition: var(--cdp-transition);
            display: flex; align-items: center; justify-content: center;
        }
        #cdp-toggle-btn:hover {
            transform: scale(1.1) rotate(10deg);
            box-shadow: 0 12px 40px rgba(102,126,234,0.6), 0 0 0 1px rgba(102,126,234,0.3);
        }
        #cdp-toggle-btn.cdp-detecting {
            animation: cdp-pulse 1.5s infinite;
            background: linear-gradient(135deg, var(--cdp-success), #38a169);
        }

        /* ----- TOOLTIP ----- */
        #cdp-cursor-tooltip {
            position: fixed;
            padding: 8px 14px;
            background: rgba(15,15,35,0.95);
            border: 1px solid var(--cdp-border);
            border-radius: 10px;
            z-index: 2147483647;
            pointer-events: none;
            font-family: 'Inter', sans-serif;
            backdrop-filter: blur(20px);
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            display: none;
            transition: opacity 0.15s ease;
        }
        #cdp-cursor-tooltip.cdp-tooltip-visible {
            display: flex; align-items: center; gap: 10px;
        }
        #cdp-tooltip-swatch {
            width: 28px; height: 28px; border-radius: 6px;
            border: 2px solid rgba(255,255,255,0.15); flex-shrink: 0;
        }
        #cdp-tooltip-info { display: flex; flex-direction: column; }
        #cdp-tooltip-name { font-size: 12px; font-weight: 600; color: #fff; }
        #cdp-tooltip-hex { font-size: 11px; color: var(--cdp-text-muted); font-family: monospace; }

        /* ----- HIGHLIGHT ----- */
        .cdp-element-highlight {
            outline: 2px dashed var(--cdp-primary) !important;
            outline-offset: 2px !important;
            transition: outline 0.1s ease !important;
        }

        /* ----- TOAST ----- */
        #cdp-toast {
            position: fixed; bottom: 90px; right: 24px;
            padding: 10px 20px;
            background: rgba(15,15,35,0.95);
            border: 1px solid var(--cdp-success);
            border-radius: 10px;
            color: var(--cdp-success);
            font-family: 'Inter', sans-serif;
            font-size: 13px; font-weight: 600;
            z-index: 2147483647; pointer-events: none;
            opacity: 0; transform: translateY(10px);
            transition: all 0.3s ease;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        #cdp-toast.cdp-toast-show { opacity: 1; transform: translateY(0); }

        /* ----- LOADING ----- */
        .cdp-loading-spinner {
            width: 40px; height: 40px;
            border: 3px solid var(--cdp-border);
            border-top-color: var(--cdp-primary);
            border-radius: 50%;
            animation: cdp-spin 0.8s linear infinite;
            margin: 40px auto;
        }
        @keyframes cdp-spin { to { transform: rotate(360deg); } }

        .cdp-empty-state {
            text-align: center; padding: 40px 20px;
            color: var(--cdp-text-muted);
        }
        .cdp-empty-state-icon { font-size: 40px; margin-bottom: 12px; }
        .cdp-empty-state-text { font-size: 13px; line-height: 1.5; }

        .cdp-category-header {
            padding: 8px 18px;
            background: rgba(102,126,234,0.05);
            border-bottom: 1px solid var(--cdp-border);
            font-size: 11px; font-weight: 700;
            color: var(--cdp-primary);
            text-transform: uppercase; letter-spacing: 1px;
            position: sticky; top: 0; z-index: 5;
            backdrop-filter: blur(10px);
        }

        .cdp-kbd {
            display: inline-block;
            padding: 2px 6px;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 4px;
            font-size: 10px; font-family: monospace;
            color: var(--cdp-text-secondary); line-height: 1.4;
        }
    `);

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

    function hexToRgb(hex) {
        const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return r ? { r: parseInt(r[1],16), g: parseInt(r[2],16), b: parseInt(r[3],16) } : null;
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

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied: ' + text);
        }).catch((clipboardErr) => {
            // Clipboard API bisa ditolak (permission/kontex tidak aman) —
            // coba fallback lama, dan laporkan bila keduanya gagal.
            try {
                const ta = document.createElement('textarea');
                ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
                document.body.appendChild(ta); ta.select();
                document.execCommand('copy'); document.body.removeChild(ta);
                showToast('Copied: ' + text);
            } catch (fallbackErr) {
                logError('copyToClipboard (clipboard API dan fallback gagal)',
                    { clipboardErr, fallbackErr });
                showToast('Copy failed');
            }
        });
    }

    /* ===== CLAMP — keeps panel inside viewport ===== */
    function clampPanel(panel) {
        const rect = panel.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const margin = 4;

        let left = rect.left;
        let top = rect.top;

        // right edge
        if (left + rect.width > vw - margin) left = vw - rect.width - margin;
        // left edge
        if (left < margin) left = margin;
        // bottom edge
        if (top + rect.height > vh - margin) top = vh - rect.height - margin;
        // top edge
        if (top < margin) top = margin;

        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
        panel.style.right = 'auto';
    }

    /* ===== BUILD UI ===== */

    const ICON_PIPETTE =
        '<svg width="{S}" height="{S}" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
        ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/>' +
        '<path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/>' +
        '</svg>';

    function pipetteIcon(size) {
        return ICON_PIPETTE.replace(/\{S\}/g, size);
    }

    function buildUI() {
        // Toggle Button
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'cdp-toggle-btn';
        toggleBtn.innerHTML = pipetteIcon(24);
        toggleBtn.title = 'Color Detector Pro (Alt+C)';
        document.body.appendChild(toggleBtn);

        // Toast
        const toast = document.createElement('div');
        toast.id = 'cdp-toast';
        document.body.appendChild(toast);

        // Cursor Tooltip
        const tooltip = document.createElement('div');
        tooltip.id = 'cdp-cursor-tooltip';
        tooltip.innerHTML = `
            <div id="cdp-tooltip-swatch"></div>
            <div id="cdp-tooltip-info">
                <div id="cdp-tooltip-name">—</div>
                <div id="cdp-tooltip-hex">—</div>
            </div>`;
        document.body.appendChild(tooltip);

        // Main Panel
        const panel = document.createElement('div');
        panel.id = 'cdp-panel';
        panel.classList.add('cdp-hidden');
        panel.innerHTML = `
            <div id="cdp-header">
                <div id="cdp-header-left">
                    <div id="cdp-logo">${pipetteIcon(16)}</div>
                    <span id="cdp-title">Color Detector Pro</span>
                    <span id="cdp-version">v2.2</span>
                </div>
                <div id="cdp-header-actions">
                    <button class="cdp-header-btn" id="cdp-btn-minimize" title="Minimize">─</button>
                    <button class="cdp-header-btn" id="cdp-btn-close" title="Close Panel">&times;</button>
                </div>
            </div>

            <div id="cdp-toolbar">
                <button id="cdp-detect-btn" class="cdp-inactive">
                    <span>◎</span>
                    <span id="cdp-detect-label">Start Color Detection</span>
                </button>
                <button id="cdp-clear-btn" title="Clear History">Clear</button>
            </div>

            <div id="cdp-detector-display">
                <div id="cdp-color-preview-area">
                    <div id="cdp-big-swatch">
                        <div id="cdp-big-swatch-inner" style="background:linear-gradient(135deg,#667eea,#764ba2);"></div>
                    </div>
                    <div id="cdp-color-info">
                        <div id="cdp-color-name">Point Your Cursor</div>
                        <div id="cdp-color-hex" style="color:#667eea;">— — —</div>
                        <div id="cdp-color-rgb">RGB: —</div>
                        <div id="cdp-color-hsl">HSL: —</div>
                        <div class="cdp-copy-hint">Click to copy color code</div>
                    </div>
                </div>
            </div>

            <div id="cdp-tabs">
                <button class="cdp-tab cdp-tab-active" data-tab="database">
                    Database
                    <span class="cdp-tab-badge" id="cdp-db-count">0</span>
                </button>
                <button class="cdp-tab" data-tab="history">
                    History
                    <span class="cdp-tab-badge" id="cdp-history-count">0</span>
                </button>
                <button class="cdp-tab" data-tab="palette">
                    Palette
                </button>
            </div>

            <div id="cdp-search-box">
                <div id="cdp-search-wrapper">
                    <span id="cdp-search-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg></span>
                    <input type="text" id="cdp-search-input" placeholder="Search colors... (name or hex code)">
                </div>
            </div>

            <div id="cdp-color-list-container">
                <div class="cdp-loading-spinner"></div>
            </div>

            <div id="cdp-footer">
                <div id="cdp-footer-left">
                    <div id="cdp-status-dot"></div>
                    <span id="cdp-status-text">Loading color database...</span>
                </div>
                <div id="cdp-footer-right">
                    <span class="cdp-kbd">Alt</span>+<span class="cdp-kbd">C</span> Toggle
                </div>
            </div>`;
        document.body.appendChild(panel);

        setupEventListeners();
    }

    /* ===== EVENT LISTENERS ===== */

    function setupEventListeners() {
        const panel = document.getElementById('cdp-panel');
        const toggleBtn = document.getElementById('cdp-toggle-btn');
        const closeBtn = document.getElementById('cdp-btn-close');
        const minBtn = document.getElementById('cdp-btn-minimize');
        const detectBtn = document.getElementById('cdp-detect-btn');
        const clearBtn = document.getElementById('cdp-clear-btn');
        const searchIn = document.getElementById('cdp-search-input');
        const tabs = document.querySelectorAll('.cdp-tab');
        const detDisp = document.getElementById('cdp-detector-display');

        // Toggle
        toggleBtn.addEventListener('click', () => {
            isPanelOpen = !isPanelOpen;
            panel.classList.toggle('cdp-hidden', !isPanelOpen);
            if (isPanelOpen) requestAnimationFrame(() => clampPanel(panel));
        });

        // Close
        closeBtn.addEventListener('click', () => {
            isPanelOpen = false;
            panel.classList.add('cdp-hidden');
        });

        // Minimize
        minBtn.addEventListener('click', () => {
            isPanelMinimized = !isPanelMinimized;
            panel.classList.toggle('cdp-minimized', isPanelMinimized);
            minBtn.innerHTML = isPanelMinimized ? '▢' : '─';
        });

        // Satu-satunya jalur untuk mengubah mode deteksi,
        // dipakai tombol Detect maupun tombol Escape.
        function setDetecting(active) {
            isDetecting = active;
            detectBtn.className = active ? 'cdp-active' : 'cdp-inactive';
            document.getElementById('cdp-detect-label').textContent =
                active ? '● Detecting... (click to stop)' : 'Start Color Detection';
            toggleBtn.classList.toggle('cdp-detecting', active);
            if (!active) {
                document.getElementById('cdp-cursor-tooltip').classList.remove('cdp-tooltip-visible');
                if (currentHighlight) {
                    currentHighlight.classList.remove('cdp-element-highlight');
                    currentHighlight = null;
                }
            }
        }

        // Detect
        detectBtn.addEventListener('click', () => setDetecting(!isDetecting));

        // Clear
        clearBtn.addEventListener('click', () => {
            detectionHistory = [];
            document.getElementById('cdp-history-count').textContent = '0';
            renderCurrentTab();
            showToast('History cleared');
        });

        // Copy on click
        detDisp.addEventListener('click', () => {
            const hex = document.getElementById('cdp-color-hex').getAttribute('data-hex');
            if (hex) copyToClipboard(hex);
        });
        detDisp.style.cursor = 'pointer';

        // Search
        searchIn.addEventListener('input', () => renderColorList(searchIn.value.trim()));

        // Tabs
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('cdp-tab-active'));
                tab.classList.add('cdp-tab-active');
                document.getElementById('cdp-search-box').style.display =
                    tab.dataset.tab === 'database' ? 'block' : 'none';
                renderCurrentTab();
            });
        });

        // Detection — listener global di halaman host dibungkus guard():
        // exception apa pun tercatat di console dengan konteks, tidak
        // menjalar merusak event handling halaman.
        document.addEventListener('mousemove', guard('handleMouseMove', handleMouseMove), true);
        document.addEventListener('click', guard('handleDetectionClick', handleDetectionClick), true);

        // Keyboard
        document.addEventListener('keydown', guard('keydown shortcut', (e) => {
            if (e.altKey && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                isPanelOpen = !isPanelOpen;
                panel.classList.toggle('cdp-hidden', !isPanelOpen);
                if (isPanelOpen) requestAnimationFrame(() => clampPanel(panel));
            }
            if (e.key === 'Escape' && isDetecting) {
                setDetecting(false);
            }
        }));

        // Viewport resize — re-clamp
        window.addEventListener('resize', () => {
            if (isPanelOpen) clampPanel(panel);
        });

        // Draggable with grab cursor + boundary clamping
        makeDraggable(panel, document.getElementById('cdp-header'));
    }

    /* ===== MOUSE DETECTION ===== */

    function handleMouseMove(e) {
        if (!isDetecting) return;
        const target = e.target;
        if (!target || target.closest('#cdp-panel') || target.closest('#cdp-toggle-btn') ||
            target.closest('#cdp-cursor-tooltip') || target.closest('#cdp-toast')) return;

        if (currentHighlight && currentHighlight !== target) {
            currentHighlight.classList.remove('cdp-element-highlight');
        }
        target.classList.add('cdp-element-highlight');
        currentHighlight = target;

        const hex = getElementColor(target);
        if (!hex) return;

        const closest = findClosestColor(hex);
        const colorName = closest ? closest['Color names'] : 'Unknown';
        updatePreview(hex, colorName);

        // Tooltip
        const tip = document.getElementById('cdp-cursor-tooltip');
        tip.classList.add('cdp-tooltip-visible');
        let tx = e.clientX + 18, ty = e.clientY + 18;
        tip.style.left = tx + 'px'; tip.style.top = ty + 'px';
        const tr = tip.getBoundingClientRect();
        if (tr.right > window.innerWidth) tip.style.left = (e.clientX - tr.width - 10) + 'px';
        if (tr.bottom > window.innerHeight) tip.style.top = (e.clientY - tr.height - 10) + 'px';

        document.getElementById('cdp-tooltip-swatch').style.background = hex;
        document.getElementById('cdp-tooltip-name').textContent = colorName;
        document.getElementById('cdp-tooltip-hex').textContent = hex;
    }

    function handleDetectionClick(e) {
        if (!isDetecting) return;
        const target = e.target;
        if (target.closest('#cdp-panel') || target.closest('#cdp-toggle-btn') ||
            target.closest('#cdp-cursor-tooltip') || target.closest('#cdp-toast')) return;

        e.preventDefault(); e.stopPropagation();

        const hex = getElementColor(target);
        if (!hex) return;

        const closest = findClosestColor(hex);
        detectionHistory.unshift({
            hex, name: closest ? closest['Color names'] : 'Unknown',
            time: new Date().toLocaleTimeString(), element: target.tagName.toLowerCase()
        });
        if (detectionHistory.length > 50) detectionHistory.pop();
        document.getElementById('cdp-history-count').textContent = detectionHistory.length;
        copyToClipboard(hex);
        renderCurrentTab();
    }

    /* ===== DRAG — grab/grabbing cursor + boundary clamp ===== */

    function makeDraggable(element, handle) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('.cdp-header-btn')) return;
            isDragging = true;
            const rect = element.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = rect.left;
            initialTop = rect.top;
            element.style.transition = 'none';
            handle.classList.add('cdp-dragging');
            e.preventDefault();
        });

        document.addEventListener('mousemove', guard('makeDraggable mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            let newLeft = initialLeft + dx;
            let newTop = initialTop + dy;

            // boundary clamping
            const rect = element.getBoundingClientRect();
            const w = rect.width;
            const h = rect.height;
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const margin = 4;

            if (newLeft < margin) newLeft = margin;
            if (newTop < margin) newTop = margin;
            if (newLeft + w > vw - margin) newLeft = vw - w - margin;
            if (newTop + h > vh - margin) newTop = vh - h - margin;

            element.style.left = newLeft + 'px';
            element.style.top = newTop + 'px';
            element.style.right = 'auto';
        }));

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.style.transition = '';
                handle.classList.remove('cdp-dragging');
            }
        });
    }

    /* ===== RENDER ===== */

    function renderCurrentTab() {
        const active = document.querySelector('.cdp-tab.cdp-tab-active');
        const tab = active ? active.dataset.tab : 'database';
        if (tab === 'database') renderColorList(document.getElementById('cdp-search-input').value.trim());
        else if (tab === 'history') renderHistory();
        else if (tab === 'palette') renderPalette();
    }

    function updatePreview(hex, name) {
        const rgb = hexToRgb(hex);
        if (!rgb) return; // hex tidak valid (mis. data database rusak) — jangan crash
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        document.getElementById('cdp-big-swatch-inner').style.background = hex;
        document.getElementById('cdp-color-name').textContent = name;
        const el = document.getElementById('cdp-color-hex');
        el.textContent = hex; el.style.color = hex; el.setAttribute('data-hex', hex);
        document.getElementById('cdp-color-rgb').textContent = `RGB: ${rgb.r}, ${rgb.g}, ${rgb.b}`;
        document.getElementById('cdp-color-hsl').textContent = `HSL: ${hsl.h}, ${hsl.s}%, ${hsl.l}%`;
    }

    function renderColorList(filter = '') {
        const container = document.getElementById('cdp-color-list-container');
        const fl = filter.toLowerCase();
        const filtered = colorDatabase.filter(c =>
            c['Color names'].toLowerCase().includes(fl) || c.Code.toLowerCase().includes(fl)
        );

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="cdp-empty-state">
                    <div class="cdp-empty-state-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg></div>
                    <div class="cdp-empty-state-text">No colors found for "${escapeHtml(filter)}"</div>
                </div>`;
            return;
        }

        let html = '';
        filtered.forEach(color => {
            const code = escapeHtml(color.Code);
            const name = escapeHtml(color['Color names']);
            const rgb = hexToRgb(color.Code);
            const rs = rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : '—';
            html += `
                <div class="cdp-color-item" data-hex="${code}" data-name="${name}">
                    <div class="cdp-color-swatch" style="background:${code};"></div>
                    <div class="cdp-color-item-info">
                        <div class="cdp-color-item-name">${name}</div>
                        <div class="cdp-color-item-code">${code} · rgb(${rs})</div>
                    </div>
                    <button class="cdp-color-item-copy" data-copy="${code}">Copy</button>
                </div>`;
        });
        container.innerHTML = html;
        attachListHandlers(container);
    }

    function renderHistory() {
        const container = document.getElementById('cdp-color-list-container');
        if (detectionHistory.length === 0) {
            container.innerHTML = `
                <div class="cdp-empty-state">
                    <div class="cdp-empty-state-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></div>
                    <div class="cdp-empty-state-text">No detection history yet.<br>Enable detection and hover over elements.</div>
                </div>`;
            return;
        }
        let html = '<div class="cdp-category-header">Recent Detection History</div>';
        detectionHistory.forEach(item => {
            const hex = escapeHtml(item.hex);
            const name = escapeHtml(item.name);
            const rgb = hexToRgb(item.hex);
            const rs = rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : '—';
            html += `
                <div class="cdp-color-item" data-hex="${hex}" data-name="${name}">
                    <div class="cdp-color-swatch" style="background:${hex};"></div>
                    <div class="cdp-color-item-info">
                        <div class="cdp-color-item-name">${name}</div>
                        <div class="cdp-color-item-code">${hex} · &lt;${escapeHtml(item.element)}&gt;</div>
                    </div>
                    <span class="cdp-history-time">${escapeHtml(item.time)}</span>
                    <button class="cdp-color-item-copy" data-copy="${hex}" style="opacity:1;">Copy</button>
                </div>`;
        });
        container.innerHTML = html;
        attachListHandlers(container);
    }

    function renderPalette() {
        const container = document.getElementById('cdp-color-list-container');
        const palettes = [
            { name: 'Warm Sunset', colors: ['#FF6B6B','#FFA07A','#FFD93D','#FF8C42','#FF5252','#E74C3C'] },
            { name: 'Ocean Breeze', colors: ['#0077B6','#00B4D8','#90E0EF','#CAF0F8','#023E8A','#48CAE4'] },
            { name: 'Forest', colors: ['#2D6A4F','#40916C','#52B788','#74C69D','#95D5B2','#B7E4C7'] },
            { name: 'Pastel Dream', colors: ['#FFB5E8','#FF9CEE','#B28DFF','#85E3FF','#BFFCC6','#FFC9DE'] },
            { name: 'Midnight', colors: ['#0F0F23','#1A1A2E','#16213E','#0F3460','#533483','#E94560'] },
            { name: 'Autumn', colors: ['#D4A373','#CCD5AE','#E9EDC9','#FEFAE0','#FAEDCD','#A98467'] },
            { name: 'Purple Rain', colors: ['#667eea','#764ba2','#f093fb','#5a67d8','#9F7AEA','#B794F4'] },
            { name: 'Neon', colors: ['#FF006E','#FB5607','#FFBE0B','#3A86FF','#8338EC','#06D6A0'] },
        ];
        let html = '';
        palettes.forEach(p => {
            html += `<div class="cdp-category-header">${p.name}</div>`;
            html += '<div class="cdp-palette-grid">';
            p.colors.forEach(c => {
                const cc = getContrastColor(c);
                html += `<div class="cdp-palette-swatch" data-hex="${c}" style="background:${c};color:${cc};">${c}</div>`;
            });
            html += '</div>';
        });
        container.innerHTML = html;
        container.querySelectorAll('.cdp-palette-swatch').forEach(sw => {
            sw.addEventListener('click', () => {
                const hex = sw.dataset.hex;
                const closest = findClosestColor(hex);
                updatePreview(hex, closest ? closest['Color names'] : hex);
                copyToClipboard(hex);
            });
        });
    }

    function attachListHandlers(container) {
        container.querySelectorAll('.cdp-color-item-copy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                copyToClipboard(btn.dataset.copy);
            });
        });
        container.querySelectorAll('.cdp-color-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.cdp-color-item-copy')) return;
                updatePreview(item.dataset.hex, item.dataset.name);
            });
        });
    }

    /* ===== FETCH COLORS ===== */

    const FETCH_TIMEOUT_MS = 15000;

    // Satu jalur untuk semua keadaan gagal fetch, supaya markup dan status
    // tidak diduplikasi di tiap handler. Detail error selalu dilaporkan ke
    // console lewat logError agar langsung terdeteksi saat debugging.
    function showFetchError(statusText, message, detail) {
        logError('fetchColors — ' + statusText, detail);
        document.getElementById('cdp-status-text').textContent = statusText;
        document.getElementById('cdp-color-list-container').innerHTML = `
            <div class="cdp-empty-state">
                <div class="cdp-empty-state-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></div>
                <div class="cdp-empty-state-text">${message}</div>
            </div>`;
    }

    function fetchColors() {
        GM_xmlhttpRequest({
            method: 'GET',
            url: API_URL,
            timeout: FETCH_TIMEOUT_MS,
            onload(response) {
                try {
                    const data = JSON.parse(response.responseText);
                    if (!Array.isArray(data)) {
                        throw new Error('Unexpected response shape: expected an array');
                    }
                    colorDatabase = data;
                    document.getElementById('cdp-db-count').textContent = colorDatabase.length;
                    document.getElementById('cdp-status-text').textContent =
                        colorDatabase.length + ' colors loaded successfully';
                    renderColorList();
                } catch (e) {
                    showFetchError('Failed to parse database',
                        'Failed to load color database.<br>The server response was not valid.', e);
                }
            },
            onerror(response) {
                showFetchError('Connection error',
                    'Could not connect to server.<br>Please check your internet connection.',
                    { url: API_URL, status: response && response.status });
            },
            ontimeout() {
                showFetchError('Connection timed out',
                    'The server took too long to respond.<br>Please try again later.',
                    { url: API_URL, timeoutMs: FETCH_TIMEOUT_MS });
            }
        });
    }

    /* ===== INIT ===== */
    // Kegagalan startup (DOM host tidak siap, konflik dengan halaman, dll.)
    // dilaporkan ke console, bukan gagal tanpa jejak.
    try {
        buildUI();
        fetchColors();
    } catch (err) {
        logError('init', err);
    }

})();
