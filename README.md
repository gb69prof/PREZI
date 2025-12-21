# ZOOMDECK (MVP Prezi-like)

Stack: React + TypeScript + Vite + Konva (client-side only, GitHub Pages friendly).

## Avvio locale
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Deploy automatico su GitHub Pages (GitHub Actions)
Il repo include `.github/workflows/deploy.yml`.

1. Su GitHub vai in **Settings → Pages**
2. In **Source** scegli **GitHub Actions**
3. Fai push su `main` → l'azione builda e pubblica su Pages.

> Nota: `vite.config.ts` usa `base: "./"` per evitare 404 sugli asset su Pages.

## Shortcuts
- Wheel: zoom
- Drag vuoto: pan
- Shift+click: multiselezione
- Delete/Backspace: cancella oggetti selezionati
- Ctrl/Cmd+Z: undo, Ctrl/Cmd+Shift+Z: redo
- Ctrl/Cmd+D: duplica
- Presentazione: tasti freccia / spazio / click; ESC per uscire
