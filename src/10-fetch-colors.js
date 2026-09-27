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

