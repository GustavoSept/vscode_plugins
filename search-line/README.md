# Find Character Extension for VSCode

A lightweight VSCode extension that brings Vim-style `f` and `F` motions to your editor!

Quickly jump to the next occurrence of a character on the current line, or expand the selection up to that character.  
Fully compatible with multiple cursors — each cursor moves or selects independently.

---

## Features

-   **Find Character** (`Ctrl+S F`):  
    Move the cursor just **after** the next occurrence of the typed character on the same line.
-   **Find Character and Select** (`Ctrl+S Shift+F`):  
    Expand the **selection** from the cursor to just **after** the found character.

-   Supports **multi-cursor** editing:  
    If a character isn't found for a given cursor, it stays where it is.

-   Simple, fast, and minimal.

---

## Usage

1. **Place the cursor(s)** anywhere in your code.
2. Press `Ctrl+S F` to **move** to the next character.  
   Or press `Ctrl+S Shift+F` to **select** up to the next character.
3. **Type the character** you want to find.
4. Watch your cursor(s) jump or expand the selection!

---

## Commands

| Command                            | Description                               | Default Keybinding |
| ---------------------------------- | ----------------------------------------- | ------------------ |
| `extension.findCharacter`          | Find and move to the next occurrence      | `Ctrl+S F`         |
| `extension.findCharacterAndSelect` | Find and select up to the next occurrence | `Ctrl+S Shift+F`   |

---

## License

[MIT License](LICENSE)
