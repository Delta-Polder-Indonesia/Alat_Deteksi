    /* ===== CLAMP — keeps panel inside viewport ===== */
    function clampPanel(panel) {
        const rect = panel.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const margin = 4;

        let left = rect.left;
        let top = rect.top;

        // right edge
        if (left + rect.width > vw - margin) left = vw - rect.width - margin;
        // left edge
        if (left < margin) left = margin;
        // bottom edge
        if (top + rect.height > vh - margin) top = vh - rect.height - margin;
        // top edge
        if (top < margin) top = margin;

        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
        panel.style.right = 'auto';
    }

