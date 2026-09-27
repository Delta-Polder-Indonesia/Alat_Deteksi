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
                html += `
                    <div class="cdp-asset-card" data-asset-id="${escapeHtml(asset.id)}">
                        <div class="cdp-asset-thumb">${renderAssetThumbnail(asset)}</div>
                        <div class="cdp-asset-card-body">
                            <label class="cdp-asset-check-row">
                                <input type="checkbox" class="cdp-asset-select" data-asset-id="${escapeHtml(asset.id)}"${checked}>
                                <span class="cdp-asset-name">${escapeHtml(asset.name)}</span>
                            </label>
                            <div class="cdp-asset-meta">${escapeHtml(asset.typeLabel)}</div>
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

