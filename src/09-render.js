    /* ═══════════════════════════════════════════
       RENDER
    ═══════════════════════════════════════════ */

    function renderCurrentTab() {
        const active = document.querySelector('.cdp-tab.cdp-tab-active');
        const tab = active ? active.dataset.tab : 'database';
        if (tab === 'database') renderColorList(document.getElementById('cdp-search-input').value.trim());
        else if (tab === 'history') renderHistory();
        else if (tab === 'palette') renderPalette();
    }

    function updatePreview(hex, name) {
        const rgb = hexToRgb(hex);
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
                    <div class="cdp-empty-state-icon">🔍</div>
                    <div class="cdp-empty-state-text">No colors found for "${filter}"</div>
                </div>`;
            return;
        }

        let html = '';
        filtered.forEach(color => {
            const rgb = hexToRgb(color.Code);
            const rs = rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : '—';
            html += `
                <div class="cdp-color-item" data-hex="${color.Code}" data-name="${color['Color names']}">
                    <div class="cdp-color-swatch" style="background:${color.Code};"></div>
                    <div class="cdp-color-item-info">
                        <div class="cdp-color-item-name">${color['Color names']}</div>
                        <div class="cdp-color-item-code">${color.Code} · rgb(${rs})</div>
                    </div>
                    <button class="cdp-color-item-copy" data-copy="${color.Code}">Copy</button>
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
                    <div class="cdp-empty-state-icon">🕐</div>
                    <div class="cdp-empty-state-text">No detection history yet.<br>Enable detection and hover over elements.</div>
                </div>`;
            return;
        }
        let html = '<div class="cdp-category-header">Recent Detection History</div>';
        detectionHistory.forEach(item => {
            const rgb = hexToRgb(item.hex);
            const rs = rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : '—';
            html += `
                <div class="cdp-color-item" data-hex="${item.hex}" data-name="${item.name}">
                    <div class="cdp-color-swatch" style="background:${item.hex};"></div>
                    <div class="cdp-color-item-info">
                        <div class="cdp-color-item-name">${item.name}</div>
                        <div class="cdp-color-item-code">${item.hex} · &lt;${item.element}&gt;</div>
                    </div>
                    <span class="cdp-history-time">${item.time}</span>
                    <button class="cdp-color-item-copy" data-copy="${item.hex}" style="opacity:1;">Copy</button>
                </div>`;
        });
        container.innerHTML = html;
        attachListHandlers(container);
    }

    function renderPalette() {
        const container = document.getElementById('cdp-color-list-container');
        const palettes = [
            { name: '🔥 Warm Sunset', colors: ['#FF6B6B','#FFA07A','#FFD93D','#FF8C42','#FF5252','#E74C3C'] },
            { name: '🌊 Ocean Breeze', colors: ['#0077B6','#00B4D8','#90E0EF','#CAF0F8','#023E8A','#48CAE4'] },
            { name: '🌿 Forest', colors: ['#2D6A4F','#40916C','#52B788','#74C69D','#95D5B2','#B7E4C7'] },
            { name: '🌸 Pastel Dream', colors: ['#FFB5E8','#FF9CEE','#B28DFF','#85E3FF','#BFFCC6','#FFC9DE'] },
            { name: '🌙 Midnight', colors: ['#0F0F23','#1A1A2E','#16213E','#0F3460','#533483','#E94560'] },
            { name: '🍂 Autumn', colors: ['#D4A373','#CCD5AE','#E9EDC9','#FEFAE0','#FAEDCD','#A98467'] },
            { name: '💜 Purple Rain', colors: ['#667eea','#764ba2','#f093fb','#5a67d8','#9F7AEA','#B794F4'] },
            { name: '⚡ Neon', colors: ['#FF006E','#FB5607','#FFBE0B','#3A86FF','#8338EC','#06D6A0'] },
        ];
        let html = '';
        palettes.forEach(p => {
            html += `<div class="cdp-category-header">${p.name}</div>`;
            html += '<div style="display:flex;flex-wrap:wrap;gap:6px;padding:12px 18px;">';
            p.colors.forEach(c => {
                const cc = getContrastColor(c);
                html += `
                    <div class="cdp-palette-swatch" data-hex="${c}" style="
                        width:54px;height:54px;border-radius:12px;background:${c};cursor:pointer;
                        border:2px solid rgba(255,255,255,0.1);
                        display:flex;align-items:center;justify-content:center;
                        font-size:9px;font-family:monospace;font-weight:700;
                        color:${cc};transition:all 0.2s ease;
                        box-shadow:0 2px 8px rgba(0,0,0,0.2);
                    " onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">${c}</div>`;
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

