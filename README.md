# Display Map Editor (standalone)

Offline editor for the Vipark RS13 display→sensor map config file, extracted from
`src/web/dispmap.html` of [stmhub](https://github.com/kocinski15/stmhub). No device or server needed.

## Use

Open `index.html` in a browser (double-click works). No build, no dependencies.

- **Open** (Ctrl+O) or drag & drop a config file (e.g. `RS13cfg.txt`).
- Pick a display, then click / drag over cells to assign sensors (0–F) per port (0–E).
  Click a port header to toggle the row, a sensor header to toggle the column, or type hex directly.
- **Save** (Ctrl+S) / **Save As** (Ctrl+Shift+S). In Chrome/Edge the file is written in place;
  other browsers download it.
- Copy/paste a whole display, clear a display, see all 10 displays in the overview.

## Send to device over serial (RS485)

The **Send to Device** card writes the config text straight to the device through a serial port
(Web Serial API: recent Chrome, Edge or Firefox; page served from `http://localhost` or `https`; it won't work from `file://`).

- Default line settings are 9600 8E1; the line ending (CR, LF or CR LF) is selectable, default CR.
- RS485 simplex with echo: after each character the sender stays silent until that character's echo arrives
  or the **char timeout** (10 ms) runs out, whichever comes first.
- After each line ending it waits an extra **line delay** (100 ms) so the device can reply to the command.
- The log shows everything received (echoes and replies). The stats line counts echoed characters and
  characters with no echo.

On Windows, double-click **`start.bat`**: it starts the server in a minimized window (close it to stop)
and opens the editor in Edge. If the server is already running it just opens Edge.

Or run a local server from this folder yourself, then open http://localhost:8765:

```
python -m http.server 8765
```

## File format

One command per line, as accepted by the device CLI (commands are case-insensitive when reading):

```
setmapdp <disp_hex 0-9> <port_hex 0-E> <mask_hex>
...
saveconf
```

`saveconf` is written at the end when the **append saveconf** box is checked. Opening a file sets that box
to match: checked if the file contained `saveconf`, unchecked if not.

Bit *n* of the mask = sensor *n* on that port. `#` lines are comments. Displays/ports not listed are 0.

Sizes are set at the top of `app.js` (`PORTS`, `SENSORS`, `DISPS`).
