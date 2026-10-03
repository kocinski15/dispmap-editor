# Assigning Parking Sensors to Displays — User Guide

This guide explains how to choose which parking sensors each guidance display counts, using the
**Display Map Editor**, and how to load the result into the controller.

---

## 1. How it works

Each parking space has a **sensor**. Sensors are connected to the controller on **sensor lines (ports)**.
Each **display** shows the number of free spaces among the sensors assigned to it.

| Item | Range | Notes |
|---|---|---|
| Displays | `0` – `9` | 10 displays |
| Ports (sensor lines) | `0` – `E` | 15 lines |
| Sensors on each port | `0` – `F` | 16 sensors per line |

> **All numbers are hexadecimal.** After `9` comes `A`, `B`, `C`, `D`, `E`, `F`.
> So port `A` is the 11th line and sensor `F` is the 16th sensor on a line.

A sensor can count toward several displays. For example, a sensor on level 1 can count toward the
"Level 1" display and also toward the "Whole car park" display at the entrance.

---

## 2. Before you start

You need:

- **A computer with Microsoft Edge, Google Chrome or a recent Firefox.**
- **The editor**, started in one of two ways:
  - Double-click **`start.bat`** in the editor folder. A small minimized window (the local server) opens,
    and the editor opens in Edge. Keep the small window open while you work; close it when you are done.
  - Or open the editor's web address, if your company publishes it online.
- **To send the settings to the controller:** a USB-to-RS485 adapter wired to the controller's
  configuration RS485 line. The adapter must switch transmit/receive direction automatically.

> Opening `index.html` directly by double-click also works for editing and saving files, but **sending to
> the controller only works when the editor is started with `start.bat`** (or from the web address).

---

## 3. The editor screen

From top to bottom:

1. **Config File**: buttons **Open**, **Save**, **Save As…**, **New**, and the **append saveconf** checkbox.
   The name of the open file is shown at the top right. An **orange dot** next to it means there are unsaved changes.
2. **Select Display**: one button per display (**Display 0** … **Display 9**). The small number on each
   button is how many sensors that display currently counts.
3. **Sensor Assignments**: the grid for the selected display. Rows are **Port 0** … **Port E**,
   columns are sensors **0** … **F**. A **blue cell** means "this sensor counts toward this display".
   The **Hex** column on the right shows each row as a 4-digit hex value.
4. **All Displays Overview**: all 10 displays and 15 ports at a glance as hex values. Click a row to edit that display.
5. **Config Text Preview**: the exact text that will be saved to the file or sent to the controller.
6. **Send to Device (Serial / RS485)**: connection and sending to the controller.

---

## 4. Step by step: assign sensors to a display

### Step 1 — Open the existing configuration

Click **Open** (or press **Ctrl+O**) and choose the configuration file, for example `RS13cfg.txt`.
You can also drag the file from Windows Explorer onto the editor page.

A green message confirms how many assignments were loaded. A red message lists lines the editor could
not understand; those lines are ignored.

To start from nothing, click **New**. All assignments are cleared.

### Step 2 — Select the display

Click the display button, for example **Display 0**. The grid title changes to
**Sensor Assignments — Display 0**.

### Step 3 — Mark the sensors

Use any of these methods:

| To do this | Do this |
|---|---|
| Add or remove one sensor | Click its cell |
| Add or remove several sensors quickly | Press the mouse button on a cell and drag across other cells |
| Add or remove a whole port (all 16 sensors) | Click the **Port** name at the left of the row |
| Add or remove one sensor number on all ports | Click the sensor number (**0** … **F**) in the header |
| Enter a row directly | Type a 4-digit hex value in the **Hex** box and press **Enter** (see section 5) |

The number on the display button updates as you work.

### Step 4 — Repeat for the other displays

Select the next display and mark its sensors. Useful shortcuts:

- **Copy display** / **Paste display**: copies all assignments of the current display to another display.
  Handy for a "total" display: copy the first level, then add the other levels.
- **Clear display**: removes all assignments of the current display (you are asked to confirm).

### Step 5 — Check the overview

Look at **All Displays Overview**. Each cell shows one port's value for one display.
`0000` (shown dimmed) means no sensors from that port are counted. Click any row to jump back and edit it.

### Step 6 — Save the file

Click **Save** (or press **Ctrl+S**).

- In **Edge** and **Chrome** the first save asks for a file name and location. After that, **Save** writes
  to the same file directly.
- In **Firefox** each save downloads a copy of the file to your Downloads folder.

Use **Save As…** to save under a different name, for example to keep a backup copy before changes.

Always keep a saved copy of the final configuration for each site.

---

## 5. Worked example

A car park has two levels and one entrance display:

| Display | Shows free spaces for | Sensors |
|---|---|---|
| Display 0 | Level 1 | Port 0, sensors 0–F (16 spaces) and Port 1, sensors 0–7 (8 spaces) |
| Display 1 | Level 2 | Port 2, sensors 0–F (16 spaces) and Port 3, sensors 0–B (12 spaces) |
| Display 2 | Whole car park (entrance) | Everything from Display 0 and Display 1 |

How to enter it:

1. Click **New**.
2. Select **Display 0**. Click **Port 0** (whole row). On **Port 1**, drag across sensors **0** to **7**.
3. Select **Display 1**. Click **Port 2**. On **Port 3**, drag across sensors **0** to **B**.
4. Select **Display 0** and click **Copy display**. Select **Display 2** and click **Paste display**.
   Then click **Port 2**, and drag across sensors **0** to **B** on **Port 3**.
5. Tick **append saveconf** and click **Save**.

The overview now shows:

```
         P0    P1    P2    P3    P4 ...
Disp0   FFFF  00FF  0000  0000  0000
Disp1   0000  0000  FFFF  0FFF  0000
Disp2   FFFF  00FF  FFFF  0FFF  0000
```

### Reading the hex values

Each port value is the sum of the values of its marked sensors:

| Sensor | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| Value | `0001` | `0002` | `0004` | `0008` | `0010` | `0020` | `0040` | `0080` |

| Sensor | 8 | 9 | A | B | C | D | E | F |
|---|---|---|---|---|---|---|---|---|
| Value | `0100` | `0200` | `0400` | `0800` | `1000` | `2000` | `4000` | `8000` |

Common values:

| Hex | Sensors |
|---|---|
| `0000` | none |
| `000F` | 0–3 |
| `00FF` | 0–7 |
| `0FFF` | 0–B |
| `FFFF` | all (0–F) |
| `0005` | 0 and 2 |

You never have to calculate these yourself. Clicking cells fills in the hex value automatically.

---

## 6. Send the configuration to the controller

1. Connect the USB-RS485 adapter to the computer and to the controller's RS485 configuration line.
2. In the **Send to Device** section, check the settings. Normally leave them as they are:

   | Setting | Default | Meaning |
   |---|---|---|
   | Baud / Parity / Data / Stop | 9600, E, 8, 1 | Line settings of the controller |
   | Line end | CR | Character sent at the end of each command |
   | Char timeout | 10 ms | Longest wait for the controller to echo each character |
   | Line delay | 100 ms | Extra wait after each command for the controller's reply |

3. Click **Connect** and choose the adapter's COM port in the browser window. The status changes to
   **Connected 9600 8E1** in green.
4. Make sure **append saveconf** is ticked if the controller should keep the settings after a power cycle
   (see below).
5. Click **Send config**. The green bar shows progress. Sending takes about half a minute.
   **Stop** interrupts sending.
6. When finished, check the line under the progress bar, for example:

   `Done: 2277/2277 bytes, 151 lines in 31.2s | echo OK 2277, no echo 0`

   - **no echo 0**: every character was confirmed by the controller. The transfer is good.
   - **no echo** greater than 0: some characters were not confirmed. Check the wiring and settings, then send again.

   The black log window shows everything the controller answered.
7. Click **Disconnect** before unplugging the adapter.

### What `saveconf` does

The last command in the file, `saveconf`, tells the controller to store the new settings permanently.
Without it, the controller uses the new assignments only until it is restarted.

- When you open a file that contains `saveconf`, the **append saveconf** box is ticked automatically,
  and `saveconf` stays at the end of the saved file.
- When the opened file has no `saveconf`, the box is unticked. Tick it yourself if you want to add it.

---

## 7. Configuration file format (for reference)

The file is plain text with one command per line. It can be viewed in Notepad.

```
setmapdp 0 0 FFFF
setmapdp 0 1 FF
setmapdp 0 2 0
...
setmapdp 9 E 0
saveconf
```

- `setmapdp <display> <port> <sensors>`: all three numbers are hexadecimal.
- Commands may be written in upper or lower case.
- Lines starting with `#` are comments and are ignored.
- Displays and ports that are not listed have no sensors assigned.

---

## 8. Troubleshooting

| Problem | What to do |
|---|---|
| "Web Serial is not available in this browser" | Use Edge, Chrome or a recent Firefox, and start the editor with `start.bat`, not by opening `index.html` directly. |
| The adapter is not listed after clicking **Connect** | Check the USB cable and that the adapter's driver is installed (it should appear under *Ports (COM & LPT)* in Device Manager). Close other programs that may be using the port. |
| "no echo" is high, or the log shows garbage | Check A/B wiring of the RS485 line and the line settings (9600, E, 8, 1). Check that the adapter switches direction automatically. |
| Red message "unrecognized …" when opening a file | The file contains lines in an old or unknown format. Those lines are skipped; check the assignments and save again to write a clean file. |
| "display/port out of range" | A line refers to a port above `E` or a display above `9`. Numbers in the file are hex: port `10` means 16, not 10. |
| Changes are lost after the controller restarts | Send again with **append saveconf** ticked. |
| The editor window warns about leaving the page | You have unsaved changes. Click **Save** first. |
