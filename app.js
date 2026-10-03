// Standalone display-map editor for Vipark RS13 config files.
// File format (same as the device backup / CLI):
//   setmap <disp> <port> <mask_hex>
//   savemap
// Lines starting with '#' are comments.

const PORTS = 12, SENSORS = 16, DISPS = 10;
const DEFAULT_NAME = 'RS13cfg.txt';

// maps[d][p] = 16-bit sensor mask
let maps = emptyMaps();
let curDisp = 0;
let clipboard = null;
let fileHandle = null;      // File System Access API handle (Chromium only)
let fileName = null;
let dirty = false;

function emptyMaps() {
  return Array.from({length: DISPS}, () => new Array(PORTS).fill(0));
}

const hex4 = v => v.toString(16).toUpperCase().padStart(4, '0');
const $ = id => document.getElementById(id);

function showMsg(t, ok) {
  const m = $('msg');
  m.textContent = t;
  m.className = 'msg ' + (ok ? 'ok' : 'err');
  clearTimeout(showMsg.timer);
  showMsg.timer = setTimeout(() => m.className = 'msg', ok ? 3000 : 6000);
}

function setDirty(v) {
  dirty = v;
  $('dirty').className = 'dirty' + (v ? ' on' : '');
  document.title = (v ? '* ' : '') + (fileName || 'Display Map Editor');
}

function setFileName(n) {
  fileName = n;
  $('file-name').textContent = n || 'No file loaded';
}

// ---------- Parse / serialize ----------

function parseConfig(text) {
  const out = emptyMaps();
  const warnings = [];
  let count = 0;
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    if (/^savemap$/i.test(line)) return;
    const m = line.match(/^setmap\s+(\d+)\s+(\d+)\s+(?:0x)?([0-9a-f]+)$/i);
    if (!m) { warnings.push(`line ${i + 1}: unrecognized "${line}"`); return; }
    const d = parseInt(m[1], 10), p = parseInt(m[2], 10), v = parseInt(m[3], 16);
    if (d >= DISPS || p >= PORTS) { warnings.push(`line ${i + 1}: display/port out of range`); return; }
    if (v > 0xFFFF) warnings.push(`line ${i + 1}: mask truncated to 16 bits`);
    out[d][p] = v & 0xFFFF;
    count++;
  });
  return {maps: out, count, warnings};
}

function serializeConfig() {
  let txt = '';
  for (let d = 0; d < DISPS; d++)
    for (let p = 0; p < PORTS; p++)
      txt += 'setmap ' + d + ' ' + p + ' ' + maps[d][p].toString(16).toUpperCase() + '\n';
  if ($('opt-savemap').checked) txt += 'savemap\n';
  return txt;
}

// ---------- File I/O ----------

async function openFile() {
  if (dirty && !confirm('Discard unsaved changes?')) return;
  if (window.showOpenFilePicker) {
    try {
      const [h] = await showOpenFilePicker({types: [{description: 'Config file', accept: {'text/plain': ['.txt']}}]});
      const f = await h.getFile();
      loadText(await f.text(), f.name, h);
    } catch (e) { if (e.name !== 'AbortError') showMsg('Open failed: ' + e.message, false); }
  } else {
    $('file-input').click();
  }
}

function readFileInput(input) {
  const f = input.files[0];
  input.value = '';
  if (f) f.text().then(t => loadText(t, f.name, null));
}

function loadText(text, name, handle) {
  const r = parseConfig(text);
  if (r.count === 0) { showMsg('No valid setmap lines found in ' + name, false); return; }
  maps = r.maps;
  fileHandle = handle;
  setFileName(name);
  setDirty(false);
  renderAll();
  if (r.warnings.length) {
    showMsg(`Loaded ${r.count} mappings with ${r.warnings.length} warning(s): ` + r.warnings.slice(0, 5).join('; ') +
      (r.warnings.length > 5 ? '; ...' : ''), false);
  } else {
    showMsg(`Loaded ${r.count} mappings from ${name}`, true);
  }
}

async function saveFile(saveAs) {
  const txt = serializeConfig();
  try {
    if (window.showSaveFilePicker) {
      if (saveAs || !fileHandle) {
        fileHandle = await showSaveFilePicker({
          suggestedName: fileName || DEFAULT_NAME,
          types: [{description: 'Config file', accept: {'text/plain': ['.txt']}}]
        });
      }
      const w = await fileHandle.createWritable();
      await w.write(txt);
      await w.close();
      setFileName(fileHandle.name);
    } else {
      // Fallback: download
      let name = fileName || DEFAULT_NAME;
      if (saveAs) { name = prompt('File name', name); if (!name) return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([txt], {type: 'text/plain'}));
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
      setFileName(name);
    }
    setDirty(false);
    showMsg('Saved ' + fileName, true);
  } catch (e) {
    if (e.name !== 'AbortError') showMsg('Save failed: ' + e.message, false);
  }
}

function newConfig() {
  if (dirty && !confirm('Discard unsaved changes?')) return;
  maps = emptyMaps();
  fileHandle = null;
  setFileName(null);
  setDirty(false);
  renderAll();
}

// ---------- Display tabs ----------

const bitCount = v => { let n = 0; while (v) { n += v & 1; v >>= 1; } return n; };

function renderTabs() {
  let h = '';
  for (let d = 0; d < DISPS; d++) {
    const n = maps[d].reduce((a, v) => a + bitCount(v), 0);
    h += `<button class="${d === curDisp ? 'active' : ''}" onclick="selectDisplay(${d})">Display ${d}<span class="n">${n || ''}</span></button>`;
  }
  $('disp-tabs').innerHTML = h;
}

function selectDisplay(d) {
  curDisp = d;
  $('disp-title').textContent = 'Display ' + d;
  renderAll();
}

// ---------- Grid ----------

function buildGrid() {
  let h = '<table><tr><th></th>';
  for (let s = 0; s < SENSORS; s++)
    h += `<th class="col" onclick="toggleCol(${s})" title="Toggle sensor ${s} on all ports">${s.toString(16).toUpperCase()}</th>`;
  h += '<th>Hex</th></tr>';
  for (let p = 0; p < PORTS; p++) {
    h += `<tr><td class="hdr" onclick="toggleRow(${p})" title="Toggle all sensors on port ${p}">Port ${p}</td>`;
    for (let s = 0; s < SENSORS; s++)
      h += `<td class="cell" id="c_${p}_${s}" data-p="${p}" data-s="${s}"></td>`;
    h += `<td><input type="text" class="hex" id="hex_${p}" maxlength="4" onchange="hexInput(${p})" onkeydown="if(event.key==='Enter')this.blur()"></td></tr>`;
  }
  h += '</table>';
  $('map-grid').innerHTML = h;

  // click & drag painting
  let painting = null;
  const grid = $('map-grid');
  grid.addEventListener('mousedown', e => {
    const td = e.target.closest('td.cell');
    if (!td) return;
    e.preventDefault();
    const p = +td.dataset.p, s = +td.dataset.s;
    painting = !(maps[curDisp][p] & (1 << s));
    setBit(p, s, painting);
  });
  grid.addEventListener('mouseover', e => {
    if (painting === null) return;
    const td = e.target.closest('td.cell');
    if (td) setBit(+td.dataset.p, +td.dataset.s, painting);
  });
  window.addEventListener('mouseup', () => painting = null);
}

function setBit(p, s, on) {
  const m = maps[curDisp];
  const v = on ? (m[p] | (1 << s)) : (m[p] & ~(1 << s));
  if (v === m[p]) return;
  m[p] = v;
  changed();
}

function toggleRow(p) {
  const m = maps[curDisp];
  m[p] = m[p] === 0xFFFF ? 0 : 0xFFFF;
  changed();
}

function toggleCol(s) {
  const m = maps[curDisp], bit = 1 << s;
  const all = m.every(v => v & bit);
  for (let p = 0; p < PORTS; p++) m[p] = all ? (m[p] & ~bit) : (m[p] | bit);
  changed();
}

function hexInput(p) {
  const el = $('hex_' + p);
  const t = el.value.trim();
  if (!/^[0-9a-f]{1,4}$/i.test(t)) { el.classList.add('bad'); showMsg('Invalid hex value for port ' + p, false); return; }
  el.classList.remove('bad');
  maps[curDisp][p] = parseInt(t, 16);
  changed();
}

function clearDisplay() {
  if (maps[curDisp].every(v => v === 0)) return;
  if (!confirm('Clear all assignments for display ' + curDisp + '?')) return;
  maps[curDisp].fill(0);
  changed();
}

function copyDisplay() {
  clipboard = maps[curDisp].slice();
  $('btn-paste').disabled = false;
  showMsg('Display ' + curDisp + ' copied', true);
}

function pasteDisplay() {
  if (!clipboard) return;
  maps[curDisp] = clipboard.slice();
  changed();
  showMsg('Pasted into display ' + curDisp, true);
}

function changed() {
  setDirty(true);
  renderAll();
}

function renderGrid() {
  const m = maps[curDisp];
  let summary = '';
  for (let p = 0; p < PORTS; p++) {
    for (let s = 0; s < SENSORS; s++)
      $(`c_${p}_${s}`).classList.toggle('on', !!(m[p] & (1 << s)));
    const el = $('hex_' + p);
    if (document.activeElement !== el) { el.value = hex4(m[p]); el.classList.remove('bad'); }
    summary += 'P' + p + '=' + hex4(m[p]) + ' ';
  }
  $('portmap-hex').textContent = summary;
}

// ---------- Overview / preview ----------

function renderOverview() {
  let h = '<tr><th></th>';
  for (let p = 0; p < PORTS; p++) h += '<th>P' + p + '</th>';
  h += '</tr>';
  for (let d = 0; d < DISPS; d++) {
    h += `<tr class="row${d === curDisp ? ' active' : ''}" onclick="selectDisplay(${d})"><td>Disp${d}</td>`;
    for (let p = 0; p < PORTS; p++) {
      const v = maps[d][p];
      h += `<td class="${v ? '' : 'z'}">${hex4(v)}</td>`;
    }
    h += '</tr>';
  }
  $('all-maps').innerHTML = h;
}

function renderAll() {
  renderTabs();
  renderGrid();
  renderOverview();
  $('preview').textContent = serializeConfig();
}

// ---------- Drag & drop, shortcuts ----------

let dragDepth = 0;
window.addEventListener('dragenter', e => { e.preventDefault(); dragDepth++; document.body.classList.add('drag'); });
window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove('drag'); } });
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => {
  e.preventDefault();
  dragDepth = 0;
  document.body.classList.remove('drag');
  const f = e.dataTransfer.files[0];
  if (!f) return;
  if (dirty && !confirm('Discard unsaved changes?')) return;
  f.text().then(t => loadText(t, f.name, null));
});

window.addEventListener('keydown', e => {
  if (!(e.ctrlKey || e.metaKey)) return;
  const k = e.key.toLowerCase();
  if (k === 's') { e.preventDefault(); saveFile(e.shiftKey); }
  else if (k === 'o') { e.preventDefault(); openFile(); }
});

window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
$('opt-savemap').addEventListener('change', () => { setDirty(true); renderAll(); });

buildGrid();
renderAll();
