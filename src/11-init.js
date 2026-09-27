    /* ===== INIT ===== */
    // Kegagalan startup (DOM host tidak siap, konflik dengan halaman, dll.)
    // dilaporkan ke console, bukan gagal tanpa jejak.
    try {
        buildUI();
        fetchColors();
    } catch (err) {
        logError('init', err);
    }

