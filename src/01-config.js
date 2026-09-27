    /* ===== CONFIG ===== */
    const REPOSITORY_RAW_BASE_URL = 'https://raw.githubusercontent.com/Delta-Polder-Indonesia/Alat_Deteksi/main';
    const COLOR_DATABASE_URL = REPOSITORY_RAW_BASE_URL + '/public/data/colors.json';
    const ICON_INDEX_URL = REPOSITORY_RAW_BASE_URL + '/public/data/icon-index.json';
    const LOG_PREFIX = '[Color Detector Pro]';
    const DETECTION_MODE_EYEDROPPER = 'eyedropper';
    const DETECTION_MODE_COMPUTED = 'computed';
    const MAX_HISTORY_ITEMS = 50;
    const COLOR_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
    const ASSET_FETCH_TIMEOUT_MS = 15000;
    const ASSET_DOWNLOAD_TIMEOUT_MS = 45000;
    const SITE_SCAN_ELEMENT_LIMIT = 2500;
    const SITE_SCAN_BATCH_SIZE = 120;
    const SVG_GEOMETRY_ATTRIBUTES = Object.freeze({
        path: ['d'],
        circle: ['cx', 'cy', 'r'],
        rect: ['x', 'y', 'width', 'height', 'rx', 'ry'],
        line: ['x1', 'y1', 'x2', 'y2'],
        ellipse: ['cx', 'cy', 'rx', 'ry'],
        polyline: ['points'],
        polygon: ['points'],
    });
    const INSPECT_CSS_PROPERTIES = Object.freeze([
        'font-family',
        'font-size',
        'font-weight',
        'line-height',
        'color',
        'background',
        'border-radius',
        'box-shadow',
        'padding',
        'margin',
    ]);
    const STORAGE_KEYS = Object.freeze({
        history: 'cdp_detection_history',
        activeTab: 'cdp_active_tab',
        sidebarSide: 'cdp_sidebar_side',
        colorCache: 'cdp_color_database_cache',
    });
    const FALLBACK_COLOR_DATABASE = Object.freeze([
        { 'Color names': 'Black', Code: '#000000' },
        { 'Color names': 'White', Code: '#FFFFFF' },
        { 'Color names': 'Red', Code: '#FF0000' },
        { 'Color names': 'Lime', Code: '#00FF00' },
        { 'Color names': 'Blue', Code: '#0000FF' },
        { 'Color names': 'Yellow', Code: '#FFFF00' },
        { 'Color names': 'Cyan', Code: '#00FFFF' },
        { 'Color names': 'Magenta', Code: '#FF00FF' },
        { 'Color names': 'Silver', Code: '#C0C0C0' },
        { 'Color names': 'Gray', Code: '#808080' },
        { 'Color names': 'Maroon', Code: '#800000' },
        { 'Color names': 'Olive', Code: '#808000' },
        { 'Color names': 'Green', Code: '#008000' },
        { 'Color names': 'Purple', Code: '#800080' },
        { 'Color names': 'Teal', Code: '#008080' },
        { 'Color names': 'Navy', Code: '#000080' },
        { 'Color names': 'Orange', Code: '#FFA500' },
        { 'Color names': 'Pink', Code: '#FFC0CB' },
        { 'Color names': 'Brown', Code: '#A52A2A' },
        { 'Color names': 'Gold', Code: '#FFD700' },
        { 'Color names': 'Coral', Code: '#FF7F50' },
        { 'Color names': 'Salmon', Code: '#FA8072' },
        { 'Color names': 'Indigo', Code: '#4B0082' },
        { 'Color names': 'Violet', Code: '#EE82EE' },
        { 'Color names': 'Turquoise', Code: '#40E0D0' },
        { 'Color names': 'Beige', Code: '#F5F5DC' },
        { 'Color names': 'Ivory', Code: '#FFFFF0' },
        { 'Color names': 'Lavender', Code: '#E6E6FA' },
        { 'Color names': 'Mint', Code: '#98FF98' },
        { 'Color names': 'Charcoal', Code: '#36454F' },
    ]);

    let colorDatabase = [];
    let isPanelOpen = false;
    let sidebarSide = 'right';
    let isDetecting = false;
    let currentHighlight = null;
    let detectionHistory = [];
    let activeTab = 'database';
    let detectionMode = DETECTION_MODE_COMPUTED;
    let isEyeDropperOpen = false;
    let isAssetPickerActive = false;
    let currentAssetHighlight = null;
    let currentPickedAsset = null;
    let pageAssets = [];
    let iconIndexByHash = new Map();
    let iconLibraryNames = new Set();
    let iconIndexLoadPromise = null;
    let iconMatchCache = new WeakMap();
    let isScanningAssets = false;
    let isDownloadingAssets = false;
    let isInspectActive = false;
    let isInspectFrozen = false;
    let currentInspectHighlight = null;
    let currentInspectData = null;
    let siteInfo = {
        fonts: [],
        colors: [],
        tokens: [],
        technologies: [],
        scannedCount: 0,
        limitReached: false,
        scannedAt: null,
    };
    let isScanningSiteInfo = false;
    let notificationTimer = null;
