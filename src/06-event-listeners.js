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
        if (active && isAssetPickerActive) setAssetPickerActive(false);
        if (active && isInspectActive) setInspectActive(false);
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

    function updateAssetPickerControls() {
        const assetBtn = document.getElementById('cdp-asset-btn');
        if (!assetBtn) return;
        assetBtn.className = isAssetPickerActive ? 'cdp-active' : 'cdp-inactive';
        assetBtn.textContent = isAssetPickerActive ? 'Picking assets' : 'Asset Picker';
    }

    function setAssetPickerActive(active) {
        isAssetPickerActive = active;
        updateAssetPickerControls();
        if (active) {
            if (isInspectActive) setInspectActive(false);
            if (isDetecting) setDetecting(false);
            hideAssetActionPopover();
            showNotification('Asset Picker active', 'info');
            return;
        }
        hideAssetActionPopover();
        document.getElementById('cdp-cursor-tooltip').classList.remove('cdp-tooltip-visible');
        if (currentAssetHighlight) {
            currentAssetHighlight.classList.remove('cdp-element-highlight');
            currentAssetHighlight = null;
        }
    }

    function updateInspectControls() {
        const inspectBtn = document.getElementById('cdp-inspect-btn');
        if (!inspectBtn) return;
        inspectBtn.className = isInspectActive ? 'cdp-active' : 'cdp-inactive';
        inspectBtn.textContent = isInspectActive ? 'Inspecting' : 'Inspect';
    }

    function setInspectActive(active) {
        isInspectActive = active;
        updateInspectControls();
        if (active) {
            if (isAssetPickerActive) setAssetPickerActive(false);
            if (isDetecting) setDetecting(false);
            isInspectFrozen = false;
            hideInspectCard();
            showNotification('Inspect mode active', 'info');
            return;
        }
        isInspectFrozen = false;
        hideInspectCard();
        if (currentInspectHighlight) {
            currentInspectHighlight.classList.remove('cdp-element-highlight');
            currentInspectHighlight = null;
        }
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

    function setPanelSide(panel, side, shouldNotify = true) {
        const toggleBtn = document.getElementById('cdp-toggle-btn');
        const nextSide = side === 'left' ? 'left' : 'right';
        const sideChanged = sidebarSide !== nextSide;
        sidebarSide = nextSide;
        panel.classList.toggle('cdp-sidebar-left', sidebarSide === 'left');
        panel.setAttribute('data-side', sidebarSide);
        toggleBtn.classList.toggle('cdp-sidebar-left', sidebarSide === 'left');
        toggleBtn.setAttribute('data-side', sidebarSide);
        safeSetValue(STORAGE_KEYS.sidebarSide, sidebarSide);
        if (shouldNotify && sideChanged) {
            showNotification('Sidebar: ' + (sidebarSide === 'left' ? 'Left' : 'Right'), 'info');
        }
    }

    function isEditableKeyboardTarget(target) {
        return !!(target && typeof target.closest === 'function' &&
            target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]'));
    }

    function setPanelOpen(panel, open) {
        const toggleBtn = document.getElementById('cdp-toggle-btn');
        isPanelOpen = Boolean(open);
        panel.classList.toggle('cdp-hidden', !isPanelOpen);
        panel.setAttribute('aria-hidden', String(!isPanelOpen));
        toggleBtn.classList.toggle('cdp-sidebar-open', isPanelOpen);
        toggleBtn.setAttribute('aria-expanded', String(isPanelOpen));
        toggleBtn.setAttribute('aria-label', isPanelOpen ? 'Hide Color Detector Pro' : 'Show Color Detector Pro');
        toggleBtn.title = isPanelOpen ? 'Hide Color Detector Pro' : 'Show Color Detector Pro';
        if (!isPanelOpen && panel.contains(document.activeElement)) {
            toggleBtn.focus();
        }
    }

    function restoreUiState(panel) {
        detectionHistory = loadStoredHistory();
        updateHistoryBadge();
        setPanelSide(panel, safeGetValue(STORAGE_KEYS.sidebarSide, 'right'), false);
        const storedTab = loadStoredActiveTab();
        selectTab(storedTab, false, storedTab !== 'database');
        setDetectionMode(browserSupportsEyeDropper()
            ? DETECTION_MODE_EYEDROPPER
            : DETECTION_MODE_COMPUTED);
        updateAssetPickerControls();
        updateInspectControls();
    }

    function setupEventListeners() {
        const panel = document.getElementById('cdp-panel');
        const toggleBtn = document.getElementById('cdp-toggle-btn');
        const closeBtn = document.getElementById('cdp-btn-close');
        const detectBtn = document.getElementById('cdp-detect-btn');
        const modeBtn = document.getElementById('cdp-mode-btn');
        const assetBtn = document.getElementById('cdp-asset-btn');
        const inspectBtn = document.getElementById('cdp-inspect-btn');
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
                showNotification('Pixel unavailable', 'error');
                return;
            }
            setDetectionMode(detectionMode === DETECTION_MODE_EYEDROPPER
                ? DETECTION_MODE_COMPUTED
                : DETECTION_MODE_EYEDROPPER);
            showNotification('Mode: ' + (detectionMode === DETECTION_MODE_EYEDROPPER ? 'Pixel' : 'Style'), 'info');
        });

        // Asset Picker
        assetBtn.addEventListener('click', () => {
            setAssetPickerActive(!isAssetPickerActive);
        });

        document.getElementById('cdp-asset-copy-svg-btn').addEventListener('click', () => {
            copyCurrentPickedAssetSvg();
        });
        document.getElementById('cdp-asset-download-btn').addEventListener('click', () => {
            downloadCurrentPickedAsset();
        });

        // Inspect
        inspectBtn.addEventListener('click', () => {
            setInspectActive(!isInspectActive);
        });
        document.getElementById('cdp-inspect-copy-btn').addEventListener('click', () => {
            copyCurrentInspectCss();
        });

        // Clear
        clearBtn.addEventListener('click', () => {
            detectionHistory = [];
            updateHistoryBadge();
            saveDetectionHistory();
            renderCurrentTab();
            showNotification('History cleared', 'success');
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
            if (isPanelOpen && !isEditableKeyboardTarget(e.target) && e.key === 'ArrowLeft') {
                e.preventDefault();
                setPanelSide(panel, 'left');
                return;
            }
            if (isPanelOpen && !isEditableKeyboardTarget(e.target) && e.key === 'ArrowRight') {
                e.preventDefault();
                setPanelSide(panel, 'right');
                return;
            }
            if (e.key === 'Escape' && isDetecting) {
                setDetecting(false);
            }
            if (e.key === 'Escape' && isAssetPickerActive) {
                setAssetPickerActive(false);
            }
            if (e.key === 'Escape' && isInspectActive) {
                setInspectActive(false);
            }
        }));
    }

