'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'assets', 'icons');
const COLORS_PATH = path.join(PUBLIC_DIR, 'data', 'colors.json');
const ICON_INDEX_PATH = path.join(PUBLIC_DIR, 'data', 'icon-index.json');
const PROFILE_ICON_PATH = path.join(PUBLIC_DIR, 'assets', 'images', 'profile.svg');

function listFiles(directory) {
    return fs.readdirSync(directory, { withFileTypes: true })
        .filter(entry => entry.isFile())
        .map(entry => entry.name)
        .sort();
}

test('public assets use the normalized directory structure', () => {
    assert.ok(fs.existsSync(COLORS_PATH));
    assert.ok(fs.existsSync(ICON_INDEX_PATH));
    assert.ok(fs.existsSync(PROFILE_ICON_PATH));

    const publicEntries = fs.readdirSync(PUBLIC_DIR).sort();
    assert.deepEqual(publicEntries, ['assets', 'data']);

    const icons = listFiles(ICONS_DIR);
    assert.equal(icons.length, 1847);
    assert.ok(icons.every(file => /^[a-z0-9-]+\.svg$/.test(file)));
    assert.equal(new Set(icons).size, icons.length);
});

test('SVG assets contain markup without active content', () => {
    const svgPaths = [
        PROFILE_ICON_PATH,
        ...listFiles(ICONS_DIR).map(file => path.join(ICONS_DIR, file)),
    ];

    for (const svgPath of svgPaths) {
        const svg = fs.readFileSync(svgPath, 'utf8');
        assert.match(svg, /<svg\b/i, svgPath);
        assert.doesNotMatch(svg, /<script\b|<foreignObject\b|javascript:/i, svgPath);
    }
});

test('icon index covers every bundled icon', () => {
    const index = JSON.parse(fs.readFileSync(ICON_INDEX_PATH, 'utf8'));
    assert.equal(index.version, 1);
    assert.equal(index.count, 1847);

    const names = [];
    for (const [hash, matches] of Object.entries(index.hashes)) {
        assert.match(hash, /^[0-9a-f]{8}$/);
        assert.ok(Array.isArray(matches));
        matches.forEach(name => {
            assert.match(name, /^[a-z0-9-]+$/);
            names.push(name);
        });
    }
    assert.equal(names.length, 1847);
    const expectedNames = listFiles(ICONS_DIR).map(file => file.replace(/\.svg$/, '')).sort();
    assert.deepEqual(names.sort(), expectedNames);
});

test('color database contains unique and valid entries', () => {
    const colors = JSON.parse(fs.readFileSync(COLORS_PATH, 'utf8'));
    assert.equal(colors.length, 745);

    const codes = new Set();
    for (const color of colors) {
        assert.equal(typeof color['Color names'], 'string');
        assert.ok(color['Color names'].trim().length > 0);
        assert.match(color.Code, /^#[0-9A-Fa-f]{6}$/);
        assert.equal(codes.has(color.Code.toUpperCase()), false);
        codes.add(color.Code.toUpperCase());
    }
});

test('published URLs point to assets in this repository', () => {
    const config = fs.readFileSync(path.join(ROOT, 'src', '01-config.js'), 'utf8');
    const metadata = fs.readFileSync(path.join(ROOT, 'src', 'meta.js'), 'utf8');

    assert.match(config, /Delta-Polder-Indonesia\/Alat_Deteksi\/main/);
    assert.match(config, /\/public\/data\/colors\.json/);
    assert.match(config, /\/public\/data\/icon-index\.json/);
    assert.match(metadata, /\/public\/assets\/images\/profile\.svg/);
    assert.doesNotMatch(config + metadata, /api\.npoint\.io|JD-YH03D\/BintangToba/);
});

test('release version stays synchronized across metadata, UI, and package', () => {
    const packageVersion = require('../package.json').version;
    const metadata = fs.readFileSync(path.join(ROOT, 'src', 'meta.js'), 'utf8');
    const ui = fs.readFileSync(path.join(ROOT, 'src', '05-build-ui.js'), 'utf8');

    assert.match(metadata, new RegExp(`@version\\s+${packageVersion.replaceAll('.', '\\.')}`));
    assert.match(ui, new RegExp(`id="cdp-version">v${packageVersion.replaceAll('.', '\\.')}`));
});
