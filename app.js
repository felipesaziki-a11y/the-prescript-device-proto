"use strict";
const STORAGE_KEY = 'decryption-protocol.v1';
const MAX_SUBJECTS = 7;
const DEFAULT_SUBJECTS = [
    'the ceiling',
    'your reflection',
    'a stranger',
    'the streetlight',
];
const TEMPLATES = [
    'Hit an enemy with a marked Skill or hit {subject} with a marked Skill.',
    'Hit a target with a marked Skill.',
    'Hit a target with a cost 3 Skill or with an EGO Skill.',
];
const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#$%&~01ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
// ──────────────────────────────────────────────
// Persistence
// ──────────────────────────────────────────────
function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            throw new Error('empty');
        const parsed = JSON.parse(raw);
        const subjects = Array.isArray(parsed.subjects)
            ? parsed.subjects.filter((s) => typeof s === 'string').slice(0, MAX_SUBJECTS)
            : DEFAULT_SUBJECTS.slice();
        const templateIndex = typeof parsed.templateIndex === 'number' &&
            parsed.templateIndex >= 0 &&
            parsed.templateIndex < TEMPLATES.length
            ? parsed.templateIndex
            : 0;
        return { subjects, templateIndex };
    }
    catch (_a) {
        return { subjects: DEFAULT_SUBJECTS.slice(), templateIndex: 0 };
    }
}
function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
// ──────────────────────────────────────────────
// State
// ──────────────────────────────────────────────
const state = loadState();
// ──────────────────────────────────────────────
// DOM references
// ──────────────────────────────────────────────
const subjectListEl = document.getElementById('subjectList');
const subjectCountEl = document.getElementById('subjectCount');
const subjectFormEl = document.getElementById('subjectForm');
const subjectInputEl = document.getElementById('subjectInput');
const subjectAddBtn = document.getElementById('subjectAdd');
const subjectHintEl = document.getElementById('subjectHint');
const templateGridEl = document.getElementById('templateGrid');
const generateBtn = document.getElementById('generateBtn');
const readoutEl = document.getElementById('readout');
const submitRow = document.getElementById('submitRow');
const submitBtn = document.getElementById('submitBtn');
const orderMeta = document.getElementById('orderMeta');
const orderTimestampEl = document.getElementById('orderTimestamp');
const newOrderBtn = document.getElementById('newOrderBtn');
// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomChar() {
    return SCRAMBLE_CHARS[randomInt(0, SCRAMBLE_CHARS.length - 1)];
}
function pickRandomSubject(subjects) {
    if (subjects.length === 0)
        return null;
    return subjects[randomInt(0, subjects.length - 1)];
}
function showSubmitRow() {
    submitRow.classList.add('is-visible');
    submitRow.setAttribute('aria-hidden', 'false');
    submitBtn.disabled = false;
}
function hideSubmitRow() {
    submitRow.classList.remove('is-visible');
    submitRow.setAttribute('aria-hidden', 'true');
    submitBtn.disabled = true;
}
function showOrderMeta() {
    orderMeta.classList.add('is-visible');
    orderMeta.setAttribute('aria-hidden', 'false');
}
function hideOrderMeta() {
    orderMeta.classList.remove('is-visible');
    orderMeta.setAttribute('aria-hidden', 'true');
}
function setHint(message, isError = false) {
    subjectHintEl.textContent = message || '\u00A0';
    subjectHintEl.classList.toggle('is-error', isError);
}
// ──────────────────────────────────────────────
// Rendering: subjects
// ──────────────────────────────────────────────
function renderSubjects() {
    subjectListEl.innerHTML = '';
    if (state.subjects.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'subject-list__empty';
        empty.textContent = 'no subjects yet — the directive has nothing to point at.';
        subjectListEl.appendChild(empty);
    }
    state.subjects.forEach((subject, index) => {
        const li = document.createElement('li');
        li.className = 'subject-chip';
        const label = document.createElement('span');
        label.className = 'subject-chip__label';
        label.textContent = subject;
        label.title = subject;
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'subject-chip__remove';
        removeBtn.setAttribute('aria-label', `remove ${subject}`);
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', () => removeSubject(index));
        li.appendChild(label);
        li.appendChild(removeBtn);
        subjectListEl.appendChild(li);
    });
    subjectCountEl.textContent = `${state.subjects.length} / ${MAX_SUBJECTS}`;
    const atLimit = state.subjects.length >= MAX_SUBJECTS;
    subjectInputEl.disabled = atLimit;
    subjectAddBtn.disabled = atLimit;
    if (atLimit) {
        setHint('limit reached — remove a subject to add another.');
    }
    generateBtn.disabled = state.subjects.length === 0;
}
function addSubject(raw) {
    const value = raw.trim();
    if (!value) {
        setHint('write something first.', true);
        return;
    }
    if (state.subjects.length >= MAX_SUBJECTS) {
        setHint('limit reached — remove a subject to add another.', true);
        return;
    }
    if (state.subjects.some((s) => s.toLowerCase() === value.toLowerCase())) {
        setHint('that subject already exists.', true);
        return;
    }
    state.subjects.push(value);
    saveState(state);
    setHint('');
    renderSubjects();
}
function removeSubject(index) {
    state.subjects.splice(index, 1);
    saveState(state);
    setHint('');
    renderSubjects();
}
// ──────────────────────────────────────────────
// Rendering: templates
// ──────────────────────────────────────────────
function renderTemplates() {
    templateGridEl.innerHTML = '';
    TEMPLATES.forEach((template, index) => {
        const label = document.createElement('label');
        label.className = 'template-card';
        label.classList.toggle('is-selected', index === state.templateIndex);
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'template';
        input.value = String(index);
        input.checked = index === state.templateIndex;
        input.addEventListener('change', () => {
            state.templateIndex = index;
            saveState(state);
            renderTemplates();
        });
        const radio = document.createElement('span');
        radio.className = 'template-card__radio';
        radio.setAttribute('aria-hidden', 'true');
        const text = document.createElement('span');
        text.className = 'template-card__text';
        text.textContent = template.replace('{subject}', '\u2026');
        label.appendChild(input);
        label.appendChild(radio);
        label.appendChild(text);
        templateGridEl.appendChild(label);
    });
}
// ──────────────────────────────────────────────
// Decryption text effect
// ──────────────────────────────────────────────
class Decoder {
    constructor(finalText, container, onComplete) {
        this.rafId = null;
        this.startTime = 0;
        this.finalText = finalText;
        this.container = container;
        this.onComplete = onComplete !== null && onComplete !== void 0 ? onComplete : null;
        this.extraLength = randomInt(10, 26);
        this.collapseDuration = randomInt(450, 700);
        this.decodeDuration = 900 + finalText.length * 26;
        this.perCharLockOffsets = finalText.split('').map(() => Math.random());
    }
    start() {
        this.stop();
        this.startTime = performance.now();
        const tick = (now) => {
            var _a;
            const elapsed = now - this.startTime;
            this.render(elapsed);
            const totalDuration = this.collapseDuration + this.decodeDuration;
            if (elapsed < totalDuration) {
                this.rafId = requestAnimationFrame(tick);
            }
            else {
                this.renderFinal();
                this.rafId = null;
                (_a = this.onComplete) === null || _a === void 0 ? void 0 : _a.call(this);
            }
        };
        this.rafId = requestAnimationFrame(tick);
    }
    stop() {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }
    render(elapsed) {
        if (elapsed < this.collapseDuration) {
            this.renderCollapsePhase(elapsed);
        }
        else {
            this.renderDecodePhase(elapsed - this.collapseDuration);
        }
    }
    renderCollapsePhase(elapsed) {
        const progress = Math.min(elapsed / this.collapseDuration, 1);
        const currentExtra = Math.round(this.extraLength * (1 - progress));
        const length = this.finalText.length + currentExtra;
        const frag = document.createDocumentFragment();
        for (let i = 0; i < length; i++) {
            const span = document.createElement('span');
            span.className = 'glyph';
            span.textContent = randomChar();
            frag.appendChild(span);
        }
        this.container.replaceChildren(frag);
    }
    renderDecodePhase(elapsed) {
        const frag = document.createDocumentFragment();
        const chars = this.finalText.split('');
        chars.forEach((char, i) => {
            const span = document.createElement('span');
            const lockAt = this.decodeDuration * 0.15 +
                (i / Math.max(chars.length - 1, 1)) * this.decodeDuration * 0.6 +
                this.perCharLockOffsets[i] * this.decodeDuration * 0.25;
            if (char === ' ') {
                span.textContent = ' ';
            }
            else if (elapsed >= lockAt) {
                span.className = 'glyph glyph--settled';
                span.textContent = char;
            }
            else {
                span.className = 'glyph';
                span.textContent = randomChar();
            }
            frag.appendChild(span);
        });
        this.container.replaceChildren(frag);
    }
    renderFinal() {
        const frag = document.createDocumentFragment();
        this.finalText.split('').forEach((char) => {
            const span = document.createElement('span');
            span.className = 'glyph glyph--settled';
            span.textContent = char;
            frag.appendChild(span);
        });
        this.container.replaceChildren(frag);
    }
}
let activeDecoder = null;
function generateText() {
    var _a;
    const subject = pickRandomSubject(state.subjects);
    if (!subject) {
        setHint('add at least one subject first.', true);
        return;
    }
    const template = (_a = TEMPLATES[state.templateIndex]) !== null && _a !== void 0 ? _a : TEMPLATES[0];
    const finalText = template.replace('{subject}', subject);
    if (activeDecoder) {
        activeDecoder.stop();
    }
    // Reset submit row whenever a new decode starts
    hideSubmitRow();
    hideOrderMeta();
    readoutEl.classList.remove('readout--success');
    generateBtn.disabled = true;
    playDecryptSound();
    
    activeDecoder = new Decoder(finalText, readoutEl, () => {
        // Decode finished — reveal the submit button
        generateBtn.disabled = state.subjects.length === 0;
        showSubmitRow();
    });
    activeDecoder.start();
}
// ──────────────────────────────────────────────
// Success sequence
// ──────────────────────────────────────────────
let successDecoder = null;
function submitOrder() {
    hideSubmitRow();
    generateBtn.disabled = true;
    playSubmitSound();
    
    // Stamp the timestamp
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    orderTimestampEl.textContent =
        `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
            `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    // Tint the readout for success
    readoutEl.classList.add('readout--success');
    // Decode "ORDER SUCCEEDED" right into the readout, replacing the directive
    if (successDecoder)
        successDecoder.stop();
    successDecoder = new Decoder('Clear.', readoutEl, () => {
        // After decode finishes, show the meta strip
        showOrderMeta();
    });
    successDecoder.start();
}
function resetOrder() {
    if (successDecoder) {
        successDecoder.stop();
        successDecoder = null;
    }
    hideOrderMeta();
    readoutEl.classList.remove('readout--success');
    readoutEl.innerHTML = '<span class="readout__cursor">awaiting input\u00A0</span>';
    generateBtn.disabled = state.subjects.length === 0;
}
// ──────────────────────────────────────────────
// ──────────────────────────────────────────────
// Sound effects
// Replace the paths below with your own audio files.
// Supported formats: .mp3 · .ogg · .wav
// ──────────────────────────────────────────────
const SOUND_DECRYPT = new Audio('src/sounds/decrypt.mp3');
const SOUND_SUBMIT  = new Audio('src/sounds/submit.mp3');
function playDecryptSound() {
    if (!SOUND_DECRYPT.src) return;
    SOUND_DECRYPT.currentTime = 0;
    SOUND_DECRYPT.play().catch(() => { /* autoplay blocked — ignore */ });
}
function playSubmitSound() {
    if (!SOUND_SUBMIT.src) return;
    SOUND_SUBMIT.currentTime = 0;
    SOUND_SUBMIT.play().catch(() => { /* autoplay blocked — ignore */ });
}
// ──────────────────────────────────────────────
// Wire up events
// ──────────────────────────────────────────────
subjectFormEl.addEventListener('submit', (e) => {
    e.preventDefault();
    addSubject(subjectInputEl.value);
    subjectInputEl.value = '';
    subjectInputEl.focus();
});
generateBtn.addEventListener('click', generateText);
submitBtn.addEventListener('click', submitOrder);
newOrderBtn.addEventListener('click', resetOrder);
// ──────────────────────────────────────────────
// Init
// ──────────────────────────────────────────────
renderSubjects();
renderTemplates();