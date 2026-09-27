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
                    <span id="cdp-version">v2.5</span>
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
                <button id="cdp-mode-btn" type="button" title="Toggle detection mode">Mode</button>
                <button id="cdp-asset-btn" type="button" class="cdp-inactive" title="Pick page assets">Asset Picker</button>
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
                <button class="cdp-tab" data-tab="harmony">
                    Harmony
                </button>
                <button class="cdp-tab" data-tab="assets">
                    Assets
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

        const assetActions = document.createElement('div');
        assetActions.id = 'cdp-asset-action-popover';
        assetActions.className = 'cdp-hidden';
        assetActions.innerHTML = `
            <div id="cdp-asset-action-title">Asset actions</div>
            <div id="cdp-asset-action-meta"></div>
            <button id="cdp-asset-copy-svg-btn" type="button">Copy SVG code</button>
            <button id="cdp-asset-download-btn" type="button">Download</button>`;
        document.body.appendChild(assetActions);

        setupEventListeners();
    }

