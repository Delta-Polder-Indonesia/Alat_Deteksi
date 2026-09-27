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
            --cdp-transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease;
        }

        /* ----- SIDEBAR PANEL ----- */
        #cdp-panel {
            position: fixed;
            top: 0;
            right: 0;
            width: var(--cdp-sidebar-width);
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
            flex-direction: column;
            overflow: hidden;
            transform: translateX(0);
            visibility: visible;
            transition: transform 0.22s ease, visibility 0s linear 0s;
            backdrop-filter: none;
        }
        #cdp-panel.cdp-hidden {
            display: flex;
            transform: translateX(100%);
            visibility: hidden;
            pointer-events: none;
            transition: transform 0.22s ease, visibility 0s linear 0.22s;
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
        #cdp-header-actions {
            display: flex;
            gap: 6px;
            flex-shrink: 0;
        }
        .cdp-header-btn {
            width: 28px;
            height: 28px;
            border: 1px solid var(--cdp-border);
            border-radius: var(--cdp-radius);
            background: var(--cdp-bg-dark);
            color: var(--cdp-text-secondary);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            transition: var(--cdp-transition);
        }
        .cdp-header-btn:hover {
            background: #21262d;
            color: var(--cdp-text-primary);
            border-color: #8b949e;
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

        /* ----- TABS ----- */
        #cdp-tabs {
            display: flex;
            flex-wrap: wrap;
            background: var(--cdp-bg-card);
            border-bottom: 1px solid var(--cdp-border);
            flex-shrink: 0;
        }
        .cdp-tab {
            flex: 1 0 33.333%;
            padding: 9px 6px;
            border: none;
            border-right: 1px solid var(--cdp-border);
            border-bottom: 1px solid var(--cdp-border);
            background: var(--cdp-bg-card);
            color: var(--cdp-text-secondary);
            font-family: inherit;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: var(--cdp-transition);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
            text-transform: none;
        }
        .cdp-tab:hover {
            background: #21262d;
            color: var(--cdp-text-primary);
        }
        .cdp-tab.cdp-tab-active {
            color: var(--cdp-text-primary);
            background: var(--cdp-bg-dark);
            box-shadow: inset 0 -2px 0 var(--cdp-primary);
        }
        .cdp-tab-badge {
            font-size: 10px;
            background: #30363d;
            color: var(--cdp-text-secondary);
            padding: 1px 6px;
            border-radius: 999px;
            font-weight: 600;
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

        /* ----- TOGGLE BUTTON ----- */
        #cdp-toggle-btn {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 46px;
            height: 46px;
            box-sizing: border-box;
            border-radius: var(--cdp-radius);
            border: 1px solid var(--cdp-border);
            background: var(--cdp-bg-card);
            color: var(--cdp-text-primary);
            cursor: pointer;
            z-index: 2147483647;
            box-shadow: 0 8px 22px rgba(1,4,9,0.34);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: right 0.22s ease, var(--cdp-transition);
        }
        #cdp-toggle-btn.cdp-sidebar-open {
            right: calc(var(--cdp-sidebar-width) + 12px);
        }
        #cdp-toggle-btn:hover,
        #cdp-toggle-btn.cdp-detecting {
            background: #21262d;
            border-color: var(--cdp-primary);
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
