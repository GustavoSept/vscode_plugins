# Copy File With Context

A lightweight Visual Studio Code extension that lets you quickly copy the contents of files **with contextual metadata** — specifically, relative paths and formatted code blocks. Perfect for pasting code into markdown files, documentation, GitHub issues, or chat with LLMs.

---

## ✨ Features

### 1. Copy File With Context
- **Shortcut**: `Ctrl+S Ctrl+Shift+C`
- Copies the content of the current file (or selection) to the clipboard in this format:

  ```
  relative/path/to/file.ext
  ```<language>
  file contents
  ```
  ```

- Automatically detects the appropriate language tag for syntax highlighting
- If you select text, only the selection is copied (with `[...]` markers if partial)

### 2. Copy File With Context (Respect Folds)
- **Shortcut**: `Ctrl+S Ctrl+Shift+F`
- Works like the original, but **respects collapsed/folded regions**
- For collapsed functions/methods, only the signature line is included, with a `// [...collapsed...]` marker
- Perfect for sharing code structure without implementation details

**Example output with collapsed functions:**
```typescript
src/extension.ts
```typescript
function activate(context: vscode.ExtensionContext) {
    // [...collapsed...]

function deactivate() {
    // [...collapsed...]
```
```

### 3. Copy File/Folder With Context
- **Shortcut**: `Ctrl+S Ctrl+Shift+A` (when Explorer is focused)
- **Right-click menu**: "Copy File/Folder With Context" in Explorer context menu
- Works with **files, folders, or multi-selection**:
  - **Single file**: Copies that file with context
  - **Single folder**: Recursively copies ALL files within it (including subfolders)
  - **Multi-selection**: Supports Ctrl+Click or Shift+Click to select multiple files/folders

**Automatically skipped directories**: `node_modules`, `.git`, `dist`, `out`, `.vscode`, `__pycache__`, `.next`, `build`, `coverage`

**Example output with a folder:**
```
src/utils/helper.ts
```typescript
export function helper() { ... }
```

src/utils/format.ts
```typescript
export function format() { ... }
```

src/main.ts
```typescript
import { helper } from './utils/helper';
```
```

---

## 🔧 Usage

### Copy Current File
1. Open any file in your workspace
2. Press `Ctrl+S Ctrl+Shift+C`
3. Paste the copied content wherever you need

### Copy With Collapsed Regions
1. Open a file and collapse functions/classes you want to hide
2. Press `Ctrl+S Ctrl+Shift+F`
3. Only signatures of collapsed regions are copied

### Copy Files/Folders from Explorer
1. In the Explorer sidebar, click a file or folder (or Ctrl+Click / Shift+Click for multiple)
2. Press `Ctrl+S Ctrl+Shift+A` or right-click → "Copy File/Folder With Context"
3. All files are copied with their paths and content (folders are processed recursively)

---

## 🧠 Why?

This extension helps you:
- Share code with clear file context
- Paste formatted snippets in markdown/chat
- Document or debug code faster
- Share code structure without exposing implementation details (fold mode)
- Quickly share entire folders or multiple files at once

---

## ⌨️ Keyboard Shortcuts

| Command | Shortcut | Context |
|---------|----------|---------|
| Copy File With Context | `Ctrl+S Ctrl+Shift+C` | Editor focused |
| Copy File (Respect Folds) | `Ctrl+S Ctrl+Shift+F` | Editor focused |
| Copy File/Folder With Context | `Ctrl+S Ctrl+Shift+A` | Explorer focused |

---

## 🚀 Extension Settings

No settings required — just install and use.

---

## 📝 Notes

- **Folding Detection**: The "Respect Folds" feature uses VS Code's visible ranges to detect which regions are currently collapsed. For best results, ensure the file is visible and scrolled to show the regions you care about.
- **Recursive Folder Processing**: When selecting a folder, all files within it (and its subfolders) are included. Common non-essential directories like `node_modules` and `.git` are automatically skipped.
- **Multi-selection**: You can select multiple files and/or folders at once. Overlapping selections (e.g., a folder and a file inside it) are handled gracefully with deduplication.
- **Workspace Requirement**: All features require files to be inside a VS Code workspace.

---

## 📄 License

MIT