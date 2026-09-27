'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadUtilities() {
    const sourcePath = path.join(__dirname, '..', 'src', '03-utilities.js');
    const source = fs.readFileSync(sourcePath, 'utf8');
    const sandbox = {
        module: { exports: {} },
        console,
    };

    vm.runInNewContext(`${source}\nmodule.exports = { hexToRgb, rgbToHsl, colorDistance, getContrastColor, rgbStringToHex, escapeHtml };`, sandbox, {
        filename: sourcePath,
    });

    return sandbox.module.exports;
}

const {
    hexToRgb,
    rgbToHsl,
    colorDistance,
    getContrastColor,
    rgbStringToHex,
    escapeHtml,
} = loadUtilities();

function plain(value) {
    return JSON.parse(JSON.stringify(value));
}

test('hexToRgb parses six-digit hex values', () => {
    assert.deepEqual(plain(hexToRgb('#FFFFFF')), { r: 255, g: 255, b: 255 });
    assert.deepEqual(plain(hexToRgb('000000')), { r: 0, g: 0, b: 0 });
    assert.deepEqual(plain(hexToRgb('#1a2B3c')), { r: 26, g: 43, b: 60 });
});

test('hexToRgb returns null for invalid input', () => {
    assert.equal(hexToRgb('#FFF'), null);
    assert.equal(hexToRgb('not-a-color'), null);
    assert.equal(hexToRgb('#12345G'), null);
});

test('rgbToHsl converts primary and neutral colors', () => {
    assert.deepEqual(plain(rgbToHsl(255, 0, 0)), { h: 0, s: 100, l: 50 });
    assert.deepEqual(plain(rgbToHsl(0, 255, 0)), { h: 120, s: 100, l: 50 });
    assert.deepEqual(plain(rgbToHsl(0, 0, 255)), { h: 240, s: 100, l: 50 });
    assert.deepEqual(plain(rgbToHsl(128, 128, 128)), { h: 0, s: 0, l: 50 });
    assert.deepEqual(plain(rgbToHsl(255, 255, 255)), { h: 0, s: 0, l: 100 });
});

test('colorDistance returns Euclidean distance and Infinity for invalid colors', () => {
    assert.equal(colorDistance('#123456', '#123456'), 0);
    assert.equal(colorDistance('#000000', '000000'), 0);
    assert.equal(colorDistance('#000000', 'invalid'), Infinity);
    assert.equal(colorDistance('invalid', '#FFFFFF'), Infinity);
    assert.ok(Math.abs(colorDistance('#000000', '#FFFFFF') - Math.sqrt(3 * 255 * 255)) < 1e-12);
});

test('getContrastColor picks readable foreground colors', () => {
    assert.equal(getContrastColor('#FFFFFF'), '#1a1a2e');
    assert.equal(getContrastColor('#FFFF00'), '#1a1a2e');
    assert.equal(getContrastColor('#000000'), '#FFFFFF');
    assert.equal(getContrastColor('#0000FF'), '#FFFFFF');
    assert.equal(getContrastColor('invalid'), '#FFFFFF');
});

test('rgbStringToHex converts rgb and rgba strings', () => {
    assert.equal(rgbStringToHex('rgb(12, 34, 56)'), '#0C2238');
    assert.equal(rgbStringToHex('rgba(255, 0, 170, 0.5)'), '#FF00AA');
    assert.equal(rgbStringToHex('rgb(0,0,0)'), '#000000');
    assert.equal(rgbStringToHex('not-rgb'), null);
});

test('escapeHtml escapes characters used in HTML text and attributes', () => {
    assert.equal(escapeHtml('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');
    assert.equal(escapeHtml('Color Detector'), 'Color Detector');
    assert.equal(escapeHtml(123), '123');
});
