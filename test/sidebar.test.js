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
    const toggleClasses = classList();
    const panelClasses = classList();
    const toggleAttributes = {};
    const panelAttributes = {};
    const storedValues = {};
    const notifications = [];
    const toggleButton = {
        classList: toggleClasses,
        title: '',
        setAttribute(name, value) {
            toggleAttributes[name] = value;
        },
        focus() {},
    };
    const panel = {
        classList: panelClasses,
        setAttribute(name, value) {
            panelAttributes[name] = value;
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
                return id === 'cdp-toggle-btn' ? toggleButton : null;
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
        toggleClasses,
        toggleAttributes,
        toggleButton,
        storedValues,
        notifications,
    };
}

test('setPanelOpen synchronizes sidebar, toggle button, and accessibility state', () => {
    const ui = loadSidebarUtilities();

    ui.setPanelOpen(ui.panel, true);
    assert.equal(ui.getPanelState(), true);
    assert.equal(ui.panelClasses.classes.has('cdp-hidden'), false);
    assert.equal(ui.toggleClasses.classes.has('cdp-sidebar-open'), true);
    assert.equal(ui.panelAttributes['aria-hidden'], 'false');
    assert.equal(ui.toggleAttributes['aria-expanded'], 'true');
    assert.equal(ui.toggleButton.title, 'Hide Color Detector Pro');

    ui.setPanelOpen(ui.panel, false);
    assert.equal(ui.getPanelState(), false);
    assert.equal(ui.panelClasses.classes.has('cdp-hidden'), true);
    assert.equal(ui.toggleClasses.classes.has('cdp-sidebar-open'), false);
    assert.equal(ui.panelAttributes['aria-hidden'], 'true');
    assert.equal(ui.toggleAttributes['aria-expanded'], 'false');
    assert.equal(ui.toggleButton.title, 'Show Color Detector Pro');
});

test('setPanelSide moves the sidebar and toggle button between screen edges', () => {
    const ui = loadSidebarUtilities();

    ui.setPanelSide(ui.panel, 'left');
    assert.equal(ui.getPanelSide(), 'left');
    assert.equal(ui.panelClasses.classes.has('cdp-sidebar-left'), true);
    assert.equal(ui.toggleClasses.classes.has('cdp-sidebar-left'), true);
    assert.equal(ui.panelAttributes['data-side'], 'left');
    assert.equal(ui.toggleAttributes['data-side'], 'left');
    assert.equal(ui.storedValues.cdp_sidebar_side, 'left');
    assert.deepEqual(ui.notifications, [{ message: 'Sidebar: Left', type: 'info' }]);

    ui.setPanelSide(ui.panel, 'right');
    assert.equal(ui.getPanelSide(), 'right');
    assert.equal(ui.panelClasses.classes.has('cdp-sidebar-left'), false);
    assert.equal(ui.toggleClasses.classes.has('cdp-sidebar-left'), false);
    assert.equal(ui.storedValues.cdp_sidebar_side, 'right');
    assert.deepEqual(ui.notifications[1], { message: 'Sidebar: Right', type: 'info' });
});
