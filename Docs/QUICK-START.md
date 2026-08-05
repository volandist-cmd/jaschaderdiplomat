# Quick Start Guide

## 🚀 Get the App Running in 5 Minutes

### Prerequisites
- Node.js 18+ installed
- Terminal/command line access
- Code editor (VS Code recommended)

---

## Step 1: Install Dependencies

```bash
cd /Users/fnoda/Desktop/prufungstratiner
npm install
```

Expected output:
```
added 150 packages in 15s
```

---

## Step 2: Start Development Server

```bash
npm run dev
```

Expected output:
```
VITE v5.1.6  ready in 450 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## Step 3: Open in Browser

Navigate to: `http://localhost:5173`

**You should see:**
- ✅ Navigation sidebar with German flag colors
- ✅ "Prüfungstrainer" logo
- ✅ "Lädt..." (loading) message in main area
- ⚠️ **Expected:** No content yet - this is correct! Views are created in Week 5.

---

## Step 4: Verify TypeScript Compilation

```bash
npm run build
```

Expected output:
```
vite v5.1.6 building for production...
✓ 42 modules transformed.
dist/index.html                   0.45 kB
dist/assets/index-abc123.css      12.34 kB
dist/assets/index-xyz789.js      120.56 kB
✓ built in 2.45s
```

If successful, Phase 1 is complete! ✅

---

## Step 5: Inspect with Vue Devtools

1. Install Vue Devtools browser extension
2. Open devtools (F12)
3. Click "Vue" tab
4. You should see:
   - ✅ App component
   - ✅ Pinia store ("app")
   - ✅ State with `attempts`, `errorLog`, etc.

---

## 🎯 What Works Right Now

### ✅ Working:
- TypeScript compilation
- Vue 3 app initialization
- Pinia state management
- Router (basic navigation structure)
- Storage service (LocalStorage wrapper)
- Timer service (countdown logic)
- Utility functions (format, DOM, random)
- CSS styles and variables

### ⚠️ Not Yet Implemented (Expected):
- Quiz data loading (Week 2)
- DGP generators (Week 3)
- Quiz engine (Week 4)
- View components (Week 5)
- Navigation rendering (Week 6)

---

## 🔍 Explore the Code

### **Key Files to Review:**

1. **Domain Models**
   - `src/domain/models/types.ts` - All TypeScript interfaces
   - `src/domain/models/constants.ts` - Configuration

2. **Infrastructure**
   - `src/infrastructure/storage/storage-service.ts` - Data persistence
   - `src/infrastructure/utils/format.ts` - Formatting helpers

3. **State Management**
   - `src/domain/stores/app-store.ts` - Global Pinia store

4. **Entry Points**
   - `src/main.ts` - App initialization
   - `src/App.vue` - Root component

---

## 🐛 Common Issues & Solutions

### Issue: `npm install` fails

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Port 5173 already in use

**Solution:**
```bash
# Kill existing process
lsof -ti:5173 | xargs kill -9

# Or use different port
npm run dev -- --port 3000
```

### Issue: TypeScript errors

**Solution:**
```bash
# Clear cache and rebuild
rm -rf dist node_modules/.vite
npm run build
```

### Issue: Vue devtools not showing store

**Solution:**
- Ensure Vue Devtools extension is installed
- Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+F5)
- Check console for errors

---

## 📁 Project Structure Overview

```
prufungstratiner/
├── src/
│   ├── domain/          # Business logic & types
│   ├── infrastructure/  # Core services & utilities
│   ├── styles/          # Global CSS
│   ├── App.vue         # Root component
│   └── main.ts         # Entry point
│
├── public/             # Static assets (empty for now)
├── dist/               # Build output (gitignored)
│
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript config
├── vite.config.ts      # Build config
│
└── docs/
    ├── README.md              # Architecture overview
    ├── ROADMAP.md             # Weeks 2-6 plan
    ├── MIGRATION-GUIDE.md     # Detailed migration steps
    └── PHASE-1-SUMMARY.md     # This phase completion report
```

---

## 🎓 Next Steps

### **Immediate (Week 2):**
1. Extract quiz data from monolith to JSON
2. Create data loader utility
3. Test data loading in dev mode

**See:** [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md) → Phase 2

### **Development Workflow:**
```bash
# Terminal 1: Dev server (watches for changes)
npm run dev

# Terminal 2: Type checking (continuous)
npm run build -- --watch

# Terminal 3: Your editor
code .
```

---

## 📚 Learning Resources

- **Vue 3 Docs:** https://vuejs.org/
- **Pinia Docs:** https://pinia.vuejs.org/
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/
- **Vite Guide:** https://vitejs.dev/guide/

---

## 🆘 Need Help?

1. **Check logs:** Browser console (F12) and terminal output
2. **Review docs:** README.md, ROADMAP.md, MIGRATION-GUIDE.md
3. **Reference monolith:** Original `jaschaderdiplomat.html` is preserved
4. **TypeScript errors:** Most issues caught at compile time

---

## ✅ Success Checklist

- [ ] `npm install` completed without errors
- [ ] `npm run dev` launches server
- [ ] Browser shows app at `http://localhost:5173`
- [ ] No console errors on load
- [ ] Vue devtools detects Pinia store
- [ ] `npm run build` succeeds
- [ ] TypeScript compilation clean

If all checked, you're ready to proceed to Week 2! 🎉

---

**Phase 1 Foundation:** ✅ Complete  
**Next Phase:** Week 2 - Data Layer Extraction  
**Estimated Time:** 10-15 hours  
**Files to Create:** 15-20 JSON files
