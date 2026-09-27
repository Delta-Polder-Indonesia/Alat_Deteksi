#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');

const EMOJI_PATTERN = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

function listJavaScriptFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...listJavaScriptFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            files.push(fullPath);
        }
    }
    return files.sort();
}

function lineColumnAt(text, index) {
    let line = 1;
    let column = 1;
    for (let i = 0; i < index; i += 1) {
        if (text[i] === '\n') {
            line += 1;
            column = 1;
        } else {
            column += 1;
        }
    }
    return { line, column };
}

function stripStringsAndComments(text) {
    let output = '';
    let state = 'code';

    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        const next = text[i + 1];

        if (state === 'line-comment') {
            if (ch === '\n') {
                output += ch;
                state = 'code';
            } else {
                output += ' ';
            }
            continue;
        }

        if (state === 'block-comment') {
            if (ch === '*' && next === '/') {
                output += '  ';
                i += 1;
                state = 'code';
            } else {
                output += ch === '\n' ? ch : ' ';
            }
            continue;
        }

        if (state === 'single-quote' || state === 'double-quote' || state === 'template') {
            const closeChar = state === 'single-quote' ? '\'' : state === 'double-quote' ? '"' : '`';
            if (ch === '\\') {
                output += ' ';
                if (next) {
                    output += next === '\n' ? '\n' : ' ';
                    i += 1;
                }
            } else if (ch === closeChar) {
                output += ' ';
                state = 'code';
            } else {
                output += ch === '\n' ? ch : ' ';
            }
            continue;
        }

        if (ch === '/' && next === '/') {
            output += '  ';
            i += 1;
            state = 'line-comment';
        } else if (ch === '/' && next === '*') {
            output += '  ';
            i += 1;
            state = 'block-comment';
        } else if (ch === '\'') {
            output += ' ';
            state = 'single-quote';
        } else if (ch === '"') {
            output += ' ';
            state = 'double-quote';
        } else if (ch === '`') {
            output += ' ';
            state = 'template';
        } else {
            output += ch;
        }
    }

    return output;
}

function pushMatches(violations, file, text, pattern, message) {
    pattern.lastIndex = 0;
    let match = pattern.exec(text);
    while (match) {
        const location = lineColumnAt(text, match.index);
        violations.push({
            file,
            line: location.line,
            column: location.column,
            message,
        });
        match = pattern.exec(text);
    }
}

function auditFile(file) {
    const text = fs.readFileSync(file, 'utf8');
    const relative = path.relative(ROOT, file);
    const violations = [];

    pushMatches(violations, relative, text, EMOJI_PATTERN, 'emoji tidak boleh ada di src/');
    pushMatches(violations, relative, text, /\son[a-z]+\s*=/gi, 'inline event handler tidak boleh ada di src/');

    const codeOnly = stripStringsAndComments(text);
    pushMatches(violations, relative, codeOnly, /\bconsole\s*\.\s*(?:log|debug)\s*\(/g, 'console.log atau console.debug debugging tidak boleh ada di src/');
    pushMatches(violations, relative, codeOnly, /\bvar\b/g, 'keyword var tidak boleh ada di src/');
    pushMatches(violations, relative, codeOnly, /\beval\s*\(/g, 'eval tidak boleh ada di src/');
    pushMatches(violations, relative, codeOnly, /\bnew\s+Function\s*\(|\bFunction\s*\(/g, 'Function constructor tidak boleh ada di src/');

    return violations;
}

const files = listJavaScriptFiles(SRC_DIR);
const violations = files.flatMap(auditFile);

if (violations.length > 0) {
    process.stderr.write('Audit src gagal:\n');
    for (const violation of violations) {
        process.stderr.write(`${violation.file}:${violation.line}:${violation.column} ${violation.message}\n`);
    }
    process.exit(1);
}

process.stdout.write('Audit src lulus.\n');
