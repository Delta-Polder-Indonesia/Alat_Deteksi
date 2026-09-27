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

function loadSetPanelOpen() {
    const sourcePath = path.join(__dirname, '..', 'src', '06-event-listeners.js');
    const source = fs.readFileSync(sourcePath, 'utf8');
    const toggleClasses = classList();
    const panelClasses = classList();
    const toggleAttributes = {};
    const panelAttributes = {};
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
        document: {
            activeElement: null,
            getElementById(id) {
                return id === 'cdp-toggle-btn' ? toggleButton : null;
            },
        },
    };

    vm.runInNewContext(`${source}\nmodule.exports = { setPanelOpen, getPanelState: () => isPanelOpen };`, sandbox, {
        filename: sourcePath,
    });

    return {
        setPanelOpen: sandbox.module.exports.setPanelOpen,
        getPanelState: sandbox.module.exports.getPanelState,
        panel,
        panelClasses,
        panelAttributes,
        toggleClasses,
        toggleAttributes,
        toggleButton,
    };
}

test('setPanelOpen synchronizes sidebar, toggle button, and accessibility state', () => {
    const ui = loadSetPanelOpen();

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
