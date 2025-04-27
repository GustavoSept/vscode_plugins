# Search Line - Find by Regex Extension for VSCode

A lightweight VSCode extension that lets you **jump** or **select** up to text matching a **regex**!  
Inspired by Vim's `f`/`F` motions — but much more flexible with full regex support.

Fully compatible with **multi-cursor** editing — each cursor moves or selects independently.

---

## Features

-   **Find Forward** (`extension.findChar`):  
    Move the cursor **after** the next match of the typed regex.
-   **Find Forward and Select** (`extension.findCharAndSelect`):  
    Expand the **selection** from the cursor **to after** the next match.
-   **Find Backward** (`extension.findCharBackward`):  
    Move the cursor **before** the previous match of the typed regex.
-   **Find Backward and Select** (`extension.findCharAndSelectBackward`):  
    Expand the **selection** from the cursor **to before** the previous match.

-   **Multi-cursor support**:  
    All cursors operate independently. If no match is found for a cursor, it stays where it is.

-   **Regex-based** search:  
    Enter **any regular expression** to match complex patterns, not just single characters.

-   Fast, simple, and minimal.

---

## Usage

1. **Place the cursor(s)** anywhere in your document.
2. Trigger one of the commands (see below).
3. **Type a regex** to search for.
4. Watch your cursor(s) jump or select based on the match!

Examples:

-   Find the next occurrence of `foo` exactly? Type `foo`.
-   Find any digit? Use `\d`.
-   Find whitespace? Use `\s`.

---

## Commands

| Command                               | Description                                                |
| ------------------------------------- | ---------------------------------------------------------- |
| `extension.findChar`                  | Move cursor after next regex match (forward)               |
| `extension.findCharAndSelect`         | Expand selection to after next regex match (forward)       |
| `extension.findCharBackward`          | Move cursor before previous regex match (backward)         |
| `extension.findCharAndSelectBackward` | Expand selection to before previous regex match (backward) |

You can assign your own keybindings for these commands through **Preferences → Keyboard Shortcuts**.

Example suggested bindings:

```json
{
    "key": "ctrl+s f",
    "command": "extension.findChar"
},
{
    "key": "ctrl+s shift+f",
    "command": "extension.findCharAndSelect"
},
{
    "key": "ctrl+s alt+f",
    "command": "extension.findCharBackward"
},
{
    "key": "ctrl+s shift+alt+f",
    "command": "extension.findCharAndSelectBackward"
}
```

---

## License

[MIT License](LICENSE)
