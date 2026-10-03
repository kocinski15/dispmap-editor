// Send the config text to the device over a serial port (Web Serial API).
// RS485 simplex with echo: after each character, stay silent until that
// character is echoed back or the char timeout expires, whichever is first.
// After each line ending, wait an extra line delay for the device's reply.

let port = null, reader = null, readLoopDone = null;
let echoWait = null;        // {byte, resolve} while waiting for an echo
let sending = false, abortSend = false;
let lastRxCR = false;
const TERM_MAX = 50000;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function termAppend(text, cls) {
  const t = $('term');
  if (cls) {
    const s = document.createElement('span');
    s.className = cls;
    s.textContent = text;
    t.appendChild(s);
  } else {
    // merge plain text into the last text node to keep the DOM small
    const last = t.lastChild;
    if (last && last.nodeType === Node.TEXT_NODE) last.nodeValue += text;
    else t.appendChild(document.createTextNode(text));
  }
  while (t.textContent.length > TERM_MAX && t.firstChild) t.removeChild(t.firstChild);
  t.scrollTop = t.scrollHeight;
}

function clearTerm() { $('term').textContent = ''; }

function setSerialUi() {
  const c = !!port;
  $('btn-connect').disabled = c;
  $('btn-disconnect').disabled = !c || sending;
  $('btn-send').disabled = !c || sending;
  $('btn-abort').disabled = !sending;
  for (const id of ['ser-baud', 'ser-parity', 'ser-data', 'ser-stop']) $(id).disabled = c;
  const st = $('port-status');
  st.className = 'port-status' + (c ? ' on' : '');
  if (c) {
    const i = port.getInfo();
    const id = i.usbVendorId ? ` (USB ${i.usbVendorId.toString(16).padStart(4, '0')}:${i.usbProductId.toString(16).padStart(4, '0')})` : '';
    st.textContent = `Connected ${$('ser-baud').value} ${$('ser-data').value}${$('ser-parity').value[0].toUpperCase()}${$('ser-stop').value}` + id;
  } else {
    st.textContent = 'Not connected';
  }
}

async function serialConnect() {
  if (!('serial' in navigator)) {
    showMsg('Web Serial is not available in this browser. Use a recent Chrome, Edge or Firefox, opened from http://localhost or https.', false);
    $('msg').scrollIntoView({behavior: 'smooth'});
    return;
  }
  try {
    const p = await navigator.serial.requestPort();
    await p.open({
      baudRate: parseInt($('ser-baud').value, 10) || 9600,
      dataBits: parseInt($('ser-data').value, 10),
      stopBits: parseInt($('ser-stop').value, 10),
      parity: $('ser-parity').value,
      flowControl: 'none'
    });
    port = p;
    readLoopDone = readLoop();
    termAppend('[connected]\n', 'info');
  } catch (e) {
    if (e.name !== 'NotFoundError') termAppend('[connect failed: ' + e.message + ']\n', 'err');
  }
  setSerialUi();
}

async function readLoop() {
  while (port && port.readable) {
    reader = port.readable.getReader();
    try {
      for (;;) {
        const {value, done} = await reader.read();
        if (done) break;
        for (const b of value) onRxByte(b);
      }
    } catch (e) {
      // framing/parity errors are recoverable: loop re-acquires the reader
      if (port) termAppend('[rx error: ' + e.message + ']\n', 'err');
    } finally {
      reader.releaseLock();
      reader = null;
    }
    if (!port) break;
  }
}

function onRxByte(b) {
  if (echoWait && b === echoWait.byte) {
    const w = echoWait;
    echoWait = null;
    w.resolve(true);
  }
  // display: CR, LF and CRLF all become one newline
  if (b === 0x0D) { termAppend('\n'); lastRxCR = true; return; }
  if (b === 0x0A) { if (!lastRxCR) termAppend('\n'); lastRxCR = false; return; }
  lastRxCR = false;
  termAppend(b >= 0x20 && b < 0x7F ? String.fromCharCode(b) : `<${b.toString(16).toUpperCase().padStart(2, '0')}>`);
}

// Resolves true when `byte` is echoed, false after `ms` without it.
function waitEcho(byte, ms) {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      if (echoWait && echoWait.resolve === done) echoWait = null;
      resolve(false);
    }, ms);
    const done = ok => { clearTimeout(timer); resolve(ok); };
    echoWait = {byte, resolve: done};
  });
}

async function serialDisconnect() {
  const p = port;
  if (!p) return;
  abortSend = true;
  port = null;
  try { if (reader) await reader.cancel(); } catch (e) {}
  try { await readLoopDone; } catch (e) {}
  try { await p.close(); } catch (e) {}
  termAppend('\n[disconnected]\n', 'info');
  setSerialUi();
}

function serialAbort() { abortSend = true; }

async function serialSend() {
  if (!port || sending) return;
  const eol = $('ser-eol').value.replace('\\r', '\r').replace('\\n', '\n');
  const charMs = Math.max(0, parseInt($('ser-char-ms').value, 10) || 0);
  const lineMs = Math.max(0, parseInt($('ser-line-ms').value, 10) || 0);
  const text = serializeConfig().replace(/\n/g, eol);
  const bytes = new TextEncoder().encode(text);
  const eolLast = eol.charCodeAt(eol.length - 1);

  sending = true;
  abortSend = false;
  setSerialUi();
  let echoed = 0, missed = 0, lines = 0;
  const t0 = performance.now();
  const writer = port.writable.getWriter();
  termAppend(`\n[sending ${bytes.length} bytes]\n`, 'info');
  try {
    for (let i = 0; i < bytes.length; i++) {
      if (abortSend) break;
      const b = bytes[i];
      const echo = waitEcho(b, charMs);     // arm before writing so a fast echo is not missed
      await writer.write(new Uint8Array([b]));
      if (await echo) echoed++; else missed++;
      if (b === eolLast) { lines++; await sleep(lineMs); }
      if ((i & 7) === 0 || i === bytes.length - 1) {
        $('send-bar').style.width = ((i + 1) * 100 / bytes.length).toFixed(1) + '%';
        $('send-stats').textContent = `Sent ${i + 1}/${bytes.length} bytes, ${lines} lines | echo OK ${echoed}, no echo ${missed}`;
      }
    }
  } catch (e) {
    termAppend('\n[send error: ' + e.message + ']\n', 'err');
  } finally {
    echoWait = null;
    writer.releaseLock();
    sending = false;
  }
  const secs = ((performance.now() - t0) / 1000).toFixed(1);
  const summary = `${abortSend ? 'Stopped' : 'Done'}: ${echoed + missed}/${bytes.length} bytes, ${lines} lines in ${secs}s | echo OK ${echoed}, no echo ${missed}`;
  $('send-stats').textContent = summary;
  termAppend('\n[' + summary + ']\n', missed || abortSend ? 'err' : 'info');
  setSerialUi();
}

if ('serial' in navigator) {
  navigator.serial.addEventListener('disconnect', e => { if (e.target === port) serialDisconnect(); });
}
setSerialUi();
