    /* ===== DRAG — grab/grabbing cursor + boundary clamp ===== */

    function makeDraggable(element, handle) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('.cdp-header-btn')) return;
            isDragging = true;
            const rect = element.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = rect.left;
            initialTop = rect.top;
            element.style.transition = 'none';
            handle.classList.add('cdp-dragging');
            e.preventDefault();
        });

        document.addEventListener('mousemove', guard('makeDraggable mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            let newLeft = initialLeft + dx;
            let newTop = initialTop + dy;

            // boundary clamping
            const rect = element.getBoundingClientRect();
            const w = rect.width;
            const h = rect.height;
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const margin = 4;

            if (newLeft < margin) newLeft = margin;
            if (newTop < margin) newTop = margin;
            if (newLeft + w > vw - margin) newLeft = vw - w - margin;
            if (newTop + h > vh - margin) newTop = vh - h - margin;

            element.style.left = newLeft + 'px';
            element.style.top = newTop + 'px';
            element.style.right = 'auto';
        }));

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.style.transition = '';
                handle.classList.remove('cdp-dragging');
            }
        });
    }

