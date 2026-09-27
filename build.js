#!/usr/bin/env node
/**
 * Build script — Color Detector Pro userscript.
 *
 * Menggabungkan semua bagian di src/ (sesuai urutan ORDER di bawah)
 * menjadi satu file userscript utuh di dist/ColorDetektor.user.js.
 *
 * Tanpa dependency eksternal — cukup Node.js bawaan.
 *
 * Pemakaian:
 *   node build.js            build sekali
 *   node build.js --watch    rebuild otomatis setiap ada perubahan di src/
 *   npm run build            sama seperti node build.js
 *   npm run watch            sama seperti node build.js --watch
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const SRC_DIR = path.join(ROOT, 'src');
const DIST_DIR = path.join(ROOT, 'dist');
const OUT_FILE = path.join(DIST_DIR, 'ColorDetektor.user.js');

/* Urutan penggabungan bagian utama userscript.
   HATI-HATI: jangan ubah urutan kecuali tahu akibatnya —
   semua bagian berbagi scope yang sama di dalam satu IIFE. */
const ORDER = [
    'meta.js',            // header ==UserScript== (nama, versi, match, grant, dll.)
    '00-header.js',       // pembuka IIFE + 'use strict'
    '01-config.js',       // konstanta & state global (URL aset, flags)
    '02-styles.js',       // semua CSS via GM_addStyle
    '03-utilities.js',    // konversi warna, pencocokan warna, clipboard, notifikasi
    '05-build-ui.js',     // pembuatan elemen DOM panel/tombol/tooltip
    '06-event-listeners.js', // pasang semua event listener
    '07-mouse-detection.js', // hover highlight + klik deteksi warna
    '09-render.js',       // render list database, history, palette
    '10-fetch-colors.js', // ambil database warna via GM_xmlhttpRequest
    '11-init.js',         // buildUI() + fetchColors()
    '99-footer.js',       // penutup IIFE
];

const SVG_GEOMETRY_ATTRIBUTES = Object.freeze({
    path: ['d'],
    circle: ['cx', 'cy', 'r'],
    rect: ['x', 'y', 'width', 'height', 'rx', 'ry'],
    line: ['x1', 'y1', 'x2', 'y2'],
    ellipse: ['cx', 'cy', 'rx', 'ry'],
    polyline: ['points'],
    polygon: ['points'],
});

function svgAttribute(markup, name) {
    const match = new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i').exec(markup);
    return match ? match[2] : '';
}

function svgGeometrySignature(svgCode) {
    const parts = [];
    const elementPattern = /<(path|circle|rect|line|ellipse|polyline|polygon)\b([^>]*)\/?\s*>/gi;
    let match = elementPattern.exec(svgCode);
    while (match) {
        const tag = match[1].toLowerCase();
        const attributes = SVG_GEOMETRY_ATTRIBUTES[tag]
            .map(name => `${name}=${svgAttribute(match[2], name)}`)
            .join(';');
        parts.push(`${tag}:${attributes}`);
        match = elementPattern.exec(svgCode);
    }
    return parts.join('|');
}

function fnv1aHash(text) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}

function buildIconIndex() {
    const iconDirectory = path.join(ROOT, 'public', 'assets', 'icons');
    const outputPath = path.join(ROOT, 'public', 'data', 'icon-index.json');
    const filenames = fs.readdirSync(iconDirectory)
        .filter(filename => filename.endsWith('.svg'))
        .sort();
    const hashes = {};

    for (const filename of filenames) {
        const svgCode = fs.readFileSync(path.join(iconDirectory, filename), 'utf8');
        const signature = svgGeometrySignature(svgCode);
        if (!signature) {
            throw new Error(`Ikon tidak memiliki geometri SVG: ${filename}`);
        }
        const hash = fnv1aHash(signature);
        if (!hashes[hash]) hashes[hash] = [];
        hashes[hash].push(path.basename(filename, '.svg'));
    }

    const sortedHashes = {};
    Object.keys(hashes).sort().forEach(hash => {
        sortedHashes[hash] = hashes[hash].sort();
    });
    const index = {
        version: 1,
        count: filenames.length,
        hashes: sortedHashes,
    };
    fs.writeFileSync(outputPath, JSON.stringify(index) + '\n');
    return filenames.length;
}

function build() {
    const iconCount = buildIconIndex();
    const buffers = [];
    for (const file of ORDER) {
        const p = path.join(SRC_DIR, file);
        if (!fs.existsSync(p)) {
            console.error(`Error: file hilang: src/${file}`);
            process.exit(1);
        }
        buffers.push(fs.readFileSync(p));
    }

    const output = Buffer.concat(buffers);

    // Validasi sederhana: header userscript & penutup IIFE harus ada
    const text = output.toString('utf8');
    if (!text.includes('==/UserScript==')) {
        console.error('Error: hasil build tidak punya header ==UserScript== — cek src/meta.js');
        process.exit(1);
    }

    fs.mkdirSync(DIST_DIR, { recursive: true });
    fs.writeFileSync(OUT_FILE, output);

    // Syntax-check hasil akhir pakai Node sendiri
    try {
        execFileSync(process.execPath, ['--check', OUT_FILE], { stdio: 'pipe' });
    } catch (err) {
        console.error('Error: hasil build gagal syntax check:');
        console.error(err.stderr ? err.stderr.toString() : String(err));
        process.exit(1);
    }

    const sizeKB = (output.length / 1024).toFixed(1);
    const version = (text.match(/@version\s+(\S+)/) || [])[1] || '?';
    console.log(`Build OK: dist/ColorDetektor.user.js  v${version}  (${sizeKB} KB) — ${ORDER.length} bagian, ${iconCount} ikon diindeks`);
}

build();

if (process.argv.includes('--watch')) {
    let timer = null;
    fs.watch(SRC_DIR, (event, filename) => {
        if (!filename || !filename.endsWith('.js')) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
            console.log(`Perubahan terdeteksi: ${filename}`);
            build();
        }, 100);
    });
    console.log('Watch mode aktif — edit file di src/, dist akan rebuild otomatis');
}
