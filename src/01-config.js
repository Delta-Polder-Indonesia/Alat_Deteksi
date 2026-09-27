    /* ===== CONFIG ===== */
    const API_URL = 'https://api.npoint.io/a54d755ded5ab6c0e7d1';
    const LOG_PREFIX = '[Color Detector Pro]';
    let colorDatabase = [];
    let isPanelOpen = false;
    let isDetecting = false;
    let isPanelMinimized = false;
    let currentHighlight = null;
    let detectionHistory = [];

