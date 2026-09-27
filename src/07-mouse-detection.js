    /* ===== MOUSE DETECTION ===== */

    function isIgnoredDetectionTarget(target) {
        return !target || typeof target.closest !== 'function' || isCdpElement(target);
    }

    function getColorName(hex) {
        const closest = findClosestColor(hex);
        return closest ? closest['Color names'] : 'Unknown';
    }

    function recordDetectedColor(hex, elementName) {
        const normalizedHex = normalizeHex(hex);
        if (!normalizedHex) {
            logError('recordDetectedColor', new Error('Invalid color: ' + hex));
            return null;
        }
        const name = getColorName(normalizedHex);
        const record = {
            hex: normalizedHex,
            name,
            time: new Date().toLocaleTimeString(),
            element: elementName || 'pixel',
        };
        updatePreview(record.hex, record.name);
        detectionHistory.unshift(record);
        if (detectionHistory.length > MAX_HISTORY_ITEMS) detectionHistory.pop();
        updateHistoryBadge();
        saveDetectionHistory();
        renderCurrentTab();
        return record;
    }

    async function startEyeDropperDetection() {
        if (isEyeDropperOpen) return;
        if (!browserSupportsEyeDropper()) {
            setDetectionMode(DETECTION_MODE_COMPUTED);
            setDetecting(true);
            showToast('Pixel mode unavailable; using style mode');
            return;
        }

        let keepComputedModeActive = false;
        isEyeDropperOpen = true;
        setDetecting(true);
        try {
            const result = await new window.EyeDropper().open();
            const hex = normalizeHex(result && result.sRGBHex);
            if (!hex) {
                throw new Error('EyeDropper returned an invalid color');
            }
            const record = recordDetectedColor(hex, 'pixel');
            if (record) copyToClipboard(record.hex);
        } catch (err) {
            logError('startEyeDropperDetection', err);
            if (err && err.name === 'AbortError') {
                showToast('Pixel selection canceled');
            } else {
                showToast('Pixel mode failed; using style mode');
                setDetectionMode(DETECTION_MODE_COMPUTED);
                setDetecting(true);
                keepComputedModeActive = true;
            }
        } finally {
            isEyeDropperOpen = false;
            if (!keepComputedModeActive) setDetecting(false);
        }
    }

    function positionTooltip(e, tip) {
        const tx = e.clientX + 18, ty = e.clientY + 18;
        tip.style.left = tx + 'px'; tip.style.top = ty + 'px';
        const tr = tip.getBoundingClientRect();
        if (tr.right > window.innerWidth) tip.style.left = (e.clientX - tr.width - 10) + 'px';
        if (tr.bottom > window.innerHeight) tip.style.top = (e.clientY - tr.height - 10) + 'px';
    }

    function clearAssetHighlight() {
        if (currentAssetHighlight) {
            currentAssetHighlight.classList.remove('cdp-element-highlight');
            currentAssetHighlight = null;
        }
    }

    function handleAssetPickerMove(e) {
        const target = e.target;
        if (isIgnoredDetectionTarget(target)) return;
        const asset = detectAssetFromElement(target);
        const tip = document.getElementById('cdp-cursor-tooltip');
        if (!asset) {
            clearAssetHighlight();
            tip.classList.remove('cdp-tooltip-visible');
            return;
        }

        const highlightTarget = asset.element || target;
        if (currentAssetHighlight && currentAssetHighlight !== highlightTarget) {
            currentAssetHighlight.classList.remove('cdp-element-highlight');
        }
        highlightTarget.classList.add('cdp-element-highlight');
        currentAssetHighlight = highlightTarget;

        const icon = document.getElementById('cdp-tooltip-swatch');
        icon.classList.add('cdp-asset-tooltip-icon');
        icon.style.background = '';
        icon.textContent = asset.badge;
        document.getElementById('cdp-tooltip-name').textContent = asset.typeLabel;
        document.getElementById('cdp-tooltip-hex').textContent = asset.name;
        tip.classList.add('cdp-tooltip-visible');
        positionTooltip(e, tip);
    }

    function showAssetActionPopover(asset, clientX, clientY) {
        currentPickedAsset = asset;
        const popover = document.getElementById('cdp-asset-action-popover');
        document.getElementById('cdp-asset-action-title').textContent = asset.typeLabel;
        document.getElementById('cdp-asset-action-meta').textContent = asset.name;
        document.getElementById('cdp-asset-copy-svg-btn').disabled = !assetCanCopySvg(asset);
        popover.classList.remove('cdp-hidden');
        popover.style.left = clientX + 12 + 'px';
        popover.style.top = clientY + 12 + 'px';
        const rect = popover.getBoundingClientRect();
        if (rect.right > window.innerWidth) popover.style.left = (clientX - rect.width - 12) + 'px';
        if (rect.bottom > window.innerHeight) popover.style.top = (clientY - rect.height - 12) + 'px';
    }

    function hideAssetActionPopover() {
        currentPickedAsset = null;
        const popover = document.getElementById('cdp-asset-action-popover');
        if (popover) popover.classList.add('cdp-hidden');
    }

    async function copyCurrentPickedAssetSvg() {
        if (!currentPickedAsset) return;
        await copyAssetSvgCode(currentPickedAsset);
    }

    async function downloadCurrentPickedAsset() {
        if (!currentPickedAsset) return;
        try {
            await downloadAsset(currentPickedAsset);
        } catch (err) {
            logError('downloadCurrentPickedAsset', err);
        }
    }

    function clearInspectHighlight() {
        if (currentInspectHighlight) {
            currentInspectHighlight.classList.remove('cdp-element-highlight');
            currentInspectHighlight = null;
        }
    }

    function positionInspectCard(card, clientX, clientY) {
        card.style.left = clientX + 16 + 'px';
        card.style.top = clientY + 16 + 'px';
        const rect = card.getBoundingClientRect();
        if (rect.right > window.innerWidth) card.style.left = (clientX - rect.width - 12) + 'px';
        if (rect.bottom > window.innerHeight) card.style.top = (clientY - rect.height - 12) + 'px';
    }

    function renderInspectCard(data, clientX, clientY, frozen) {
        currentInspectData = data;
        const card = document.getElementById('cdp-inspect-card');
        document.getElementById('cdp-inspect-card-title').textContent = data.title;
        document.getElementById('cdp-inspect-card-subtitle').textContent = data.subtitle;
        document.getElementById('cdp-inspect-card-state').textContent = frozen ? 'Pinned' : 'Live';
        const body = document.getElementById('cdp-inspect-card-body');
        body.innerHTML = data.rows.map(row => `
            <div class="cdp-inspect-row">
                <span>${escapeHtml(row.property)}</span>
                <strong>${escapeHtml(row.value)}</strong>
            </div>`).join('');
        card.classList.remove('cdp-hidden');
        positionInspectCard(card, clientX, clientY);
    }

    function hideInspectCard() {
        currentInspectData = null;
        const card = document.getElementById('cdp-inspect-card');
        if (card) card.classList.add('cdp-hidden');
    }

    function handleInspectMove(e) {
        if (isInspectFrozen) return;
        const target = e.target;
        if (isIgnoredDetectionTarget(target)) return;
        const data = inspectDataFromElement(target);
        if (currentInspectHighlight && currentInspectHighlight !== target) {
            currentInspectHighlight.classList.remove('cdp-element-highlight');
        }
        target.classList.add('cdp-element-highlight');
        currentInspectHighlight = target;
        renderInspectCard(data, e.clientX, e.clientY, false);
    }

    function freezeInspectCard(target, clientX, clientY) {
        const data = inspectDataFromElement(target);
        isInspectFrozen = true;
        renderInspectCard(data, clientX, clientY, true);
        showToast('Inspect card pinned');
    }

    function copyCurrentInspectCss() {
        if (!currentInspectData) {
            showToast('Nothing to copy');
            return;
        }
        copyToClipboard(currentInspectData.cssText);
    }

    function handleMouseMove(e) {
        if (isInspectActive) {
            handleInspectMove(e);
            return;
        }
        if (isAssetPickerActive) {
            handleAssetPickerMove(e);
            return;
        }
        if (!isDetecting || detectionMode !== DETECTION_MODE_COMPUTED) return;
        const target = e.target;
        if (isIgnoredDetectionTarget(target)) return;

        if (currentHighlight && currentHighlight !== target) {
            currentHighlight.classList.remove('cdp-element-highlight');
        }
        target.classList.add('cdp-element-highlight');
        currentHighlight = target;

        const hex = getElementColor(target);
        if (!hex) return;

        const colorName = getColorName(hex);
        updatePreview(hex, colorName);

        // Tooltip
        const tip = document.getElementById('cdp-cursor-tooltip');
        tip.classList.add('cdp-tooltip-visible');
        positionTooltip(e, tip);

        const swatch = document.getElementById('cdp-tooltip-swatch');
        swatch.classList.remove('cdp-asset-tooltip-icon');
        swatch.textContent = '';
        swatch.style.background = hex;
        document.getElementById('cdp-tooltip-name').textContent = colorName;
        document.getElementById('cdp-tooltip-hex').textContent = hex;
    }

    function handleDetectionClick(e) {
        if (isInspectActive) {
            const target = e.target;
            if (isIgnoredDetectionTarget(target)) return;
            e.preventDefault(); e.stopPropagation();
            freezeInspectCard(target, e.clientX, e.clientY);
            return;
        }
        if (isAssetPickerActive) {
            const target = e.target;
            if (isIgnoredDetectionTarget(target)) return;
            const asset = detectAssetFromElement(target);
            if (!asset) return;
            e.preventDefault(); e.stopPropagation();
            showAssetActionPopover(asset, e.clientX, e.clientY);
            return;
        }
        if (!isDetecting || detectionMode !== DETECTION_MODE_COMPUTED) return;
        const target = e.target;
        if (isIgnoredDetectionTarget(target)) return;

        e.preventDefault(); e.stopPropagation();

        const hex = getElementColor(target);
        if (!hex) return;

        const record = recordDetectedColor(hex, target.tagName.toLowerCase());
        if (record) copyToClipboard(record.hex);
    }

