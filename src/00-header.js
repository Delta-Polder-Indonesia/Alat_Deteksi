(function () {
    'use strict';

    // Cegah script berjalan di dalam iframe / sub-frame (hanya aktif di window utama / top-level)
    try {
        if (window.top !== window.self) {
            return;
        }
    } catch (_err) {
        // Jika akses ke window.top diblokir (cross-origin / sandboxed iframe), batalkan eksekusi
        return;
    }

