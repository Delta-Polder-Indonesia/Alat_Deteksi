    /* ===== EVENT LISTENERS ===== */

    function browserSupportsEyeDropper() {
        return typeof window.EyeDropper === 'function';
    }

    function updateDetectionModeButton() {
        const modeBtn = document.getElementById('cdp-mode-btn');
        if (!modeBtn) return;
        const isPixel = detectionMode === DETECTION_MODE_EYEDROPPER;
        modeBtn.textContent = isPixel ? 'Pixel' : 'Style';
        modeBtn.classList.toggle('cdp-mode-pixel', isPixel);
        modeBtn.classList.toggle('cdp-mode-style', !isPixel);
        modeBtn.title = browserSupportsEyeDropper()
            ? 'Toggle detection mode: Pixel uses EyeDropper, Style uses computed CSS'
            : 'Pixel mode is not supported in this browser; using Style mode';
    }

    function updateDetectionControls() {
        const detectBtn = document.getElementById('cdp-detect-btn');
        const detectLabel = document.getElementById('cdp-detect-label');
        const toggleBtn = document.getElementById('cdp-toggle-btn');
        if (!detectBtn || !detectLabel || !toggleBtn) return;
        detectBtn.className = isDetecting ? 'cdp-active' : 'cdp-inactive';
        if (isDetecting) {
            detectLabel.textContent = detectionMode === DETECTION_MODE_EYEDROPPER
                ? 'Selecting pixel...'
                : 'Detecting... (click to stop)';
        } else {
            detectLabel.textContent = detectionMode === DETECTION_MODE_EYEDROPPER
                ? 'Pick Pixel Color'
                : 'Start Style Detection';
        }
        toggleBtn.classList.toggle('cdp-detecting', isDetecting);
    }

    function setDetecting(active) {
        isDetecting = active;
        updateDetectionControls();
        if (!active) {
            document.getElementById('cdp-cursor-tooltip').classList.remove('cdp-tooltip-visible');
            if (currentHighlight) {
                currentHighlight.classList.remove('cdp-element-highlight');
                currentHighlight = null;
            }
        }
    }

    function setDetectionMode(mode) {
        const nextMode = mode === DETECTION_MODE_EYEDROPPER && browserSupportsEyeDropper()
            ? DETECTION_MODE_EYEDROPPER
            : DETECTION_MODE_COMPUTED;
        if (detectionMode !== nextMode && isDetecting) {
            setDetecting(false);
        }
        detectionMode = nextMode;
        updateDetectionModeButton();
        updateDetectionControls();
    }

    function selectTab(tabName, shouldPersist, shouldRender) {
        activeTab = isValidTabName(tabName) ? tabName : 'database';
        document.querySelectorAll('.cdp-tab').forEach(tab => {
            tab.classList.toggle('cdp-tab-active', tab.dataset.tab === activeTab);
        });
        document.getElementById('cdp-search-box').style.display =
            activeTab === 'database' ? 'block' : 'none';
        if (shouldPersist) saveActiveTab(activeTab);
        if (shouldRender) renderCurrentTab();
    }

    function setPanelOpen(panel, open) {
        isPanelOpen = open;
        panel.classList.toggle('cdp-hidden', !isPanelOpen);
        if (isPanelOpen) {
            requestAnimationFrame(guard('clampPanel after open', () => clampPanel(panel)));
        }
    }

    function restoreUiState(panel) {
        detectionHistory = loadStoredHistory();
        updateHistoryBadge();
        restorePanelPosition(panel);
        const storedTab = loadStoredActiveTab();
        selectTab(storedTab, false, storedTab !== 'database');
        setDetectionMode(browserSupportsEyeDropper()
            ? DETECTION_MODE_EYEDROPPER
            : DETECTION_MODE_COMPUTED);
    }

    function setupEventListeners() {
        const panel = document.getElementById('cdp-panel');
        const toggleBtn = document.getElementById('cdp-toggle-btn');
        const closeBtn = document.getElementById('cdp-btn-close');
        const minBtn = document.getElementById('cdp-btn-minimize');
        const detectBtn = document.getElementById('cdp-detect-btn');
        const modeBtn = document.getElementById('cdp-mode-btn');
        const clearBtn = document.getElementById('cdp-clear-btn');
        const searchIn = document.getElementById('cdp-search-input');
        const tabs = document.querySelectorAll('.cdp-tab');
        const detDisp = document.getElementById('cdp-detector-display');

        restoreUiState(panel);

        // Toggle
        toggleBtn.addEventListener('click', () => {
            setPanelOpen(panel, !isPanelOpen);
        });

        // Close
        closeBtn.addEventListener('click', () => {
            setPanelOpen(panel, false);
        });

        // Minimize
        minBtn.addEventListener('click', () => {
            isPanelMinimized = !isPanelMinimized;
            panel.classList.toggle('cdp-minimized', isPanelMinimized);
            minBtn.innerHTML = isPanelMinimized ? '▢' : '─';
        });

        // Detect
        detectBtn.addEventListener('click', () => {
            if (detectionMode === DETECTION_MODE_EYEDROPPER) {
                startEyeDropperDetection();
                return;
            }
            setDetecting(!isDetecting);
        });

        // Mode
        modeBtn.addEventListener('click', () => {
            if (!browserSupportsEyeDropper()) {
                setDetectionMode(DETECTION_MODE_COMPUTED);
                showToast('Pixel mode is not supported here');
                return;
            }
            setDetectionMode(detectionMode === DETECTION_MODE_EYEDROPPER
                ? DETECTION_MODE_COMPUTED
                : DETECTION_MODE_EYEDROPPER);
            showToast('Detection mode: ' + (detectionMode === DETECTION_MODE_EYEDROPPER ? 'Pixel' : 'Style'));
        });

        // Clear
        clearBtn.addEventListener('click', () => {
            detectionHistory = [];
            updateHistoryBadge();
            saveDetectionHistory();
            renderCurrentTab();
            showToast('History cleared');
        });

        // Copy on click
        detDisp.addEventListener('click', () => {
            const hex = document.getElementById('cdp-color-hex').getAttribute('data-hex');
            if (hex) copyToClipboard(hex);
        });
        detDisp.style.cursor = 'pointer';

        // Search
        searchIn.addEventListener('input', () => {
            if (activeTab === 'database') renderColorList(searchIn.value.trim());
        });

        // Tabs
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                selectTab(tab.dataset.tab, true, true);
            });
        });

        // Detection — listener global di halaman host dibungkus guard():
        // exception apa pun tercatat di console dengan konteks, tidak
        // menjalar merusak event handling halaman.
        document.addEventListener('mousemove', guard('handleMouseMove', handleMouseMove), true);
        document.addEventListener('click', guard('handleDetectionClick', handleDetectionClick), true);

        // Keyboard
        document.addEventListener('keydown', guard('keydown shortcut', (e) => {
            if (e.altKey && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                setPanelOpen(panel, !isPanelOpen);
            }
            if (e.key === 'Escape' && isDetecting) {
                setDetecting(false);
            }
        }));

        // Viewport resize — re-clamp
        window.addEventListener('resize', guard('window resize', () => {
            if (isPanelOpen) {
                clampPanel(panel);
                savePanelPosition(panel);
            }
        }));

        // Draggable with grab cursor + boundary clamping
        makeDraggable(panel, document.getElementById('cdp-header'));
    }

