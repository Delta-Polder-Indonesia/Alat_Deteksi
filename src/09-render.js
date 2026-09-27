    /* ===== RENDER ===== */

    function renderCurrentTab() {
        const tab = isValidTabName(activeTab) ? activeTab : 'database';
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
                    <div class="cdp-empty-state-text">No detection history yet.<br>Pick a pixel color or enable style detection.</div>
                </div>`;
            return;
        }
        let html = '<div class="cdp-category-header">Recent Detection History</div>';
        detectionHistory.forEach(item => {
            const hex = escapeHtml(item.hex);
            const name = escapeHtml(item.name);
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

