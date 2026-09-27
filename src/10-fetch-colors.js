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

