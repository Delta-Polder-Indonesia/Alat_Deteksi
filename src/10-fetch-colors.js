    /* ═══════════════════════════════════════════
       FETCH COLORS
    ═══════════════════════════════════════════ */

    function fetchColors() {
        GM_xmlhttpRequest({
            method: 'GET',
            url: API_URL,
            onload(response) {
                try {
                    colorDatabase = JSON.parse(response.responseText);
                    document.getElementById('cdp-db-count').textContent = colorDatabase.length;
                    document.getElementById('cdp-status-text').textContent =
                        colorDatabase.length + ' colors loaded successfully';
                    renderColorList();
                } catch (e) {
                    document.getElementById('cdp-status-text').textContent = 'Failed to parse database';
                    document.getElementById('cdp-color-list-container').innerHTML = `
                        <div class="cdp-empty-state">
                            <div class="cdp-empty-state-icon">⚠️</div>
                            <div class="cdp-empty-state-text">Failed to load color database.<br>Please check your internet connection.</div>
                        </div>`;
                }
            },
            onerror() {
                document.getElementById('cdp-status-text').textContent = 'Connection error';
                document.getElementById('cdp-color-list-container').innerHTML = `
                    <div class="cdp-empty-state">
                        <div class="cdp-empty-state-icon">❌</div>
                        <div class="cdp-empty-state-text">Could not connect to server.<br>Please check your internet connection.</div>
                    </div>`;
            }
        });
    }

