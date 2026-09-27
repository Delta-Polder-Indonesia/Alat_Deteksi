    /* ═══════════════════════════════════════════
       MOUSE DETECTION
    ═══════════════════════════════════════════ */

    function handleMouseMove(e) {
        if (!isDetecting) return;
        const target = e.target;
        if (!target || target.closest('#cdp-panel') || target.closest('#cdp-toggle-btn') ||
            target.closest('#cdp-cursor-tooltip') || target.closest('#cdp-toast')) return;

        if (currentHighlight && currentHighlight !== target) {
            currentHighlight.classList.remove('cdp-element-highlight');
        }
        target.classList.add('cdp-element-highlight');
        currentHighlight = target;

        const hex = getElementColor(target);
        if (!hex) return;

        const rgb = hexToRgb(hex);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        const closest = findClosestColor(hex);
        const colorName = closest ? closest['Color names'] : 'Unknown';

        document.getElementById('cdp-big-swatch-inner').style.background = hex;
        document.getElementById('cdp-color-name').textContent = colorName;
        const hexEl = document.getElementById('cdp-color-hex');
        hexEl.textContent = hex; hexEl.style.color = hex; hexEl.setAttribute('data-hex', hex);
        document.getElementById('cdp-color-rgb').textContent = `RGB: ${rgb.r}, ${rgb.g}, ${rgb.b}`;
        document.getElementById('cdp-color-hsl').textContent = `HSL: ${hsl.h}, ${hsl.s}%, ${hsl.l}%`;

        // Tooltip
        const tip = document.getElementById('cdp-cursor-tooltip');
        tip.classList.add('cdp-tooltip-visible');
        let tx = e.clientX + 18, ty = e.clientY + 18;
        tip.style.left = tx + 'px'; tip.style.top = ty + 'px';
        const tr = tip.getBoundingClientRect();
        if (tr.right > window.innerWidth) tip.style.left = (e.clientX - tr.width - 10) + 'px';
        if (tr.bottom > window.innerHeight) tip.style.top = (e.clientY - tr.height - 10) + 'px';

        document.getElementById('cdp-tooltip-swatch').style.background = hex;
        document.getElementById('cdp-tooltip-name').textContent = colorName;
        document.getElementById('cdp-tooltip-hex').textContent = hex;
    }

    function handleDetectionClick(e) {
        if (!isDetecting) return;
        const target = e.target;
        if (target.closest('#cdp-panel') || target.closest('#cdp-toggle-btn') ||
            target.closest('#cdp-cursor-tooltip') || target.closest('#cdp-toast')) return;

        e.preventDefault(); e.stopPropagation();

        const hex = getElementColor(target);
        if (!hex) return;

        const closest = findClosestColor(hex);
        detectionHistory.unshift({
            hex, name: closest ? closest['Color names'] : 'Unknown',
            time: new Date().toLocaleTimeString(), element: target.tagName.toLowerCase()
        });
        if (detectionHistory.length > 50) detectionHistory.pop();
        document.getElementById('cdp-history-count').textContent = detectionHistory.length;
        copyToClipboard(hex);
        renderCurrentTab();
    }

