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
            </aside>

            <main id="cdp-sidebar-content" aria-hidden="true">
            <div id="cdp-header">
                <div id="cdp-header-left">
                    <div id="cdp-logo">${pipetteIcon(16)}</div>
                    <span id="cdp-title">Color Detector Pro</span>
                    <span id="cdp-version">v3.0.0</span>
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

