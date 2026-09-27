// ==UserScript==
// @name         Color Detector Pro — Real-Time Color Inspector
// @namespace    https://github.com/Delta-Polder-Indonesia/Alat_Deteksi
// @version      3.1.0
// @description  Real-time color detection on any web page. Hover over any element to identify colors & hex codes. Professional panel with 500+ color database.
// @author       Bintang Toba Pro Team
// @license      MIT
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_download
// @connect      raw.githubusercontent.com
// @connect      *
// @run-at       document-idle
// @icon         https://raw.githubusercontent.com/Delta-Polder-Indonesia/Alat_Deteksi/main/public/assets/images/profile.svg
// @updateURL    https://raw.githubusercontent.com/Delta-Polder-Indonesia/Alat_Deteksi/main/dist/ColorDetektor.user.js
// @downloadURL  https://raw.githubusercontent.com/Delta-Polder-Indonesia/Alat_Deteksi/main/dist/ColorDetektor.user.js
// ==/UserScript==

(function () {
    'use strict';

    /* ===== CONFIG ===== */
    const REPOSITORY_RAW_BASE_URL = 'https://raw.githubusercontent.com/Delta-Polder-Indonesia/Alat_Deteksi/main';
    const COLOR_DATABASE_URL = REPOSITORY_RAW_BASE_URL + '/public/data/colors.json';
    const ICON_INDEX_URL = REPOSITORY_RAW_BASE_URL + '/public/data/icon-index.json';
    const LOG_PREFIX = '[Color Detector Pro]';
    const DETECTION_MODE_EYEDROPPER = 'eyedropper';
    const DETECTION_MODE_COMPUTED = 'computed';
    const MAX_HISTORY_ITEMS = 50;
    const COLOR_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
    const ASSET_FETCH_TIMEOUT_MS = 15000;
    const ASSET_DOWNLOAD_TIMEOUT_MS = 45000;
    const SITE_SCAN_ELEMENT_LIMIT = 2500;
    const SITE_SCAN_BATCH_SIZE = 120;
    const SVG_GEOMETRY_ATTRIBUTES = Object.freeze({
        path: ['d'],
        circle: ['cx', 'cy', 'r'],
        rect: ['x', 'y', 'width', 'height', 'rx', 'ry'],
        line: ['x1', 'y1', 'x2', 'y2'],
        ellipse: ['cx', 'cy', 'rx', 'ry'],
        polyline: ['points'],
        polygon: ['points'],
    });
    const INSPECT_CSS_PROPERTIES = Object.freeze([
        'font-family',
        'font-size',
        'font-weight',
        'line-height',
        'color',
        'background',
        'border-radius',
        'box-shadow',
        'padding',
        'margin',
    ]);
    const STORAGE_KEYS = Object.freeze({
        history: 'cdp_detection_history',
        activeTab: 'cdp_active_tab',
        sidebarSide: 'cdp_sidebar_side',
        colorCache: 'cdp_color_database_cache',
    });
    const FALLBACK_COLOR_DATABASE = Object.freeze([
        { 'Color names': 'Black', Code: '#000000' },
        { 'Color names': 'White', Code: '#FFFFFF' },
        { 'Color names': 'Red', Code: '#FF0000' },
        { 'Color names': 'Lime', Code: '#00FF00' },
        { 'Color names': 'Blue', Code: '#0000FF' },
        { 'Color names': 'Yellow', Code: '#FFFF00' },
        { 'Color names': 'Cyan', Code: '#00FFFF' },
        { 'Color names': 'Magenta', Code: '#FF00FF' },
        { 'Color names': 'Silver', Code: '#C0C0C0' },
        { 'Color names': 'Gray', Code: '#808080' },
        { 'Color names': 'Maroon', Code: '#800000' },
        { 'Color names': 'Olive', Code: '#808000' },
        { 'Color names': 'Green', Code: '#008000' },
        { 'Color names': 'Purple', Code: '#800080' },
        { 'Color names': 'Teal', Code: '#008080' },
        { 'Color names': 'Navy', Code: '#000080' },
        { 'Color names': 'Orange', Code: '#FFA500' },
        { 'Color names': 'Pink', Code: '#FFC0CB' },
        { 'Color names': 'Brown', Code: '#A52A2A' },
        { 'Color names': 'Gold', Code: '#FFD700' },
        { 'Color names': 'Coral', Code: '#FF7F50' },
        { 'Color names': 'Salmon', Code: '#FA8072' },
        { 'Color names': 'Indigo', Code: '#4B0082' },
        { 'Color names': 'Violet', Code: '#EE82EE' },
        { 'Color names': 'Turquoise', Code: '#40E0D0' },
        { 'Color names': 'Beige', Code: '#F5F5DC' },
        { 'Color names': 'Ivory', Code: '#FFFFF0' },
        { 'Color names': 'Lavender', Code: '#E6E6FA' },
        { 'Color names': 'Mint', Code: '#98FF98' },
        { 'Color names': 'Charcoal', Code: '#36454F' },
    ]);

    let colorDatabase = [];
    let isPanelOpen = false;
    let sidebarSide = 'right';
    let isDetecting = false;
    let currentHighlight = null;
    let detectionHistory = [];
    let activeTab = 'database';
    let detectionMode = DETECTION_MODE_COMPUTED;
    let isEyeDropperOpen = false;
    let isAssetPickerActive = false;
    let currentAssetHighlight = null;
    let currentPickedAsset = null;
    let pageAssets = [];
    let iconIndexByHash = new Map();
    let iconLibraryNames = new Set();
    let iconIndexLoadPromise = null;
    let iconMatchCache = new WeakMap();
    let isScanningAssets = false;
    let isDownloadingAssets = false;
    let isInspectActive = false;
    let isInspectFrozen = false;
    let currentInspectHighlight = null;
    let currentInspectData = null;
    let siteInfo = {
        fonts: [],
        colors: [],
        tokens: [],
        technologies: [],
        scannedCount: 0,
        limitReached: false,
        scannedAt: null,
    };
    let isScanningSiteInfo = false;
    let notificationTimer = null;
    /* ===== STYLES ===== */
    GM_addStyle(`
        :root {
            --cdp-primary: #2f81f7;
            --cdp-primary-dark: #1f6feb;
            --cdp-secondary: #8b949e;
            --cdp-accent: #58a6ff;
            --cdp-bg-dark: #0d1117;
            --cdp-bg-card: #161b22;
            --cdp-bg-card-alt: #0d1117;
            --cdp-text-primary: #c9d1d9;
            --cdp-text-secondary: #8b949e;
            --cdp-text-muted: #6e7681;
            --cdp-border: #30363d;
            --cdp-glow: rgba(47,129,247,0.24);
            --cdp-success: #238636;
            --cdp-warning: #d29922;
            --cdp-danger: #da3633;
            --cdp-radius: 6px;
            --cdp-sidebar-width: min(460px, calc(100vw - 64px));
            --cdp-rail-width: 56px;
            --cdp-transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease;
        }

        /* ----- SIDEBAR PANEL ----- */
        #cdp-panel {
            position: fixed;
            top: 0;
            right: 0;
            width: calc(var(--cdp-sidebar-width) + var(--cdp-rail-width));
            height: 100vh;
            height: 100dvh;
            box-sizing: border-box;
            background: var(--cdp-bg-dark);
            border: 0;
            border-left: 1px solid var(--cdp-border);
            border-radius: 0;
            box-shadow: -12px 0 28px rgba(1,4,9,0.42);
            z-index: 2147483647;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            color: var(--cdp-text-primary);
            display: flex;
            flex-direction: row;
            overflow: hidden;
            transition: width 0.22s ease, box-shadow 0.22s ease;
            backdrop-filter: none;
        }
        #cdp-panel.cdp-hidden {
            width: var(--cdp-rail-width);
            box-shadow: -5px 0 18px rgba(1,4,9,0.3);
        }
        #cdp-panel.cdp-sidebar-left {
            right: auto;
            left: 0;
            border-left: 0;
            border-right: 1px solid var(--cdp-border);
            box-shadow: 12px 0 28px rgba(1,4,9,0.42);
        }
        #cdp-panel.cdp-sidebar-left.cdp-hidden {
            box-shadow: 5px 0 18px rgba(1,4,9,0.3);
        }
        #cdp-sidebar-content {
            width: var(--cdp-sidebar-width);
            min-width: var(--cdp-sidebar-width);
            height: 100%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: var(--cdp-bg-dark);
            opacity: 1;
            visibility: visible;
            transition: opacity 0.14s ease, visibility 0s linear 0s;
        }
        #cdp-panel.cdp-hidden #cdp-sidebar-content {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            transition: opacity 0.1s ease, visibility 0s linear 0.22s;
        }

        /* ----- NAVIGATION RAIL ----- */
        #cdp-sidebar-rail {
            width: var(--cdp-rail-width);
            min-width: var(--cdp-rail-width);
            height: 100%;
            box-sizing: border-box;
            background: var(--cdp-bg-card);
            border-right: 1px solid var(--cdp-border);
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 8px 6px;
            gap: 4px;
            overflow: hidden;
            z-index: 2;
        }
        .cdp-rail-btn,
        .cdp-tab {
            position: relative;
            width: 42px;
            height: 42px;
            min-width: 42px;
            min-height: 42px;
            padding: 0;
            border: 1px solid transparent;
            border-radius: var(--cdp-radius);
            background: transparent;
            color: var(--cdp-text-secondary);
            font-family: inherit;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: var(--cdp-transition);
        }
        .cdp-rail-btn:hover,
        .cdp-tab:hover {
            background: #21262d;
            border-color: var(--cdp-border);
            color: var(--cdp-text-primary);
        }
        .cdp-rail-btn:focus-visible,
        .cdp-tab:focus-visible {
            outline: 2px solid var(--cdp-primary);
            outline-offset: 1px;
        }
        .cdp-rail-toggle {
            color: var(--cdp-text-primary);
            background: var(--cdp-bg-dark);
            border-color: var(--cdp-border);
        }
        .cdp-rail-toggle svg {
            transition: transform 0.22s ease;
        }
        #cdp-panel.cdp-hidden .cdp-rail-toggle svg {
            transform: rotate(180deg);
        }
        #cdp-panel.cdp-sidebar-left .cdp-rail-toggle svg {
            transform: rotate(180deg);
        }
        #cdp-panel.cdp-sidebar-left.cdp-hidden .cdp-rail-toggle svg {
            transform: rotate(0deg);
        }
        .cdp-rail-divider {
            width: 30px;
            height: 1px;
            margin: 3px 0;
            background: var(--cdp-border);
            flex-shrink: 0;
        }
        #cdp-color-nav.cdp-detecting {
            color: #fff;
            background: var(--cdp-success);
            border-color: #2ea043;
        }
        #cdp-tabs {
            width: 100%;
            min-height: 0;
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            overflow-y: auto;
            overflow-x: hidden;
            scrollbar-width: none;
        }
        #cdp-tabs::-webkit-scrollbar {
            display: none;
        }
        .cdp-side-btn {
            flex-shrink: 0;
            margin-top: 4px;
        }
        .cdp-tab.cdp-tab-active {
            color: #fff;
            background: var(--cdp-primary-dark);
            border-color: var(--cdp-primary);
            box-shadow: 0 0 0 1px rgba(88,166,255,0.12);
        }
        .cdp-tab-label {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0,0,0,0);
            white-space: nowrap;
            border: 0;
        }
        .cdp-tab-badge {
            position: absolute;
            top: 2px;
            right: 1px;
            min-width: 14px;
            max-width: 26px;
            height: 14px;
            box-sizing: border-box;
            padding: 0 3px;
            border-radius: 7px;
            background: #30363d;
            color: var(--cdp-text-primary);
            border: 1px solid var(--cdp-bg-card);
            font-size: 8px;
            line-height: 12px;
            font-weight: 700;
            text-align: center;
            overflow: hidden;
        }
        .cdp-tab.cdp-tab-active .cdp-tab-badge {
            background: var(--cdp-bg-dark);
            color: #fff;
        }

        /* ----- HEADER ----- */
        #cdp-header {
            padding: 12px 14px;
            background: var(--cdp-bg-card);
            border-bottom: 1px solid var(--cdp-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            user-select: none;
            flex-shrink: 0;
        }
        #cdp-header-left {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;
        }
        #cdp-logo {
            width: 28px;
            height: 28px;
            border: 1px solid var(--cdp-border);
            border-radius: var(--cdp-radius);
            background: var(--cdp-bg-dark);
            color: var(--cdp-text-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        #cdp-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--cdp-text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        #cdp-version {
            flex-shrink: 0;
            font-size: 11px;
            background: var(--cdp-bg-dark);
            color: var(--cdp-text-secondary);
            border: 1px solid var(--cdp-border);
            padding: 1px 6px;
            border-radius: 999px;
            font-weight: 600;
        }
        #cdp-header-notification {
            visibility: hidden;
            flex: 0 1 140px;
            display: flex;
            align-items: center;
            gap: 4px;
            min-width: 0;
            font-size: 11px;
            font-weight: 600;
            line-height: 1;
        }
        #cdp-header-notification.cdp-notification-visible {
            visibility: visible;
        }
        #cdp-header-notification.cdp-notification-success {
            color: #3fb950;
        }
        #cdp-header-notification.cdp-notification-error {
            color: #f85149;
        }
        #cdp-header-notification.cdp-notification-info {
            color: var(--cdp-accent);
        }
        #cdp-header-notification-icon {
            width: 14px;
            height: 14px;
            flex-shrink: 0;
        }
        #cdp-header-notification-icon svg {
            display: none;
        }
        #cdp-header-notification.cdp-notification-success .cdp-notification-icon-success,
        #cdp-header-notification.cdp-notification-error .cdp-notification-icon-error,
        #cdp-header-notification.cdp-notification-info .cdp-notification-icon-info {
            display: block;
        }
        #cdp-header-notification-text {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        /* ----- TOOLBAR ----- */
        #cdp-toolbar {
            padding: 10px 14px;
            background: var(--cdp-bg-card);
            border-bottom: 1px solid var(--cdp-border);
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            flex-shrink: 0;
        }
        #cdp-detect-btn,
        #cdp-mode-btn,
        #cdp-asset-btn,
        #cdp-inspect-btn,
        #cdp-clear-btn {
            min-height: 32px;
            padding: 6px 10px;
            border: 1px solid var(--cdp-border);
            border-radius: var(--cdp-radius);
            background: #21262d;
            color: var(--cdp-text-primary);
            font-family: inherit;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: var(--cdp-transition);
        }
        #cdp-detect-btn {
            flex: 1 1 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        #cdp-mode-btn,
        #cdp-asset-btn,
        #cdp-inspect-btn,
        #cdp-clear-btn {
            flex: 1 1 0;
            white-space: nowrap;
        }
        #cdp-detect-btn:hover,
        #cdp-mode-btn:hover,
        #cdp-asset-btn:hover,
        #cdp-inspect-btn:hover,
        #cdp-clear-btn:hover {
            background: #30363d;
            border-color: #8b949e;
        }
        #cdp-detect-btn.cdp-active,
        #cdp-asset-btn.cdp-active,
        #cdp-inspect-btn.cdp-active,
        #cdp-mode-btn.cdp-mode-pixel {
            background: var(--cdp-success);
            border-color: #2ea043;
            color: #fff;
        }
        #cdp-mode-btn.cdp-mode-style {
            background: #21262d;
            border-color: var(--cdp-border);
            color: var(--cdp-text-primary);
        }
        #cdp-clear-btn:hover {
            color: #ff7b72;
            border-color: var(--cdp-danger);
        }

        /* ----- DETECTOR DISPLAY ----- */
        #cdp-detector-display {
            padding: 14px;
            background: var(--cdp-bg-dark);
            border-bottom: 1px solid var(--cdp-border);
            flex-shrink: 0;
        }
        #cdp-color-preview-area {
            display: flex;
            gap: 12px;
            align-items: stretch;
        }
        #cdp-big-swatch {
            width: 84px;
            height: 84px;
            border-radius: var(--cdp-radius);
            border: 1px solid var(--cdp-border);
            flex-shrink: 0;
            position: relative;
            overflow: hidden;
            background: repeating-conic-gradient(#30363d 0% 25%, transparent 0% 50%) 50% / 14px 14px;
        }
        #cdp-big-swatch-inner {
            position: absolute;
            inset: 0;
        }
        #cdp-color-info {
            flex: 1;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            grid-template-areas:
                'name name'
                'hex contrast-white'
                'rgb contrast-black'
                'hsl copy-hint';
            align-items: center;
            column-gap: 12px;
            row-gap: 1px;
            min-width: 0;
        }
        #cdp-color-name {
            grid-area: name;
            font-size: 16px;
            font-weight: 600;
            color: var(--cdp-text-primary);
            line-height: 1.25;
            overflow-wrap: anywhere;
        }
        #cdp-color-hex {
            grid-area: hex;
            font-size: 20px;
            font-weight: 700;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            letter-spacing: 0.2px;
            white-space: nowrap;
        }
        #cdp-color-rgb,
        #cdp-color-hsl {
            font-size: 12px;
            color: var(--cdp-text-secondary);
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            white-space: nowrap;
        }
        #cdp-color-rgb {
            grid-area: rgb;
        }
        #cdp-color-hsl {
            grid-area: hsl;
        }
        #cdp-contrast-panel {
            display: contents;
        }
        .cdp-contrast-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            min-width: 0;
            font-size: 11px;
            color: var(--cdp-text-secondary);
        }
        #cdp-contrast-panel .cdp-contrast-row:first-child {
            grid-area: contrast-white;
        }
        #cdp-contrast-panel .cdp-contrast-row:last-child {
            grid-area: contrast-black;
        }
        .cdp-contrast-row span {
            white-space: nowrap;
        }
        .cdp-contrast-row strong {
            color: var(--cdp-text-primary);
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: 11px;
            font-weight: 600;
            white-space: nowrap;
        }
        .cdp-copy-hint {
            grid-area: copy-hint;
            font-size: 11px;
            color: var(--cdp-text-muted);
            white-space: nowrap;
        }

        /* ----- SEARCH ----- */
        #cdp-search-box {
            padding: 10px 14px;
            background: var(--cdp-bg-dark);
            border-bottom: 1px solid var(--cdp-border);
            flex-shrink: 0;
        }
        #cdp-search-input {
            width: 100%;
            padding: 8px 12px 8px 34px;
            border: 1px solid var(--cdp-border);
            border-radius: var(--cdp-radius);
            background: #0d1117;
            color: var(--cdp-text-primary);
            font-family: inherit;
            font-size: 13px;
            outline: none;
            box-sizing: border-box;
        }
        #cdp-search-input:focus {
            border-color: var(--cdp-primary);
            box-shadow: 0 0 0 2px var(--cdp-glow);
        }
        #cdp-search-input::placeholder {
            color: var(--cdp-text-muted);
        }
        #cdp-search-wrapper {
            position: relative;
        }
        #cdp-search-icon {
            position: absolute;
            left: 11px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            align-items: center;
            color: var(--cdp-text-muted);
            pointer-events: none;
        }

        /* ----- PALETTE AND EXPORT ----- */
        .cdp-palette-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(54px, 1fr));
            gap: 8px;
            padding: 12px 14px;
        }
        .cdp-palette-swatch {
            height: 52px;
            border-radius: var(--cdp-radius);
            border: 1px solid var(--cdp-border);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-weight: 700;
            cursor: pointer;
            box-shadow: none;
        }
        .cdp-palette-swatch:hover {
            border-color: var(--cdp-primary);
        }
        .cdp-export-bar,
        .cdp-assets-toolbar,
        .cdp-site-toolbar {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            background: var(--cdp-bg-dark);
            border-bottom: 1px solid var(--cdp-border);
            flex-wrap: wrap;
        }
        .cdp-export-label {
            color: var(--cdp-text-secondary);
            font-size: 11px;
            font-weight: 600;
            margin-right: 2px;
        }
        .cdp-export-btn,
        .cdp-harmony-copy,
        .cdp-assets-action,
        .cdp-site-action,
        .cdp-asset-small-btn,
        #cdp-asset-copy-svg-btn,
        #cdp-asset-download-btn,
        #cdp-inspect-copy-btn {
            padding: 6px 10px;
            border: 1px solid var(--cdp-border);
            border-radius: var(--cdp-radius);
            background: #21262d;
            color: var(--cdp-text-primary);
            font-family: inherit;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: var(--cdp-transition);
        }
        .cdp-export-btn:hover,
        .cdp-harmony-copy:hover,
        .cdp-assets-action:hover,
        .cdp-site-action:hover,
        .cdp-asset-small-btn:hover,
        #cdp-asset-copy-svg-btn:hover,
        #cdp-asset-download-btn:hover,
        #cdp-inspect-copy-btn:hover {
            background: #30363d;
            border-color: #8b949e;
        }
        .cdp-export-btn:disabled,
        .cdp-assets-action:disabled,
        .cdp-site-action:disabled,
        #cdp-asset-copy-svg-btn:disabled {
            opacity: 0.55;
            cursor: not-allowed;
        }
        .cdp-export-btn:disabled:hover,
        .cdp-assets-action:disabled:hover,
        .cdp-site-action:disabled:hover,
        #cdp-asset-copy-svg-btn:disabled:hover {
            background: #21262d;
            border-color: var(--cdp-border);
        }

        /* ----- HARMONY ----- */
        .cdp-harmony-source {
            padding: 12px 14px;
            background: var(--cdp-bg-dark);
            border-bottom: 1px solid var(--cdp-border);
            color: var(--cdp-text-secondary);
            font-size: 12px;
        }
        .cdp-harmony-source strong {
            color: var(--cdp-text-primary);
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        }
        .cdp-harmony-scheme {
            border-bottom: 1px solid var(--cdp-border);
        }
        .cdp-harmony-heading {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            padding: 10px 14px 0;
        }
        .cdp-harmony-title,
        .cdp-category-header {
            color: var(--cdp-text-primary);
            font-size: 12px;
            font-weight: 600;
        }

        /* ----- ASSETS ----- */
        .cdp-assets-count,
        .cdp-site-status {
            color: var(--cdp-text-secondary);
            font-size: 11px;
            margin-left: auto;
        }
        .cdp-assets-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            padding: 12px 14px 14px;
        }
        .cdp-asset-card,
        .cdp-site-row {
            border: 1px solid var(--cdp-border);
            border-radius: var(--cdp-radius);
            background: var(--cdp-bg-card);
            overflow: hidden;
        }
        .cdp-asset-thumb {
            height: 110px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #0d1117;
            border-bottom: 1px solid var(--cdp-border);
        }
        .cdp-asset-thumb img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
        .cdp-asset-thumb-placeholder {
            color: var(--cdp-text-muted);
            font-size: 11px;
            font-weight: 600;
        }
        .cdp-asset-card-body {
            padding: 10px;
        }
        .cdp-asset-check-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
        }
        .cdp-asset-check-row input {
            accent-color: var(--cdp-primary);
        }
        .cdp-asset-name {
            color: var(--cdp-text-primary);
            font-size: 12px;
            font-weight: 600;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .cdp-asset-meta {
            color: var(--cdp-text-secondary);
            font-size: 11px;
            line-height: 1.4;
            word-break: break-word;
        }
        .cdp-asset-icon-match {
            color: #3fb950;
            font-weight: 600;
        }
        .cdp-asset-card-actions {
            display: flex;
            gap: 6px;
            margin-top: 8px;
        }
        .cdp-asset-small-btn {
            flex: 1;
            font-size: 11px;
        }

        /* ----- SITE INFO ----- */
        .cdp-site-section {
            border-bottom: 1px solid var(--cdp-border);
            padding-bottom: 10px;
        }
        .cdp-site-section-body {
            padding: 10px 14px 0;
        }
        .cdp-site-list {
            display: grid;
            gap: 8px;
        }
        .cdp-site-row {
            padding: 9px 10px;
        }
        .cdp-site-row-title {
            color: var(--cdp-text-primary);
            font-size: 12px;
            font-weight: 600;
            display: flex;
            justify-content: space-between;
            gap: 10px;
        }
        .cdp-site-row-meta {
            color: var(--cdp-text-secondary);
            font-size: 11px;
            line-height: 1.4;
            margin-top: 3px;
            word-break: break-word;
        }
        .cdp-site-color-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
        }
        .cdp-site-color-chip {
            min-height: 54px;
            border: 1px solid var(--cdp-border);
            border-radius: var(--cdp-radius);
            padding: 7px;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
        }
        .cdp-site-color-chip:hover {
            border-color: var(--cdp-primary);
        }
        .cdp-site-color-chip span {
            display: inline-block;
            background: rgba(13,17,23,0.78);
            border-radius: 4px;
            padding: 2px 5px;
            color: #fff;
            font-size: 10px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            line-height: 1.35;
        }
        .cdp-token-row {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            gap: 8px;
            align-items: center;
            cursor: pointer;
        }
        .cdp-token-row code {
            color: var(--cdp-text-primary);
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: 11px;
            word-break: break-word;
        }

        /* ----- COLOR LIST ----- */
        #cdp-color-list-container {
            flex: 1;
            overflow-y: auto;
            min-height: 0;
            scrollbar-width: thin;
            scrollbar-color: #484f58 transparent;
        }
        #cdp-color-list-container::-webkit-scrollbar {
            width: 8px;
        }
        #cdp-color-list-container::-webkit-scrollbar-track {
            background: transparent;
        }
        #cdp-color-list-container::-webkit-scrollbar-thumb {
            background: #484f58;
            border-radius: 999px;
        }
        .cdp-color-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            cursor: pointer;
            border-bottom: 1px solid var(--cdp-border);
            background: var(--cdp-bg-dark);
        }
        .cdp-color-item:hover {
            background: var(--cdp-bg-card);
        }
        .cdp-color-swatch {
            width: 34px;
            height: 34px;
            border-radius: var(--cdp-radius);
            flex-shrink: 0;
            border: 1px solid var(--cdp-border);
        }
        .cdp-color-item-info {
            flex: 1;
            min-width: 0;
        }
        .cdp-color-item-name {
            font-size: 13px;
            font-weight: 600;
            color: var(--cdp-text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .cdp-color-item-code {
            font-size: 12px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            color: var(--cdp-text-secondary);
            margin-top: 2px;
        }
        .cdp-color-item-copy {
            padding: 5px 10px;
            border: 1px solid var(--cdp-border);
            border-radius: var(--cdp-radius);
            background: #21262d;
            color: var(--cdp-text-primary);
            font-family: inherit;
            font-size: 11px;
            cursor: pointer;
            opacity: 1;
            flex-shrink: 0;
        }
        .cdp-color-item-copy:hover {
            background: #30363d;
            border-color: #8b949e;
        }
        .cdp-history-time {
            font-size: 10px;
            color: var(--cdp-text-muted);
            flex-shrink: 0;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        }

        /* ----- FOOTER ----- */
        #cdp-footer {
            padding: 9px 14px;
            background: var(--cdp-bg-card);
            border-top: 1px solid var(--cdp-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0;
            gap: 10px;
        }
        #cdp-footer-left {
            font-size: 11px;
            color: var(--cdp-text-secondary);
            display: flex;
            align-items: center;
            gap: 6px;
            min-width: 0;
        }
        #cdp-status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--cdp-success);
            flex-shrink: 0;
        }
        #cdp-footer-right {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
            color: var(--cdp-text-secondary);
            white-space: nowrap;
        }
        .cdp-kbd {
            display: inline-block;
            padding: 1px 5px;
            background: #21262d;
            border: 1px solid var(--cdp-border);
            border-radius: 4px;
            font-size: 10px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            color: var(--cdp-text-secondary);
            line-height: 1.4;
        }

        /* ----- TOOLTIP AND POPOVERS ----- */
        #cdp-cursor-tooltip,
        #cdp-asset-action-popover,
        #cdp-inspect-card {
            position: fixed;
            background: var(--cdp-bg-card);
            border: 1px solid var(--cdp-border);
            border-radius: var(--cdp-radius);
            z-index: 2147483647;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            color: var(--cdp-text-primary);
            box-shadow: 0 12px 28px rgba(1,4,9,0.42);
        }
        #cdp-cursor-tooltip {
            padding: 8px 10px;
            pointer-events: none;
            display: none;
        }
        #cdp-cursor-tooltip.cdp-tooltip-visible {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        #cdp-tooltip-swatch {
            width: 26px;
            height: 26px;
            border-radius: var(--cdp-radius);
            border: 1px solid var(--cdp-border);
            flex-shrink: 0;
        }
        #cdp-tooltip-swatch.cdp-asset-tooltip-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            background: #21262d;
            color: var(--cdp-text-primary);
            font-size: 8px;
            font-weight: 700;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        }
        #cdp-tooltip-info {
            display: flex;
            flex-direction: column;
        }
        #cdp-tooltip-name {
            font-size: 12px;
            font-weight: 600;
            color: var(--cdp-text-primary);
        }
        #cdp-tooltip-hex {
            font-size: 11px;
            color: var(--cdp-text-secondary);
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        }
        #cdp-asset-action-popover {
            min-width: 200px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        #cdp-asset-action-popover.cdp-hidden,
        #cdp-inspect-card.cdp-hidden {
            display: none;
        }
        #cdp-asset-action-title,
        #cdp-inspect-card-title {
            font-size: 13px;
            font-weight: 600;
        }
        #cdp-asset-action-meta,
        #cdp-inspect-card-subtitle {
            color: var(--cdp-text-secondary);
            font-size: 11px;
            word-break: break-word;
        }
        #cdp-inspect-card {
            width: 320px;
            max-width: calc(100vw - 24px);
            padding: 12px;
        }
        #cdp-inspect-card-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 8px;
        }
        #cdp-inspect-card-state {
            color: var(--cdp-success);
            border: 1px solid #2ea043;
            border-radius: 999px;
            padding: 1px 6px;
            font-size: 10px;
            font-weight: 600;
        }
        #cdp-inspect-card-body {
            display: grid;
            gap: 5px;
            margin-bottom: 10px;
        }
        .cdp-inspect-row {
            display: grid;
            grid-template-columns: 94px minmax(0, 1fr);
            gap: 8px;
            font-size: 11px;
            line-height: 1.35;
        }
        .cdp-inspect-row span {
            color: var(--cdp-text-secondary);
        }
        .cdp-inspect-row strong {
            color: var(--cdp-text-primary);
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-weight: 500;
            word-break: break-word;
        }

        /* ----- HIGHLIGHT AND FEEDBACK ----- */
        .cdp-element-highlight {
            outline: 2px solid var(--cdp-primary) !important;
            outline-offset: 2px !important;
        }
        .cdp-loading-spinner {
            width: 28px;
            height: 28px;
            border: 2px solid var(--cdp-border);
            border-top-color: var(--cdp-primary);
            border-radius: 50%;
            animation: cdp-spin 0.8s linear infinite;
            margin: 32px auto;
        }
        @keyframes cdp-spin {
            to { transform: rotate(360deg); }
        }
        .cdp-empty-state {
            text-align: center;
            padding: 32px 18px;
            color: var(--cdp-text-secondary);
        }
        .cdp-empty-state-icon {
            margin-bottom: 10px;
        }
        .cdp-empty-state-text {
            font-size: 13px;
            line-height: 1.5;
        }
        .cdp-category-header {
            padding: 8px 14px;
            background: var(--cdp-bg-card);
            border-bottom: 1px solid var(--cdp-border);
            position: sticky;
            top: 0;
            z-index: 5;
        }

        @media (max-width: 519px) {
            #cdp-title {
                display: none;
            }
            #cdp-color-preview-area {
                flex-direction: column;
            }
            #cdp-big-swatch {
                width: 100%;
                height: 64px;
                box-sizing: border-box;
            }
            .cdp-assets-grid {
                grid-template-columns: minmax(0, 1fr);
            }
            .cdp-site-color-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }

        @media (max-width: 399px) {
            #cdp-header-notification {
                flex-basis: 90px;
            }
            #cdp-color-info {
                grid-template-columns: minmax(0, 1fr);
                grid-template-areas:
                    'name'
                    'hex'
                    'rgb'
                    'hsl'
                    'contrast-white'
                    'contrast-black'
                    'copy-hint';
                row-gap: 3px;
            }
            .cdp-contrast-row {
                justify-content: flex-start;
            }
            #cdp-footer-right {
                display: none;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            #cdp-panel,
            #cdp-panel.cdp-hidden,
            #cdp-toggle-btn {
                transition: none;
            }
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

    function showNotification(message, type = 'info') {
        const notification = document.getElementById('cdp-header-notification');
        const text = document.getElementById('cdp-header-notification-text');
        if (!notification || !text) return;

        const normalizedType = type === 'success' || type === 'error' ? type : 'info';
        notification.className = `cdp-notification-${normalizedType} cdp-notification-visible`;
        notification.setAttribute('role', normalizedType === 'error' ? 'alert' : 'status');
        notification.setAttribute('aria-live', normalizedType === 'error' ? 'assertive' : 'polite');
        text.textContent = String(message);

        clearTimeout(notificationTimer);
        notificationTimer = setTimeout(() => {
            notification.classList.remove('cdp-notification-visible');
            notificationTimer = null;
        }, 2200);
    }

    function copyToClipboardFallback(text, clipboardErr, successMessage) {
        let ta = null;
        try {
            ta = document.createElement('textarea');
            ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(ta); ta.select();
            if (!document.execCommand('copy')) {
                throw new Error('document.execCommand returned false');
            }
            showNotification(successMessage, 'success');
        } catch (fallbackErr) {
            logError('copyToClipboard fallback', { clipboardErr, fallbackErr });
            showNotification('Copy failed', 'error');
        } finally {
            if (ta && ta.parentNode) ta.parentNode.removeChild(ta);
        }
    }

    function copyToClipboard(text, successMessage = 'Copied') {
        if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
            copyToClipboardFallback(text, new Error('Clipboard API is not available'), successMessage);
            return;
        }
        navigator.clipboard.writeText(text).then(() => {
            showNotification(successMessage, 'success');
        }).catch((clipboardErr) => {
            logError('copyToClipboard clipboard API', clipboardErr);
            copyToClipboardFallback(text, clipboardErr, successMessage);
        });
    }


    function isCdpElement(el) {
        return !!(el && typeof el.closest === 'function' &&
            (el.closest('#cdp-panel') || el.closest('#cdp-toggle-btn') ||
            el.closest('#cdp-cursor-tooltip') || el.closest('#cdp-asset-action-popover')));
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

    function svgGeometrySignature(svg) {
        if (!svg || typeof svg.querySelectorAll !== 'function') return '';
        const selector = Object.keys(SVG_GEOMETRY_ATTRIBUTES).join(',');
        return Array.from(svg.querySelectorAll(selector)).map(element => {
            const tag = element.tagName.toLowerCase();
            const attributes = SVG_GEOMETRY_ATTRIBUTES[tag]
                .map(name => `${name}=${element.getAttribute(name) || ''}`)
                .join(';');
            return `${tag}:${attributes}`;
        }).join('|');
    }

    function svgElementFromCode(svgCode) {
        if (!svgCode) return null;
        try {
            const doc = new DOMParser().parseFromString(svgCode, 'image/svg+xml');
            if (doc.querySelector('parsererror')) return null;
            return doc.documentElement && doc.documentElement.tagName.toLowerCase() === 'svg'
                ? doc.documentElement
                : null;
        } catch (err) {
            logError('svgElementFromCode', err);
            return null;
        }
    }

    function fnv1aHash(text) {
        let hash = 0x811c9dc5;
        for (let index = 0; index < text.length; index += 1) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 0x01000193) >>> 0;
        }
        return hash.toString(16).padStart(8, '0');
    }

    function identifyBundledIcon(asset) {
        if (!asset || iconIndexByHash.size === 0) return [];
        const svgElement = asset.element && asset.element.tagName &&
            asset.element.tagName.toLowerCase() === 'svg' ? asset.element : null;
        if (svgElement && iconMatchCache.has(svgElement)) {
            return iconMatchCache.get(svgElement);
        }

        let signature = svgElement ? svgGeometrySignature(svgElement) : '';
        if (!signature && asset.svgCode) {
            signature = svgGeometrySignature(svgElementFromCode(asset.svgCode));
        }
        let matches = signature ? (iconIndexByHash.get(fnv1aHash(signature)) || []) : [];

        if (matches.length === 0) {
            const candidate = String(asset.name || '').toLowerCase().replace(/\.svg$/i, '');
            if (iconLibraryNames.has(candidate)) matches = [candidate];
        }
        const result = matches.slice();
        if (svgElement) iconMatchCache.set(svgElement, result);
        return result;
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
            iconMatches: [],
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
        asset.iconMatches = identifyBundledIcon(asset);
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

    function normalizeIconIndex(data) {
        if (!data || typeof data !== 'object' || !data.hashes || typeof data.hashes !== 'object') {
            throw new Error('Unexpected icon index shape');
        }
        const nextIndex = new Map();
        const nextNames = new Set();
        Object.entries(data.hashes).forEach(([hash, names]) => {
            if (!/^[0-9a-f]{8}$/i.test(hash) || !Array.isArray(names)) return;
            const validNames = names
                .map(name => String(name || '').trim())
                .filter(name => /^[a-z0-9-]+$/.test(name));
            if (validNames.length === 0) return;
            nextIndex.set(hash.toLowerCase(), validNames);
            validNames.forEach(name => nextNames.add(name));
        });
        if (nextIndex.size === 0) throw new Error('Icon index did not contain valid entries');
        iconIndexByHash = nextIndex;
        iconLibraryNames = nextNames;
        iconMatchCache = new WeakMap();
        return nextNames.size;
    }

    function loadIconIndex() {
        if (iconIndexByHash.size > 0) return Promise.resolve(iconLibraryNames.size);
        if (iconIndexLoadPromise) return iconIndexLoadPromise;
        iconIndexLoadPromise = gmRequest({
            method: 'GET',
            url: ICON_INDEX_URL,
            timeout: ASSET_FETCH_TIMEOUT_MS,
        }).then(response => {
            if (response.status < 200 || response.status >= 300) {
                throw new Error('HTTP status ' + response.status + ' for ' + ICON_INDEX_URL);
            }
            return normalizeIconIndex(JSON.parse(response.responseText));
        }).catch(err => {
            logError('loadIconIndex', err);
            iconIndexLoadPromise = null;
            return 0;
        });
        return iconIndexLoadPromise;
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
                showNotification('SVG unavailable', 'error');
                return;
            }
            const svgCode = await assetSvgCode(asset);
            if (!svgCode) throw new Error('SVG code is empty');
            copyToClipboard(svgCode, 'SVG copied');
        } catch (err) {
            logError('copyAssetSvgCode', err);
            showNotification('SVG copy failed', 'error');
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
            showNotification('Download complete', 'success');
        } catch (err) {
            logError('downloadAsset', err);
            showNotification('Download failed', 'error');
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
            await loadIconIndex();
            pageAssets = collectPageAssetCandidates();
            for (const asset of pageAssets) {
                await fetchAssetHeadMeta(asset);
            }
            showNotification(pageAssets.length + ' assets found', 'success');
        } catch (err) {
            logError('scanPageAssets', err);
            showNotification('Asset scan failed', 'error');
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
            showNotification('Site scan complete', 'success');
        } catch (err) {
            logError('scanSiteInfo', err);
            showNotification('Site scan failed', 'error');
        } finally {
            isScanningSiteInfo = false;
            if (activeTab === 'site-info') renderCurrentTab();
        }
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

    const NAVIGATION_ICON_PATHS = Object.freeze({
        panel: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/><path d="m8 9 3 3-3 3"/>',
        database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
        history: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6h4"/>',
        palette: '<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>',
        harmony: '<circle cx="15" cy="9" r="7"/><circle cx="9" cy="15" r="7"/>',
        assets: '<path d="m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16"/><path d="M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2"/><circle cx="13" cy="7" r="1" fill="currentColor"/><rect x="8" y="2" width="14" height="14" rx="2"/>',
        info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
        move: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
    });

    function navigationIcon(name, size = 20) {
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${NAVIGATION_ICON_PATHS[name]}</svg>`;
    }

    function buildUI() {
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
        panel.setAttribute('data-open', 'false');
        panel.innerHTML = `
            <aside id="cdp-sidebar-rail" aria-label="Color Detector navigation">
                <button id="cdp-toggle-btn" class="cdp-rail-btn cdp-rail-toggle" type="button" title="Open sidebar (Alt+C)" aria-label="Open Color Detector Pro" aria-controls="cdp-sidebar-content" aria-expanded="false">
                    ${navigationIcon('panel', 22)}
                </button>
                <div class="cdp-rail-divider"></div>
                <button id="cdp-color-nav" class="cdp-rail-btn" type="button" title="Color detector" aria-label="Color detector">
                    ${pipetteIcon(20)}
                </button>
                <nav id="cdp-tabs" aria-label="Color Detector sections">
                    <button class="cdp-tab cdp-tab-active" type="button" data-tab="database" title="Color database" aria-label="Color database">
                        ${navigationIcon('database')}
                        <span class="cdp-tab-label">Database</span>
                        <span class="cdp-tab-badge" id="cdp-db-count">0</span>
                    </button>
                    <button class="cdp-tab" type="button" data-tab="history" title="Detection history" aria-label="Detection history">
                        ${navigationIcon('history')}
                        <span class="cdp-tab-label">History</span>
                        <span class="cdp-tab-badge" id="cdp-history-count">0</span>
                    </button>
                    <button class="cdp-tab" type="button" data-tab="palette" title="Color palettes" aria-label="Color palettes">
                        ${navigationIcon('palette')}
                        <span class="cdp-tab-label">Palette</span>
                    </button>
                    <button class="cdp-tab" type="button" data-tab="harmony" title="Color harmony" aria-label="Color harmony">
                        ${navigationIcon('harmony')}
                        <span class="cdp-tab-label">Harmony</span>
                    </button>
                    <button class="cdp-tab" type="button" data-tab="assets" title="Page assets" aria-label="Page assets">
                        ${navigationIcon('assets')}
                        <span class="cdp-tab-label">Assets</span>
                    </button>
                    <button class="cdp-tab" type="button" data-tab="site-info" title="Site information" aria-label="Site information">
                        ${navigationIcon('info')}
                        <span class="cdp-tab-label">Site Info</span>
                    </button>
                </nav>
                <button id="cdp-side-btn" class="cdp-rail-btn cdp-side-btn" type="button" title="Move sidebar to left" aria-label="Move sidebar to left">
                    ${navigationIcon('move')}
                </button>
            </aside>

            <main id="cdp-sidebar-content" aria-hidden="true">
            <div id="cdp-header">
                <div id="cdp-header-left">
                    <div id="cdp-logo">${pipetteIcon(16)}</div>
                    <span id="cdp-title">Color Detector Pro</span>
                    <span id="cdp-version">v3.1.0</span>
                    <div id="cdp-header-notification" class="cdp-notification-info" role="status" aria-live="polite" aria-atomic="true">
                        <span id="cdp-header-notification-icon" aria-hidden="true">
                            <svg class="cdp-notification-icon-success" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg>
                            <svg class="cdp-notification-icon-error" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
                            <svg class="cdp-notification-icon-info" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>
                        </span>
                        <span id="cdp-header-notification-text"></span>
                    </div>
                </div>
            </div>

            <div id="cdp-toolbar">
                <button id="cdp-detect-btn" class="cdp-inactive">
                    <span>◎</span>
                    <span id="cdp-detect-label">Start Color Detection</span>
                </button>
                <button id="cdp-mode-btn" type="button" title="Toggle detection mode">Mode</button>
                <button id="cdp-asset-btn" type="button" class="cdp-inactive" title="Pick page assets">Asset Picker</button>
                <button id="cdp-inspect-btn" type="button" class="cdp-inactive" title="Inspect element styles">Inspect</button>
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
                        <div id="cdp-contrast-panel">
                            <div class="cdp-contrast-row">
                                <span>Contrast vs #FFFFFF</span>
                                <strong id="cdp-contrast-white">-</strong>
                            </div>
                            <div class="cdp-contrast-row">
                                <span>Contrast vs #000000</span>
                                <strong id="cdp-contrast-black">-</strong>
                            </div>
                        </div>
                        <div class="cdp-copy-hint">Click to copy color code</div>
                    </div>
                </div>
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
                    <span class="cdp-footer-shortcut"><span class="cdp-kbd">Alt</span>+<span class="cdp-kbd">C</span> Toggle</span>
                    <span class="cdp-footer-shortcut"><span class="cdp-kbd">Left</span>/<span class="cdp-kbd">Right</span> Move</span>
                </div>
            </div>
            </main>`;
        document.body.appendChild(panel);

        const assetActions = document.createElement('div');
        assetActions.id = 'cdp-asset-action-popover';
        assetActions.className = 'cdp-hidden';
        assetActions.innerHTML = `
            <div id="cdp-asset-action-title">Asset actions</div>
            <div id="cdp-asset-action-meta"></div>
            <button id="cdp-asset-copy-svg-btn" type="button">Copy SVG code</button>
            <button id="cdp-asset-download-btn" type="button">Download</button>`;
        document.body.appendChild(assetActions);

        const inspectCard = document.createElement('div');
        inspectCard.id = 'cdp-inspect-card';
        inspectCard.className = 'cdp-hidden';
        inspectCard.innerHTML = `
            <div id="cdp-inspect-card-head">
                <div>
                    <div id="cdp-inspect-card-title">Inspect</div>
                    <div id="cdp-inspect-card-subtitle">Hover an element</div>
                </div>
                <span id="cdp-inspect-card-state">Live</span>
            </div>
            <div id="cdp-inspect-card-body"></div>
            <button id="cdp-inspect-copy-btn" type="button">Copy CSS</button>`;
        document.body.appendChild(inspectCard);

        setupEventListeners();
    }

    /* ===== EVENT LISTENERS ===== */

    function browserSupportsEyeDropper() {
        return typeof window.EyeDropper === 'function';
    }

    function updateDetectionModeButton() {
        const modeBtn = document.getElementById('cdp-mode-btn');
        if (!modeBtn) return;
        const isPixel = detectionMode === DETECTION_MODE_EYEDROPPER;
        modeBtn.textContent = isPixel ? 'Pixel' : 'Style';
        modeBtn.classList.toggle('cdp-mode-pixel', isPixel);
        modeBtn.classList.toggle('cdp-mode-style', !isPixel);
        modeBtn.title = browserSupportsEyeDropper()
            ? 'Toggle detection mode: Pixel uses EyeDropper, Style uses computed CSS'
            : 'Pixel mode is not supported in this browser; using Style mode';
    }

    function updateDetectionControls() {
        const detectBtn = document.getElementById('cdp-detect-btn');
        const detectLabel = document.getElementById('cdp-detect-label');
        const colorNav = document.getElementById('cdp-color-nav');
        if (!detectBtn || !detectLabel || !colorNav) return;
        detectBtn.className = isDetecting ? 'cdp-active' : 'cdp-inactive';
        if (isDetecting) {
            detectLabel.textContent = detectionMode === DETECTION_MODE_EYEDROPPER
                ? 'Selecting pixel...'
                : 'Detecting... (click to stop)';
        } else {
            detectLabel.textContent = detectionMode === DETECTION_MODE_EYEDROPPER
                ? 'Pick Pixel Color'
                : 'Start Style Detection';
        }
        colorNav.classList.toggle('cdp-detecting', isDetecting);
    }

    function setDetecting(active) {
        if (active && isAssetPickerActive) setAssetPickerActive(false);
        if (active && isInspectActive) setInspectActive(false);
        isDetecting = active;
        updateDetectionControls();
        if (!active) {
            document.getElementById('cdp-cursor-tooltip').classList.remove('cdp-tooltip-visible');
            if (currentHighlight) {
                currentHighlight.classList.remove('cdp-element-highlight');
                currentHighlight = null;
            }
        }
    }

    function setDetectionMode(mode) {
        const nextMode = mode === DETECTION_MODE_EYEDROPPER && browserSupportsEyeDropper()
            ? DETECTION_MODE_EYEDROPPER
            : DETECTION_MODE_COMPUTED;
        if (detectionMode !== nextMode && isDetecting) {
            setDetecting(false);
        }
        detectionMode = nextMode;
        updateDetectionModeButton();
        updateDetectionControls();
    }

    function updateAssetPickerControls() {
        const assetBtn = document.getElementById('cdp-asset-btn');
        if (!assetBtn) return;
        assetBtn.className = isAssetPickerActive ? 'cdp-active' : 'cdp-inactive';
        assetBtn.textContent = isAssetPickerActive ? 'Picking assets' : 'Asset Picker';
        assetBtn.title = isAssetPickerActive
            ? (iconIndexByHash.size > 0 ? 'Hover an asset; known SVG icons are identified automatically' : 'Loading icon matcher...')
            : 'Pick page assets and identify known SVG icons';
    }

    function setAssetPickerActive(active) {
        isAssetPickerActive = active;
        updateAssetPickerControls();
        if (active) {
            if (isInspectActive) setInspectActive(false);
            if (isDetecting) setDetecting(false);
            hideAssetActionPopover();
            loadIconIndex().then(count => {
                if (!isAssetPickerActive) return;
                updateAssetPickerControls();
                if (count > 0) {
                    showNotification(count + ' local icons ready', 'success');
                } else {
                    const button = document.getElementById('cdp-asset-btn');
                    if (button) button.title = 'Icon matcher unavailable; asset picking remains active';
                }
            });
            showNotification('Asset Picker active', 'info');
            return;
        }
        hideAssetActionPopover();
        document.getElementById('cdp-cursor-tooltip').classList.remove('cdp-tooltip-visible');
        if (currentAssetHighlight) {
            currentAssetHighlight.classList.remove('cdp-element-highlight');
            currentAssetHighlight = null;
        }
    }

    function updateInspectControls() {
        const inspectBtn = document.getElementById('cdp-inspect-btn');
        if (!inspectBtn) return;
        inspectBtn.className = isInspectActive ? 'cdp-active' : 'cdp-inactive';
        inspectBtn.textContent = isInspectActive ? 'Inspecting' : 'Inspect';
    }

    function setInspectActive(active) {
        isInspectActive = active;
        updateInspectControls();
        if (active) {
            if (isAssetPickerActive) setAssetPickerActive(false);
            if (isDetecting) setDetecting(false);
            isInspectFrozen = false;
            hideInspectCard();
            showNotification('Inspect mode active', 'info');
            return;
        }
        isInspectFrozen = false;
        hideInspectCard();
        if (currentInspectHighlight) {
            currentInspectHighlight.classList.remove('cdp-element-highlight');
            currentInspectHighlight = null;
        }
    }

    function selectTab(tabName, shouldPersist, shouldRender) {
        activeTab = isValidTabName(tabName) ? tabName : 'database';
        document.querySelectorAll('.cdp-tab').forEach(tab => {
            tab.classList.toggle('cdp-tab-active', tab.dataset.tab === activeTab);
        });
        document.getElementById('cdp-search-box').style.display =
            activeTab === 'database' ? 'block' : 'none';
        if (shouldPersist) saveActiveTab(activeTab);
        if (shouldRender) renderCurrentTab();
    }

    function setPanelSide(panel, side, shouldNotify = true) {
        const nextSide = side === 'left' ? 'left' : 'right';
        const sideChanged = sidebarSide !== nextSide;
        sidebarSide = nextSide;
        panel.classList.toggle('cdp-sidebar-left', sidebarSide === 'left');
        panel.setAttribute('data-side', sidebarSide);
        const sideBtn = document.getElementById('cdp-side-btn');
        if (sideBtn) {
            const targetSide = sidebarSide === 'left' ? 'right' : 'left';
            sideBtn.title = 'Move sidebar to ' + targetSide;
            sideBtn.setAttribute('aria-label', 'Move sidebar to ' + targetSide);
        }
        safeSetValue(STORAGE_KEYS.sidebarSide, sidebarSide);
        if (shouldNotify && sideChanged) {
            showNotification('Sidebar: ' + (sidebarSide === 'left' ? 'Left' : 'Right'), 'info');
        }
    }

    function isEditableKeyboardTarget(target) {
        return !!(target && typeof target.closest === 'function' &&
            target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]'));
    }

    function setPanelOpen(panel, open) {
        const toggleBtn = document.getElementById('cdp-toggle-btn');
        const content = document.getElementById('cdp-sidebar-content');
        isPanelOpen = Boolean(open);
        panel.classList.toggle('cdp-hidden', !isPanelOpen);
        panel.setAttribute('data-open', String(isPanelOpen));
        content.setAttribute('aria-hidden', String(!isPanelOpen));
        toggleBtn.setAttribute('aria-expanded', String(isPanelOpen));
        toggleBtn.setAttribute('aria-label', isPanelOpen ? 'Close Color Detector Pro' : 'Open Color Detector Pro');
        toggleBtn.title = isPanelOpen ? 'Close sidebar (Alt+C)' : 'Open sidebar (Alt+C)';
        if (!isPanelOpen && content.contains(document.activeElement)) {
            toggleBtn.focus();
        }
    }

    function restoreUiState(panel) {
        detectionHistory = loadStoredHistory();
        updateHistoryBadge();
        setPanelSide(panel, safeGetValue(STORAGE_KEYS.sidebarSide, 'right'), false);
        const storedTab = loadStoredActiveTab();
        selectTab(storedTab, false, storedTab !== 'database');
        setDetectionMode(browserSupportsEyeDropper()
            ? DETECTION_MODE_EYEDROPPER
            : DETECTION_MODE_COMPUTED);
        updateAssetPickerControls();
        updateInspectControls();
    }

    function setupEventListeners() {
        const panel = document.getElementById('cdp-panel');
        const toggleBtn = document.getElementById('cdp-toggle-btn');
        const colorNav = document.getElementById('cdp-color-nav');
        const sideBtn = document.getElementById('cdp-side-btn');
        const detectBtn = document.getElementById('cdp-detect-btn');
        const modeBtn = document.getElementById('cdp-mode-btn');
        const assetBtn = document.getElementById('cdp-asset-btn');
        const inspectBtn = document.getElementById('cdp-inspect-btn');
        const clearBtn = document.getElementById('cdp-clear-btn');
        const searchIn = document.getElementById('cdp-search-input');
        const tabs = document.querySelectorAll('.cdp-tab');
        const detDisp = document.getElementById('cdp-detector-display');

        restoreUiState(panel);

        // Toggle
        toggleBtn.addEventListener('click', () => {
            setPanelOpen(panel, !isPanelOpen);
        });

        // Color detector navigation
        colorNav.addEventListener('click', () => {
            setPanelOpen(panel, true);
            detectBtn.focus();
        });

        // Move sidebar; tetap tersedia saat konten sidebar ditutup.
        sideBtn.addEventListener('click', () => {
            setPanelSide(panel, sidebarSide === 'left' ? 'right' : 'left');
        });

        // Detect
        detectBtn.addEventListener('click', () => {
            if (detectionMode === DETECTION_MODE_EYEDROPPER) {
                startEyeDropperDetection();
                return;
            }
            setDetecting(!isDetecting);
        });

        // Mode
        modeBtn.addEventListener('click', () => {
            if (!browserSupportsEyeDropper()) {
                setDetectionMode(DETECTION_MODE_COMPUTED);
                showNotification('Pixel unavailable', 'error');
                return;
            }
            setDetectionMode(detectionMode === DETECTION_MODE_EYEDROPPER
                ? DETECTION_MODE_COMPUTED
                : DETECTION_MODE_EYEDROPPER);
            showNotification('Mode: ' + (detectionMode === DETECTION_MODE_EYEDROPPER ? 'Pixel' : 'Style'), 'info');
        });

        // Asset Picker
        assetBtn.addEventListener('click', () => {
            setAssetPickerActive(!isAssetPickerActive);
        });

        document.getElementById('cdp-asset-copy-svg-btn').addEventListener('click', () => {
            copyCurrentPickedAssetSvg();
        });
        document.getElementById('cdp-asset-download-btn').addEventListener('click', () => {
            downloadCurrentPickedAsset();
        });

        // Inspect
        inspectBtn.addEventListener('click', () => {
            setInspectActive(!isInspectActive);
        });
        document.getElementById('cdp-inspect-copy-btn').addEventListener('click', () => {
            copyCurrentInspectCss();
        });

        // Clear
        clearBtn.addEventListener('click', () => {
            detectionHistory = [];
            updateHistoryBadge();
            saveDetectionHistory();
            renderCurrentTab();
            showNotification('History cleared', 'success');
        });

        // Copy on click
        detDisp.addEventListener('click', () => {
            const hex = document.getElementById('cdp-color-hex').getAttribute('data-hex');
            if (hex) copyToClipboard(hex);
        });
        detDisp.style.cursor = 'pointer';

        // Search
        searchIn.addEventListener('input', () => {
            if (activeTab === 'database') renderColorList(searchIn.value.trim());
        });

        // Tabs
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                setPanelOpen(panel, true);
                selectTab(tab.dataset.tab, true, true);
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
                setPanelOpen(panel, !isPanelOpen);
            }
            if (isPanelOpen && !isEditableKeyboardTarget(e.target) && e.key === 'ArrowLeft') {
                e.preventDefault();
                setPanelSide(panel, 'left');
                return;
            }
            if (isPanelOpen && !isEditableKeyboardTarget(e.target) && e.key === 'ArrowRight') {
                e.preventDefault();
                setPanelSide(panel, 'right');
                return;
            }
            if (e.key === 'Escape' && isDetecting) {
                setDetecting(false);
            }
            if (e.key === 'Escape' && isAssetPickerActive) {
                setAssetPickerActive(false);
            }
            if (e.key === 'Escape' && isInspectActive) {
                setInspectActive(false);
            }
        }));
    }

    /* ===== MOUSE DETECTION ===== */

    function isIgnoredDetectionTarget(target) {
        return !target || typeof target.closest !== 'function' || isCdpElement(target);
    }

    function getColorName(hex) {
        const closest = findClosestColor(hex);
        return closest ? closest['Color names'] : 'Unknown';
    }

    function recordDetectedColor(hex, elementName) {
        const normalizedHex = normalizeHex(hex);
        if (!normalizedHex) {
            logError('recordDetectedColor', new Error('Invalid color: ' + hex));
            return null;
        }
        const name = getColorName(normalizedHex);
        const record = {
            hex: normalizedHex,
            name,
            time: new Date().toLocaleTimeString(),
            element: elementName || 'pixel',
        };
        updatePreview(record.hex, record.name);
        detectionHistory.unshift(record);
        if (detectionHistory.length > MAX_HISTORY_ITEMS) detectionHistory.pop();
        updateHistoryBadge();
        saveDetectionHistory();
        renderCurrentTab();
        return record;
    }

    async function startEyeDropperDetection() {
        if (isEyeDropperOpen) return;
        if (!browserSupportsEyeDropper()) {
            setDetectionMode(DETECTION_MODE_COMPUTED);
            setDetecting(true);
            showNotification('Using Style mode', 'info');
            return;
        }

        let keepComputedModeActive = false;
        isEyeDropperOpen = true;
        setDetecting(true);
        try {
            const result = await new window.EyeDropper().open();
            const hex = normalizeHex(result && result.sRGBHex);
            if (!hex) {
                throw new Error('EyeDropper returned an invalid color');
            }
            const record = recordDetectedColor(hex, 'pixel');
            if (record) copyToClipboard(record.hex);
        } catch (err) {
            logError('startEyeDropperDetection', err);
            if (err && err.name === 'AbortError') {
                showNotification('Selection canceled', 'info');
            } else {
                showNotification('Pixel mode failed', 'error');
                setDetectionMode(DETECTION_MODE_COMPUTED);
                setDetecting(true);
                keepComputedModeActive = true;
            }
        } finally {
            isEyeDropperOpen = false;
            if (!keepComputedModeActive) setDetecting(false);
        }
    }

    function positionTooltip(e, tip) {
        const tx = e.clientX + 18, ty = e.clientY + 18;
        tip.style.left = tx + 'px'; tip.style.top = ty + 'px';
        const tr = tip.getBoundingClientRect();
        if (tr.right > window.innerWidth) tip.style.left = (e.clientX - tr.width - 10) + 'px';
        if (tr.bottom > window.innerHeight) tip.style.top = (e.clientY - tr.height - 10) + 'px';
    }

    function assetIconMatchLabel(asset) {
        if (!asset || !Array.isArray(asset.iconMatches) || asset.iconMatches.length === 0) return '';
        return asset.iconMatches.join(' / ');
    }

    function clearAssetHighlight() {
        if (currentAssetHighlight) {
            currentAssetHighlight.classList.remove('cdp-element-highlight');
            currentAssetHighlight = null;
        }
    }

    function handleAssetPickerMove(e) {
        const target = e.target;
        if (isIgnoredDetectionTarget(target)) return;
        const asset = detectAssetFromElement(target);
        const tip = document.getElementById('cdp-cursor-tooltip');
        if (!asset) {
            clearAssetHighlight();
            tip.classList.remove('cdp-tooltip-visible');
            return;
        }

        const highlightTarget = asset.element || target;
        if (currentAssetHighlight && currentAssetHighlight !== highlightTarget) {
            currentAssetHighlight.classList.remove('cdp-element-highlight');
        }
        highlightTarget.classList.add('cdp-element-highlight');
        currentAssetHighlight = highlightTarget;

        const icon = document.getElementById('cdp-tooltip-swatch');
        icon.classList.add('cdp-asset-tooltip-icon');
        icon.style.background = '';
        icon.textContent = asset.badge;
        const iconMatch = assetIconMatchLabel(asset);
        document.getElementById('cdp-tooltip-name').textContent = iconMatch
            ? 'Local icon: ' + iconMatch
            : asset.typeLabel;
        document.getElementById('cdp-tooltip-hex').textContent = iconMatch
            ? asset.typeLabel + ' - exact geometry match'
            : asset.name;
        tip.classList.add('cdp-tooltip-visible');
        positionTooltip(e, tip);
    }

    function showAssetActionPopover(asset, clientX, clientY) {
        currentPickedAsset = asset;
        const popover = document.getElementById('cdp-asset-action-popover');
        const iconMatch = assetIconMatchLabel(asset);
        document.getElementById('cdp-asset-action-title').textContent = iconMatch
            ? 'Local icon: ' + iconMatch
            : asset.typeLabel;
        document.getElementById('cdp-asset-action-meta').textContent = iconMatch
            ? asset.typeLabel + ' - exact geometry match'
            : asset.name;
        document.getElementById('cdp-asset-copy-svg-btn').disabled = !assetCanCopySvg(asset);
        popover.classList.remove('cdp-hidden');
        popover.style.left = clientX + 12 + 'px';
        popover.style.top = clientY + 12 + 'px';
        const rect = popover.getBoundingClientRect();
        if (rect.right > window.innerWidth) popover.style.left = (clientX - rect.width - 12) + 'px';
        if (rect.bottom > window.innerHeight) popover.style.top = (clientY - rect.height - 12) + 'px';
    }

    function hideAssetActionPopover() {
        currentPickedAsset = null;
        const popover = document.getElementById('cdp-asset-action-popover');
        if (popover) popover.classList.add('cdp-hidden');
    }

    async function copyCurrentPickedAssetSvg() {
        if (!currentPickedAsset) return;
        await copyAssetSvgCode(currentPickedAsset);
    }

    async function downloadCurrentPickedAsset() {
        if (!currentPickedAsset) return;
        try {
            await downloadAsset(currentPickedAsset);
        } catch (err) {
            logError('downloadCurrentPickedAsset', err);
        }
    }

    function clearInspectHighlight() {
        if (currentInspectHighlight) {
            currentInspectHighlight.classList.remove('cdp-element-highlight');
            currentInspectHighlight = null;
        }
    }

    function positionInspectCard(card, clientX, clientY) {
        card.style.left = clientX + 16 + 'px';
        card.style.top = clientY + 16 + 'px';
        const rect = card.getBoundingClientRect();
        if (rect.right > window.innerWidth) card.style.left = (clientX - rect.width - 12) + 'px';
        if (rect.bottom > window.innerHeight) card.style.top = (clientY - rect.height - 12) + 'px';
    }

    function renderInspectCard(data, clientX, clientY, frozen) {
        currentInspectData = data;
        const card = document.getElementById('cdp-inspect-card');
        document.getElementById('cdp-inspect-card-title').textContent = data.title;
        document.getElementById('cdp-inspect-card-subtitle').textContent = data.subtitle;
        document.getElementById('cdp-inspect-card-state').textContent = frozen ? 'Pinned' : 'Live';
        const body = document.getElementById('cdp-inspect-card-body');
        body.innerHTML = data.rows.map(row => `
            <div class="cdp-inspect-row">
                <span>${escapeHtml(row.property)}</span>
                <strong>${escapeHtml(row.value)}</strong>
            </div>`).join('');
        card.classList.remove('cdp-hidden');
        positionInspectCard(card, clientX, clientY);
    }

    function hideInspectCard() {
        currentInspectData = null;
        const card = document.getElementById('cdp-inspect-card');
        if (card) card.classList.add('cdp-hidden');
    }

    function handleInspectMove(e) {
        if (isInspectFrozen) return;
        const target = e.target;
        if (isIgnoredDetectionTarget(target)) return;
        const data = inspectDataFromElement(target);
        if (currentInspectHighlight && currentInspectHighlight !== target) {
            currentInspectHighlight.classList.remove('cdp-element-highlight');
        }
        target.classList.add('cdp-element-highlight');
        currentInspectHighlight = target;
        renderInspectCard(data, e.clientX, e.clientY, false);
    }

    function freezeInspectCard(target, clientX, clientY) {
        const data = inspectDataFromElement(target);
        isInspectFrozen = true;
        renderInspectCard(data, clientX, clientY, true);
        showNotification('Inspector pinned', 'info');
    }

    function copyCurrentInspectCss() {
        if (!currentInspectData) {
            showNotification('Nothing to copy', 'error');
            return;
        }
        copyToClipboard(currentInspectData.cssText, 'CSS copied');
    }

    function handleMouseMove(e) {
        if (isInspectActive) {
            handleInspectMove(e);
            return;
        }
        if (isAssetPickerActive) {
            handleAssetPickerMove(e);
            return;
        }
        if (!isDetecting || detectionMode !== DETECTION_MODE_COMPUTED) return;
        const target = e.target;
        if (isIgnoredDetectionTarget(target)) return;

        if (currentHighlight && currentHighlight !== target) {
            currentHighlight.classList.remove('cdp-element-highlight');
        }
        target.classList.add('cdp-element-highlight');
        currentHighlight = target;

        const hex = getElementColor(target);
        if (!hex) return;

        const colorName = getColorName(hex);
        updatePreview(hex, colorName);

        // Tooltip
        const tip = document.getElementById('cdp-cursor-tooltip');
        tip.classList.add('cdp-tooltip-visible');
        positionTooltip(e, tip);

        const swatch = document.getElementById('cdp-tooltip-swatch');
        swatch.classList.remove('cdp-asset-tooltip-icon');
        swatch.textContent = '';
        swatch.style.background = hex;
        document.getElementById('cdp-tooltip-name').textContent = colorName;
        document.getElementById('cdp-tooltip-hex').textContent = hex;
    }

    function handleDetectionClick(e) {
        if (isInspectActive) {
            const target = e.target;
            if (isIgnoredDetectionTarget(target)) return;
            e.preventDefault(); e.stopPropagation();
            freezeInspectCard(target, e.clientX, e.clientY);
            return;
        }
        if (isAssetPickerActive) {
            const target = e.target;
            if (isIgnoredDetectionTarget(target)) return;
            const asset = detectAssetFromElement(target);
            if (!asset) return;
            e.preventDefault(); e.stopPropagation();
            showAssetActionPopover(asset, e.clientX, e.clientY);
            return;
        }
        if (!isDetecting || detectionMode !== DETECTION_MODE_COMPUTED) return;
        const target = e.target;
        if (isIgnoredDetectionTarget(target)) return;

        e.preventDefault(); e.stopPropagation();

        const hex = getElementColor(target);
        if (!hex) return;

        const record = recordDetectedColor(hex, target.tagName.toLowerCase());
        if (record) copyToClipboard(record.hex);
    }

    /* ===== RENDER ===== */

    function renderCurrentTab() {
        const tab = isValidTabName(activeTab) ? activeTab : 'database';
        if (tab === 'database') renderColorList(document.getElementById('cdp-search-input').value.trim());
        else if (tab === 'history') renderHistory();
        else if (tab === 'palette') renderPalette();
        else if (tab === 'harmony') renderHarmony();
        else if (tab === 'assets') renderAssets();
        else if (tab === 'site-info') renderSiteInfo();
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
        document.getElementById('cdp-contrast-white').textContent = formatContrastRatio(hex, '#FFFFFF');
        document.getElementById('cdp-contrast-black').textContent = formatContrastRatio(hex, '#000000');
    }

    function getPaletteGroups() {
        return [
            { name: 'Warm Sunset', colors: ['#FF6B6B','#FFA07A','#FFD93D','#FF8C42','#FF5252','#E74C3C'] },
            { name: 'Ocean Breeze', colors: ['#0077B6','#00B4D8','#90E0EF','#CAF0F8','#023E8A','#48CAE4'] },
            { name: 'Forest', colors: ['#2D6A4F','#40916C','#52B788','#74C69D','#95D5B2','#B7E4C7'] },
            { name: 'Pastel Dream', colors: ['#FFB5E8','#FF9CEE','#B28DFF','#85E3FF','#BFFCC6','#FFC9DE'] },
            { name: 'Midnight', colors: ['#0F0F23','#1A1A2E','#16213E','#0F3460','#533483','#E94560'] },
            { name: 'Autumn', colors: ['#D4A373','#CCD5AE','#E9EDC9','#FEFAE0','#FAEDCD','#A98467'] },
            { name: 'Purple Rain', colors: ['#667eea','#764ba2','#f093fb','#5a67d8','#9F7AEA','#B794F4'] },
            { name: 'Neon', colors: ['#FF006E','#FB5607','#FFBE0B','#3A86FF','#8338EC','#06D6A0'] },
        ];
    }

    function renderExportBar(source, count) {
        const disabled = count > 0 ? '' : ' disabled';
        return `
            <div class="cdp-export-bar">
                <span class="cdp-export-label">Export</span>
                <button class="cdp-export-btn" data-export-source="${source}" data-export-format="css"${disabled}>CSS vars</button>
                <button class="cdp-export-btn" data-export-source="${source}" data-export-format="json"${disabled}>JSON</button>
                <button class="cdp-export-btn" data-export-source="${source}" data-export-format="hex"${disabled}>Hex list</button>
            </div>`;
    }

    function formatCssCustomProperties(entries, prefix) {
        if (entries.length === 0) return '';
        const lines = entries.map((entry, index) =>
            `    --cdp-${prefix}-${String(index + 1).padStart(2, '0')}: ${entry.hex};`
        );
        return `:root {\n${lines.join('\n')}\n}`;
    }

    function paletteEntries() {
        const entries = [];
        getPaletteGroups().forEach(group => {
            group.colors.forEach(hex => {
                entries.push({ name: group.name, hex });
            });
        });
        return entries;
    }

    function exportColors(source, format) {
        try {
            if (source !== 'history' && source !== 'palette') {
                throw new Error('Unsupported export source: ' + source);
            }
            const isHistory = source === 'history';
            const entries = isHistory
                ? detectionHistory.map(item => ({ name: item.name, hex: item.hex }))
                : paletteEntries();
            if (entries.length === 0) {
                showNotification('Nothing to export', 'info');
                return;
            }

            let text = '';
            if (format === 'css') {
                text = formatCssCustomProperties(entries, isHistory ? 'history' : 'palette');
            } else if (format === 'json') {
                text = JSON.stringify(isHistory
                    ? detectionHistory.map(item => ({
                        hex: item.hex,
                        name: item.name,
                        time: item.time,
                        element: item.element,
                    }))
                    : getPaletteGroups(), null, 2);
            } else if (format === 'hex') {
                text = entries.map(entry => entry.hex).join('\n');
            } else {
                throw new Error('Unsupported export format: ' + format);
            }

            copyToClipboard(text, 'Export copied');
        } catch (err) {
            logError('exportColors ' + source + ' ' + format, err);
            showNotification('Export failed', 'error');
        }
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
            const rs = rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : '-';
            html += `
                <div class="cdp-color-item" data-hex="${code}" data-name="${name}">
                    <div class="cdp-color-swatch" style="background:${code};"></div>
                    <div class="cdp-color-item-info">
                        <div class="cdp-color-item-name">${name}</div>
                        <div class="cdp-color-item-code">${code} - rgb(${rs})</div>
                    </div>
                    <button class="cdp-color-item-copy" data-copy="${code}">Copy</button>
                </div>`;
        });
        container.innerHTML = html;
        attachListHandlers(container);
    }

    function renderHistory() {
        const container = document.getElementById('cdp-color-list-container');
        let html = renderExportBar('history', detectionHistory.length);
        if (detectionHistory.length === 0) {
            html += `
                <div class="cdp-empty-state">
                    <div class="cdp-empty-state-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></div>
                    <div class="cdp-empty-state-text">No detection history yet.<br>Pick a pixel color or enable style detection.</div>
                </div>`;
            container.innerHTML = html;
            attachExportHandlers(container);
            return;
        }
        html += '<div class="cdp-category-header">Recent Detection History</div>';
        detectionHistory.forEach(item => {
            const hex = escapeHtml(item.hex);
            const name = escapeHtml(item.name);
            html += `
                <div class="cdp-color-item" data-hex="${hex}" data-name="${name}">
                    <div class="cdp-color-swatch" style="background:${hex};"></div>
                    <div class="cdp-color-item-info">
                        <div class="cdp-color-item-name">${name}</div>
                        <div class="cdp-color-item-code">${hex} - &lt;${escapeHtml(item.element)}&gt;</div>
                    </div>
                    <span class="cdp-history-time">${escapeHtml(item.time)}</span>
                    <button class="cdp-color-item-copy cdp-copy-visible" data-copy="${hex}">Copy</button>
                </div>`;
        });
        container.innerHTML = html;
        attachExportHandlers(container);
        attachListHandlers(container);
    }

    function renderPalette() {
        const container = document.getElementById('cdp-color-list-container');
        const palettes = getPaletteGroups();
        let html = renderExportBar('palette', paletteEntries().length);
        palettes.forEach(p => {
            html += `<div class="cdp-category-header">${escapeHtml(p.name)}</div>`;
            html += '<div class="cdp-palette-grid">';
            p.colors.forEach(c => {
                const hex = escapeHtml(c);
                const cc = getContrastColor(c);
                html += `<div class="cdp-palette-swatch" data-hex="${hex}" style="background:${hex};color:${cc};">${hex}</div>`;
            });
            html += '</div>';
        });
        container.innerHTML = html;
        attachExportHandlers(container);
        attachPaletteHandlers(container);
    }

    function getHarmonySchemes(hex) {
        const rgb = hexToRgb(hex);
        if (!rgb) return [];
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        const lightLow = clampNumber(hsl.l - 30, 8, 92);
        const lightMidLow = clampNumber(hsl.l - 15, 8, 92);
        const lightMidHigh = clampNumber(hsl.l + 15, 8, 92);
        const lightHigh = clampNumber(hsl.l + 30, 8, 92);
        return [
            {
                key: 'complementary',
                name: 'Complementary',
                colors: [hex, hslToHex(hsl.h + 180, hsl.s, hsl.l)],
            },
            {
                key: 'analogous',
                name: 'Analogous',
                colors: [
                    hslToHex(hsl.h - 30, hsl.s, hsl.l),
                    hex,
                    hslToHex(hsl.h + 30, hsl.s, hsl.l),
                ],
            },
            {
                key: 'triadic',
                name: 'Triadic',
                colors: [
                    hex,
                    hslToHex(hsl.h + 120, hsl.s, hsl.l),
                    hslToHex(hsl.h + 240, hsl.s, hsl.l),
                ],
            },
            {
                key: 'monochromatic',
                name: 'Monochromatic',
                colors: [
                    hslToHex(hsl.h, hsl.s, lightLow),
                    hslToHex(hsl.h, hsl.s, lightMidLow),
                    hex,
                    hslToHex(hsl.h, hsl.s, lightMidHigh),
                    hslToHex(hsl.h, hsl.s, lightHigh),
                ],
            },
        ];
    }

    function renderHarmony() {
        const container = document.getElementById('cdp-color-list-container');
        if (detectionHistory.length === 0) {
            container.innerHTML = `
                <div class="cdp-empty-state">
                    <div class="cdp-empty-state-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M3 12h18"/><path d="m5 5 14 14"/><path d="m19 5-14 14"/></svg></div>
                    <div class="cdp-empty-state-text">No detected color yet.<br>Pick a pixel color or use style detection first.</div>
                </div>`;
            return;
        }

        const source = detectionHistory[0];
        const sourceHex = normalizeHex(source.hex);
        const schemes = sourceHex ? getHarmonySchemes(sourceHex) : [];
        if (schemes.length === 0) {
            logError('renderHarmony', new Error('Last detected color is invalid'));
            container.innerHTML = `
                <div class="cdp-empty-state">
                    <div class="cdp-empty-state-text">Harmony could not be generated for the last detected color.</div>
                </div>`;
            return;
        }

        let html = `
            <div class="cdp-harmony-source">
                Source color: <strong>${escapeHtml(sourceHex)}</strong> ${escapeHtml(source.name)}
            </div>`;
        schemes.forEach(scheme => {
            html += `
                <div class="cdp-harmony-scheme" data-harmony-key="${scheme.key}">
                    <div class="cdp-harmony-heading">
                        <div class="cdp-harmony-title">${scheme.name}</div>
                        <button class="cdp-harmony-copy" data-harmony-copy="${scheme.key}">Copy scheme</button>
                    </div>
                    <div class="cdp-palette-grid">`;
            scheme.colors.forEach(color => {
                const hex = escapeHtml(color);
                const contrast = getContrastColor(color);
                html += `<div class="cdp-palette-swatch" data-hex="${hex}" style="background:${hex};color:${contrast};">${hex}</div>`;
            });
            html += `
                    </div>
                </div>`;
        });
        container.innerHTML = html;
        attachHarmonyHandlers(container, schemes);
    }

    function selectedPageAssets(container) {
        const selectedIds = new Set();
        container.querySelectorAll('.cdp-asset-select:checked').forEach(input => {
            selectedIds.add(input.dataset.assetId);
        });
        pageAssets.forEach(asset => {
            asset.selected = selectedIds.has(asset.id);
        });
        return pageAssets.filter(asset => asset.selected);
    }

    function renderAssetThumbnail(asset) {
        if (asset.thumbnailUrl) {
            return `<img src="${escapeHtml(asset.thumbnailUrl)}" alt="${escapeHtml(asset.name)}">`;
        }
        return `<div class="cdp-asset-thumb-placeholder">${escapeHtml(asset.badge || 'Asset')}</div>`;
    }

    function renderAssets() {
        const container = document.getElementById('cdp-color-list-container');
        const scanLabel = isScanningAssets ? 'Scanning...' : 'Scan Page';
        const disabled = isScanningAssets || isDownloadingAssets ? ' disabled' : '';
        let html = `
            <div class="cdp-assets-toolbar">
                <button class="cdp-assets-action" id="cdp-scan-assets-btn" type="button"${disabled}>${scanLabel}</button>
                <button class="cdp-assets-action" id="cdp-download-selected-assets-btn" type="button"${disabled}>Download Selected</button>
                <button class="cdp-assets-action" id="cdp-download-all-assets-btn" type="button"${disabled}>Download All</button>
                <span class="cdp-assets-count">${pageAssets.length} assets</span>
            </div>`;

        if (isScanningAssets) {
            html += '<div class="cdp-loading-spinner"></div>';
        } else if (pageAssets.length === 0) {
            html += `
                <div class="cdp-empty-state">
                    <div class="cdp-empty-state-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 14l2.5-3 2 2.5L15 10l3 4"/></svg></div>
                    <div class="cdp-empty-state-text">Scan the page to collect SVG and image assets.</div>
                </div>`;
        } else {
            html += '<div class="cdp-assets-grid">';
            pageAssets.forEach(asset => {
                const checked = asset.selected ? ' checked' : '';
                const copyDisabled = assetCanCopySvg(asset) ? '' : ' disabled';
                const iconMatch = assetIconMatchLabel(asset);
                const matchMeta = iconMatch
                    ? `<div class="cdp-asset-meta cdp-asset-icon-match">Local icon: ${escapeHtml(iconMatch)}</div>`
                    : '';
                html += `
                    <div class="cdp-asset-card" data-asset-id="${escapeHtml(asset.id)}">
                        <div class="cdp-asset-thumb">${renderAssetThumbnail(asset)}</div>
                        <div class="cdp-asset-card-body">
                            <label class="cdp-asset-check-row">
                                <input type="checkbox" class="cdp-asset-select" data-asset-id="${escapeHtml(asset.id)}"${checked}>
                                <span class="cdp-asset-name">${escapeHtml(asset.name)}</span>
                            </label>
                            <div class="cdp-asset-meta">${escapeHtml(asset.typeLabel)}</div>
                            ${matchMeta}
                            <div class="cdp-asset-meta">${escapeHtml(asset.dimensions)} - ${escapeHtml(asset.sizeLabel)}</div>
                            <div class="cdp-asset-card-actions">
                                <button class="cdp-asset-small-btn cdp-asset-copy-svg" data-asset-id="${escapeHtml(asset.id)}" type="button"${copyDisabled}>Copy SVG</button>
                                <button class="cdp-asset-small-btn cdp-asset-download-one" data-asset-id="${escapeHtml(asset.id)}" type="button">Download</button>
                            </div>
                        </div>
                    </div>`;
            });
            html += '</div>';
        }

        container.innerHTML = html;
        attachAssetTabHandlers(container);
    }

    function attachAssetTabHandlers(container) {
        const scanBtn = document.getElementById('cdp-scan-assets-btn');
        const selectedBtn = document.getElementById('cdp-download-selected-assets-btn');
        const allBtn = document.getElementById('cdp-download-all-assets-btn');
        if (scanBtn) {
            scanBtn.addEventListener('click', () => {
                scanPageAssets();
            });
        }
        if (selectedBtn) {
            selectedBtn.addEventListener('click', () => {
                const selected = selectedPageAssets(container);
                if (selected.length === 0) {
                    showNotification('No assets selected', 'info');
                    return;
                }
                downloadAssetsSequential(selected);
            });
        }
        if (allBtn) {
            allBtn.addEventListener('click', () => {
                downloadAssetsSequential(pageAssets);
            });
        }
        container.querySelectorAll('.cdp-asset-select').forEach(input => {
            input.addEventListener('change', () => {
                const asset = pageAssets.find(item => item.id === input.dataset.assetId);
                if (asset) asset.selected = input.checked;
            });
        });
        container.querySelectorAll('.cdp-asset-copy-svg').forEach(btn => {
            btn.addEventListener('click', () => {
                const asset = pageAssets.find(item => item.id === btn.dataset.assetId);
                if (asset) copyAssetSvgCode(asset);
            });
        });
        container.querySelectorAll('.cdp-asset-download-one').forEach(btn => {
            btn.addEventListener('click', () => {
                const asset = pageAssets.find(item => item.id === btn.dataset.assetId);
                if (asset) downloadAsset(asset).catch(err => logError('download asset card', err));
            });
        });
    }

    function renderSiteFonts() {
        if (siteInfo.fonts.length === 0) {
            return '<div class="cdp-empty-state-text">No font usage captured yet.</div>';
        }
        return `
            <div class="cdp-site-list">
                ${siteInfo.fonts.map(font => `
                    <div class="cdp-site-row">
                        <div class="cdp-site-row-title">
                            <span>${escapeHtml(font.name)}</span>
                            <span>${font.count} uses</span>
                        </div>
                        <div class="cdp-site-row-meta">${escapeHtml(font.status || 'computed style')}</div>
                        <div class="cdp-site-row-meta">${escapeHtml(font.sample || 'No text sample')}</div>
                    </div>`).join('')}
            </div>`;
    }

    function renderSiteColors() {
        if (siteInfo.colors.length === 0) {
            return '<div class="cdp-empty-state-text">No colors captured yet.</div>';
        }
        return `
            <div class="cdp-site-color-grid">
                ${siteInfo.colors.slice(0, 72).map(color => `
                    <div class="cdp-site-color-chip" data-copy-color="${escapeHtml(color.hex)}" style="background:${escapeHtml(color.hex)};color:${getContrastColor(color.hex)};">
                        <span>${escapeHtml(color.hex)}<br>${color.count} uses</span>
                    </div>`).join('')}
            </div>`;
    }

    function renderSiteTokens() {
        if (siteInfo.tokens.length === 0) {
            return '<div class="cdp-empty-state-text">No :root custom properties found.</div>';
        }
        return `
            <div class="cdp-site-list">
                ${siteInfo.tokens.slice(0, 160).map(token => `
                    <div class="cdp-site-row cdp-token-row" data-token-name="${escapeHtml(token.name)}" data-token-value="${escapeHtml(token.value)}">
                        <code>${escapeHtml(token.name)}</code>
                        <code>${escapeHtml(token.value)}</code>
                    </div>`).join('')}
            </div>`;
    }

    function renderSiteTechnologies() {
        if (siteInfo.technologies.length === 0) {
            return '<div class="cdp-empty-state-text">No framework or CMS signal detected.</div>';
        }
        return `
            <div class="cdp-site-list">
                ${siteInfo.technologies.map(item => `
                    <div class="cdp-site-row">
                        <div class="cdp-site-row-title">
                            <span>${escapeHtml(item.name)}</span>
                            <span>${escapeHtml(item.confidence)}</span>
                        </div>
                        <div class="cdp-site-row-meta">${escapeHtml(item.evidence)}</div>
                    </div>`).join('')}
            </div>`;
    }

    function renderSiteInfoSection(title, bodyHtml) {
        return `
            <div class="cdp-site-section">
                <div class="cdp-category-header">${escapeHtml(title)}</div>
                <div class="cdp-site-section-body">${bodyHtml}</div>
            </div>`;
    }

    function renderSiteInfo() {
        const container = document.getElementById('cdp-color-list-container');
        const disabled = isScanningSiteInfo ? ' disabled' : '';
        const scanLabel = isScanningSiteInfo ? 'Scanning...' : 'Scan Page';
        const scanned = siteInfo.scannedAt
            ? `${siteInfo.scannedCount} elements scanned at ${siteInfo.scannedAt}`
            : `${siteInfo.scannedCount} elements scanned`;
        let html = `
            <div class="cdp-site-toolbar">
                <button class="cdp-site-action" id="cdp-scan-site-info-btn" type="button"${disabled}>${scanLabel}</button>
                <span class="cdp-site-status">${escapeHtml(scanned)}${siteInfo.limitReached ? ' (limited)' : ''}</span>
            </div>`;
        if (!siteInfo.scannedAt && !isScanningSiteInfo) {
            html += `
                <div class="cdp-empty-state">
                    <div class="cdp-empty-state-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/></svg></div>
                    <div class="cdp-empty-state-text">Scan the page to collect fonts, colors, tokens, and technology signals.</div>
                </div>`;
        } else {
            if (isScanningSiteInfo) html += '<div class="cdp-loading-spinner"></div>';
            html += renderSiteInfoSection('Fonts in use', renderSiteFonts());
            html += renderSiteInfoSection('Site palette', renderSiteColors());
            html += renderSiteInfoSection('Root custom properties', renderSiteTokens());
            html += renderSiteInfoSection('Technology signals', renderSiteTechnologies());
        }
        container.innerHTML = html;
        attachSiteInfoHandlers(container);
    }

    function attachSiteInfoHandlers(container) {
        const scanBtn = document.getElementById('cdp-scan-site-info-btn');
        if (scanBtn) {
            scanBtn.addEventListener('click', () => {
                scanSiteInfo();
            });
        }
        container.querySelectorAll('.cdp-site-color-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                copyToClipboard(chip.dataset.copyColor);
            });
        });
        container.querySelectorAll('.cdp-token-row').forEach(row => {
            row.addEventListener('click', () => {
                copyToClipboard(`${row.dataset.tokenName}: ${row.dataset.tokenValue};`, 'Token copied');
            });
        });
    }

    function attachExportHandlers(container) {
        container.querySelectorAll('.cdp-export-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                exportColors(btn.dataset.exportSource, btn.dataset.exportFormat);
            });
        });
    }

    function attachPaletteHandlers(container) {
        container.querySelectorAll('.cdp-palette-swatch').forEach(sw => {
            sw.addEventListener('click', () => {
                const hex = sw.dataset.hex;
                const closest = findClosestColor(hex);
                updatePreview(hex, closest ? closest['Color names'] : hex);
                copyToClipboard(hex);
            });
        });
    }

    function attachHarmonyHandlers(container, schemes) {
        attachPaletteHandlers(container);
        container.querySelectorAll('.cdp-harmony-copy').forEach(btn => {
            btn.addEventListener('click', () => {
                try {
                    const scheme = schemes.find(item => item.key === btn.dataset.harmonyCopy);
                    if (!scheme) throw new Error('Harmony scheme not found: ' + btn.dataset.harmonyCopy);
                    copyToClipboard(scheme.colors.join('\n'), 'Scheme copied');
                } catch (err) {
                    logError('copyHarmonyScheme', err);
                    showNotification('Copy failed', 'error');
                }
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

    function normalizeColorDatabase(data) {
        if (!Array.isArray(data)) {
            throw new Error('Unexpected response shape: expected an array');
        }
        const colors = [];
        data.forEach(item => {
            if (!item || typeof item !== 'object') return;
            const code = normalizeHex(item.Code);
            const name = String(item['Color names'] || '').trim();
            if (!code || !name) return;
            colors.push({ 'Color names': name, Code: code });
        });
        if (colors.length === 0) {
            throw new Error('Database did not contain valid colors');
        }
        return colors;
    }

    function cloneFallbackColorDatabase() {
        return FALLBACK_COLOR_DATABASE.map(color => ({
            'Color names': color['Color names'],
            Code: color.Code,
        }));
    }

    function loadColorCache() {
        const cached = readJsonValue(STORAGE_KEYS.colorCache, null);
        if (!cached) return null;
        try {
            const savedAt = Number(cached.savedAt);
            if (!Number.isFinite(savedAt)) {
                throw new Error('Cached database timestamp is invalid');
            }
            return {
                data: normalizeColorDatabase(cached.data),
                savedAt,
            };
        } catch (err) {
            logError('loadColorCache', err);
            return null;
        }
    }

    function saveColorCache(data) {
        writeJsonValue(STORAGE_KEYS.colorCache, {
            data,
            savedAt: Date.now(),
        });
    }

    function setDatabaseStatus(statusText) {
        document.getElementById('cdp-status-text').textContent = statusText;
    }

    function applyColorDatabase(data, statusText) {
        colorDatabase = data;
        document.getElementById('cdp-db-count').textContent = colorDatabase.length;
        setDatabaseStatus(statusText);
        renderCurrentTab();
    }

    function applyFallbackColorDatabase(statusText) {
        applyColorDatabase(cloneFallbackColorDatabase(), statusText);
    }

    function handleColorRequestFailure(statusText, detail, isBackgroundRefresh) {
        logError('fetchColors - ' + statusText, detail);
        const cached = loadColorCache();
        if (cached) {
            if (isBackgroundRefresh && colorDatabase.length > 0) {
                setDatabaseStatus('Using cached colors; refresh failed');
            } else {
                applyColorDatabase(cached.data, 'Using cached colors; refresh failed');
            }
            return;
        }
        applyFallbackColorDatabase('Using bundled fallback colors');
    }

    function refreshColorDatabase(isBackgroundRefresh) {
        try {
            GM_xmlhttpRequest({
                method: 'GET',
                url: COLOR_DATABASE_URL,
                timeout: FETCH_TIMEOUT_MS,
                onload(response) {
                    try {
                        if (response.status < 200 || response.status >= 300) {
                            throw new Error('HTTP status ' + response.status);
                        }
                        const data = normalizeColorDatabase(JSON.parse(response.responseText));
                        saveColorCache(data);
                        applyColorDatabase(data, isBackgroundRefresh
                            ? data.length + ' colors refreshed in background'
                            : data.length + ' colors loaded successfully');
                    } catch (err) {
                        handleColorRequestFailure('Failed to load database', err, isBackgroundRefresh);
                    }
                },
                onerror(response) {
                    handleColorRequestFailure('Connection error',
                        { url: COLOR_DATABASE_URL, status: response && response.status },
                        isBackgroundRefresh);
                },
                ontimeout() {
                    handleColorRequestFailure('Connection timed out',
                        { url: COLOR_DATABASE_URL, timeoutMs: FETCH_TIMEOUT_MS },
                        isBackgroundRefresh);
                }
            });
        } catch (err) {
            handleColorRequestFailure('Request failed to start', err, isBackgroundRefresh);
        }
    }

    function fetchColors() {
        const cached = loadColorCache();
        if (cached) {
            const isStale = Date.now() - cached.savedAt > COLOR_CACHE_TTL_MS;
            applyColorDatabase(cached.data, isStale
                ? cached.data.length + ' cached colors loaded; refreshing'
                : cached.data.length + ' cached colors loaded');
            if (isStale) refreshColorDatabase(true);
            return;
        }
        refreshColorDatabase(false);
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
