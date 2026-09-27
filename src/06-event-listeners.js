    /* ═══════════════════════════════════════════
       EVENT LISTENERS
    ═══════════════════════════════════════════ */

    function setupEventListeners() {
        const panel = document.getElementById('cdp-panel');
        const toggleBtn = document.getElementById('cdp-toggle-btn');
        const closeBtn = document.getElementById('cdp-btn-close');
        const minBtn = document.getElementById('cdp-btn-minimize');
        const detectBtn = document.getElementById('cdp-detect-btn');
        const clearBtn = document.getElementById('cdp-clear-btn');
        const searchIn = document.getElementById('cdp-search-input');
        const tabs = document.querySelectorAll('.cdp-tab');
        const detDisp = document.getElementById('cdp-detector-display');

        // Toggle
        toggleBtn.addEventListener('click', () => {
            isPanelOpen = !isPanelOpen;
            panel.classList.toggle('cdp-hidden', !isPanelOpen);
            if (isPanelOpen) requestAnimationFrame(() => clampPanel(panel));
        });

        // Close
        closeBtn.addEventListener('click', () => {
            isPanelOpen = false;
            panel.classList.add('cdp-hidden');
        });

        // Minimize
        minBtn.addEventListener('click', () => {
            isPanelMinimized = !isPanelMinimized;
            panel.classList.toggle('cdp-minimized', isPanelMinimized);
            minBtn.innerHTML = isPanelMinimized ? '▢' : '─';
        });

        // Detect
        detectBtn.addEventListener('click', () => {
            isDetecting = !isDetecting;
            detectBtn.className = isDetecting ? 'cdp-active' : 'cdp-inactive';
            document.getElementById('cdp-detect-label').textContent =
                isDetecting ? '● Detecting... (click to stop)' : 'Start Color Detection';
            toggleBtn.classList.toggle('cdp-detecting', isDetecting);
            if (!isDetecting) {
                document.getElementById('cdp-cursor-tooltip').classList.remove('cdp-tooltip-visible');
                if (currentHighlight) {
                    currentHighlight.classList.remove('cdp-element-highlight');
                    currentHighlight = null;
                }
            }
        });

        // Clear
        clearBtn.addEventListener('click', () => {
            detectionHistory = [];
            document.getElementById('cdp-history-count').textContent = '0';
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
        searchIn.addEventListener('input', () => renderColorList(searchIn.value.trim()));

        // Tabs
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('cdp-tab-active'));
                tab.classList.add('cdp-tab-active');
                document.getElementById('cdp-search-box').style.display =
                    tab.dataset.tab === 'database' ? 'block' : 'none';
                renderCurrentTab();
            });
        });

        // Detection
        document.addEventListener('mousemove', handleMouseMove, true);
        document.addEventListener('click', handleDetectionClick, true);

        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                isPanelOpen = !isPanelOpen;
                panel.classList.toggle('cdp-hidden', !isPanelOpen);
                if (isPanelOpen) requestAnimationFrame(() => clampPanel(panel));
            }
            if (e.key === 'Escape' && isDetecting) {
                isDetecting = false;
                detectBtn.className = 'cdp-inactive';
                document.getElementById('cdp-detect-label').textContent = 'Start Color Detection';
                toggleBtn.classList.remove('cdp-detecting');
                document.getElementById('cdp-cursor-tooltip').classList.remove('cdp-tooltip-visible');
                if (currentHighlight) {
                    currentHighlight.classList.remove('cdp-element-highlight');
                    currentHighlight = null;
                }
            }
        });

        // Viewport resize — re-clamp
        window.addEventListener('resize', () => {
            if (isPanelOpen) clampPanel(panel);
        });

        // Draggable with grab cursor + boundary clamping
        makeDraggable(panel, document.getElementById('cdp-header'));
    }

