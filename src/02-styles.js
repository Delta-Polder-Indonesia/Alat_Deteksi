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

