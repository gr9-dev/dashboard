# CloudCall Dashboard - Windows Restart Guide

Quick reference for restarting the development server after a Windows reboot.

## Quick Start (TL;DR)

```powershell
cd C:\Cursor-Projects\Dashboard
npm run dev
```

Then open: `http://localhost:3001` in your browser

---

## Step-by-Step Instructions

### Method 1: PowerShell (Recommended)

1. **Open PowerShell**:
   - Press `Win + X` → Select "Windows PowerShell" or "Terminal"
   - Or press `Win + R` → Type `powershell` → Press Enter

2. **Navigate to project**:
   ```powershell
   cd C:\Cursor-Projects\Dashboard
   ```

3. **Start the development server**:
   ```powershell
   npm run dev
   ```

### Method 2: Command Prompt

1. **Open Command Prompt**:
   - Press `Win + R` → Type `cmd` → Press Enter

2. **Navigate and start**:
   ```cmd
   cd C:\Cursor-Projects\Dashboard
   npm run dev
   ```

### Method 3: File Explorer + Right-Click

1. **Navigate to**: `C:\Cursor-Projects\Dashboard` in File Explorer
2. **Right-click** in empty space → "Open in Terminal" (Win 11) or "Open PowerShell window here" (Win 10)
3. **Run**: `npm run dev`

---

## Expected Output

When successful, you'll see:
```
> dashboard@1.0.0 dev
> vite

  VITE v4.5.14  ready in 1075 ms
  ➜  Local:   http://localhost:3001/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

## Access the Dashboard

1. **Open browser** (Chrome, Firefox, Edge)
2. **Go to**: `http://localhost:3001` (or the port shown in terminal)
3. **Login**: Use CloudCall credentials
4. **Default view**: Legacy View loads automatically

---

## Troubleshooting

### "Command not found" errors
```powershell
# Check Node.js installation
node --version
npm --version

# If missing, download from: https://nodejs.org/
```

### Permission errors
- Try running PowerShell as Administrator
- Right-click PowerShell → "Run as Administrator"

### Port already in use
- Vite automatically finds next available port
- Or specify custom port: `npm run dev -- --port 4000`

### Missing dependencies
```powershell
# Reinstall if needed
npm install
```

---

## Demo Tips

✅ **Keep terminal open** during demo  
✅ **Bookmark** `http://localhost:3001` for quick access  
✅ **Multiple tabs** work fine  
✅ **Press F12** to see debug console if needed  
✅ **Use refresh buttons** in dashboard for fresh data  

## Stop the Server

- Press `Ctrl + C` in terminal
- Or close the terminal window

---

## Quick Reference Card

| Action | Command |
|--------|---------|
| Navigate | `cd C:\Cursor-Projects\Dashboard` |
| Start Server | `npm run dev` |
| Stop Server | `Ctrl + C` |
| Check Node | `node --version` |
| Reinstall | `npm install` |
| Custom Port | `npm run dev -- --port 4000` |

**Default URL**: http://localhost:3001  
**Login**: Use CloudCall credentials  
**Default Tab**: Legacy View (3-column layout)

---

*Keep this file handy for quick server restarts!* 