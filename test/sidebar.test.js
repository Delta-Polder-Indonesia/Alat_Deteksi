'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function classList() {
    const classes = new Set();
    return {
        classes,
        toggle(name, force) {
            if (force) classes.add(name);
            else classes.delete(name);
        },
    };
}

function loadSidebarUtilities() {
    const sourcePath = path.join(__dirname, '..', 'src', '06-event-listeners.js');
    const source = fs.readFileSync(sourcePath, 'utf8');
    const panelClasses = classList();
    const toggleAttributes = {};
    const panelAttributes = {};
    const contentAttributes = {};
    const storedValues = {};
    const notifications = [];
    const toggleButton = {
        title: '',
        setAttribute(name, value) {
            toggleAttributes[name] = value;
        },
        focus() {},
    };
    const sideButtonAttributes = {};
    const sideButton = {
        title: '',
        setAttribute(name, value) {
            sideButtonAttributes[name] = value;
        },
    };
    const panel = {
        classList: panelClasses,
        setAttribute(name, value) {
            panelAttributes[name] = value;
        },
    };
    const content = {
        setAttribute(name, value) {
            contentAttributes[name] = value;
        },
        contains() {
            return false;
        },
    };
    const sandbox = {
        module: { exports: {} },
        isPanelOpen: false,
        sidebarSide: 'right',
        STORAGE_KEYS: { sidebarSide: 'cdp_sidebar_side' },
        safeSetValue(key, value) {
            storedValues[key] = value;
        },
        showNotification(message, type) {
            notifications.push({ message, type });
        },
        document: {
            activeElement: null,
            getElementById(id) {
                if (id === 'cdp-toggle-btn') return toggleButton;
                if (id === 'cdp-side-btn') return sideButton;
                if (id === 'cdp-sidebar-content') return content;
                return null;
            },
        },
    };

    vm.runInNewContext(`${source}\nmodule.exports = { setPanelOpen, setPanelSide, getPanelState: () => isPanelOpen, getPanelSide: () => sidebarSide };`, sandbox, {
        filename: sourcePath,
    });

    return {
        setPanelOpen: sandbox.module.exports.setPanelOpen,
        setPanelSide: sandbox.module.exports.setPanelSide,
        getPanelState: sandbox.module.exports.getPanelState,
        getPanelSide: sandbox.module.exports.getPanelSide,
        panel,
        panelClasses,
        panelAttributes,
        contentAttributes,
        toggleAttributes,
        toggleButton,
        sideButton,
        sideButtonAttributes,
        storedValues,
        notifications,
    };
}

test('buildUI keeps the toggle and section tabs inside a persistent navigation rail', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'src', '05-build-ui.js'), 'utf8');
    const railIndex = source.indexOf('<aside id="cdp-sidebar-rail"');
    const contentIndex = source.indexOf('<main id="cdp-sidebar-content"');

    assert.ok(railIndex >= 0);
    assert.ok(contentIndex > railIndex);
    assert.match(source, /id="cdp-toggle-btn" class="cdp-rail-btn cdp-rail-toggle"/);
    assert.match(source, /id="cdp-color-nav" class="cdp-rail-btn"/);
    assert.match(source, /id="cdp-side-btn" class="cdp-rail-btn cdp-side-btn"/);
    assert.match(source, /<nav id="cdp-tabs"/);
    assert.doesNotMatch(source, /appendChild\(toggleBtn\)|cdp-btn-close/);
});

test('setPanelOpen synchronizes sidebar content, rail toggle, and accessibility state', () => {
    const ui = loadSidebarUtilities();

    ui.setPanelOpen(ui.panel, true);
    assert.equal(ui.getPanelState(), true);
    assert.equal(ui.panelClasses.classes.has('cdp-hidden'), false);
    assert.equal(ui.panelAttributes['data-open'], 'true');
    assert.equal(ui.contentAttributes['aria-hidden'], 'false');
    assert.equal(ui.toggleAttributes['aria-expanded'], 'true');
    assert.equal(ui.toggleAttributes['aria-label'], 'Close Color Detector Pro');
    assert.equal(ui.toggleButton.title, 'Close sidebar (Alt+C)');

    ui.setPanelOpen(ui.panel, false);
    assert.equal(ui.getPanelState(), false);
    assert.equal(ui.panelClasses.classes.has('cdp-hidden'), true);
    assert.equal(ui.panelAttributes['data-open'], 'false');
    assert.equal(ui.contentAttributes['aria-hidden'], 'true');
    assert.equal(ui.toggleAttributes['aria-expanded'], 'false');
    assert.equal(ui.toggleAttributes['aria-label'], 'Open Color Detector Pro');
    assert.equal(ui.toggleButton.title, 'Open sidebar (Alt+C)');
});

test('setPanelSide moves the sidebar between screen edges', () => {
    const ui = loadSidebarUtilities();

    ui.setPanelSide(ui.panel, 'left');
    assert.equal(ui.getPanelSide(), 'left');
    assert.equal(ui.panelClasses.classes.has('cdp-sidebar-left'), true);
    assert.equal(ui.panelAttributes['data-side'], 'left');
    assert.equal(ui.sideButton.title, 'Move sidebar to right');
    assert.equal(ui.sideButtonAttributes['aria-label'], 'Move sidebar to right');
    assert.equal(ui.storedValues.cdp_sidebar_side, 'left');
    assert.deepEqual(ui.notifications, [{ message: 'Sidebar: Left', type: 'info' }]);

    ui.setPanelSide(ui.panel, 'right');
    assert.equal(ui.getPanelSide(), 'right');
    assert.equal(ui.panelClasses.classes.has('cdp-sidebar-left'), false);
    assert.equal(ui.sideButton.title, 'Move sidebar to left');
    assert.equal(ui.sideButtonAttributes['aria-label'], 'Move sidebar to left');
    assert.equal(ui.storedValues.cdp_sidebar_side, 'right');
    assert.deepEqual(ui.notifications[1], { message: 'Sidebar: Right', type: 'info' });
});
