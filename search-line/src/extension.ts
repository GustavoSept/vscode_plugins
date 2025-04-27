import * as vscode from 'vscode';

export async function findChar(
    expandSelection: boolean,
    backwards: boolean,
    injectedInput?: string
) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor found.');
        return;
    }

    const document = editor.document;
    const cursors = editor.selections;

    // Prompt user to enter a regex
    const input =
        injectedInput ??
        (await vscode.window.showInputBox({
            prompt: 'Enter regex to find',
            validateInput: (text) => (text.length > 0 ? null : 'Input cannot be empty'),
        }));

    if (!input) {
        return; // User cancelled input
    }

    let regex: RegExp;
    try {
        regex = new RegExp(input, 'g');
    } catch (e) {
        vscode.window.showErrorMessage('Invalid regular expression.');
        return;
    }

    const newSelections: vscode.Selection[] = [];

    for (const selection of cursors) {
        const position = selection.active;
        const startOffset = document.offsetAt(position);
        const fullText = document.getText();

        if (backwards) {
            // Search backwards
            const textBeforeCursor = fullText.substring(0, startOffset);
            let match: RegExpExecArray | null = null;
            let lastMatch: RegExpExecArray | null = null;

            regex.lastIndex = 0; // Always reset
            while ((match = regex.exec(textBeforeCursor)) !== null) {
                lastMatch = match;
            }

            if (lastMatch) {
                const matchStart = lastMatch.index;
                const newPos = document.positionAt(matchStart); // CURSOR at the START of the match
                if (expandSelection) {
                    newSelections.push(new vscode.Selection(selection.anchor, newPos));
                } else {
                    newSelections.push(new vscode.Selection(newPos, newPos));
                }
            } else {
                // No match: keep original selection
                newSelections.push(selection);
            }
        } else {
            // Search forwards
            const textAfterCursor = fullText.substring(startOffset);
            regex.lastIndex = 0;
            const match = regex.exec(textAfterCursor);

            if (match) {
                const matchStart = startOffset + match.index;
                const matchEnd = matchStart + match[0].length;
                const newPos = document.positionAt(matchEnd); // CURSOR at the END of the match
                if (expandSelection) {
                    newSelections.push(new vscode.Selection(selection.anchor, newPos));
                } else {
                    newSelections.push(new vscode.Selection(newPos, newPos));
                }
            } else {
                // No match: keep original selection
                newSelections.push(selection);
            }
        }
    }

    const uniqueSelections = deduplicateSelections(newSelections);

    if (uniqueSelections.length > 0) {
        editor.selections = uniqueSelections;
        editor.revealRange(uniqueSelections[0]);
    } else {
        vscode.window.showWarningMessage('No matches found.');
    }
}

function deduplicateSelections(selections: vscode.Selection[]): vscode.Selection[] {
    const map = new Map<string, vscode.Selection>();

    for (const sel of selections) {
        const key = `${sel.start.line}:${sel.start.character}-${sel.end.line}:${sel.end.character}`;

        // If same key already exists, choose the longer selection
        if (map.has(key)) {
            const existing = map.get(key)!;
            if (selectionLength(sel) > selectionLength(existing)) {
                map.set(key, sel);
            }
        } else {
            map.set(key, sel);
        }
    }

    return Array.from(map.values());
}

function selectionLength(sel: vscode.Selection): number {
    const startOffset = sel.start.line * 10000 + sel.start.character;
    const endOffset = sel.end.line * 10000 + sel.end.character;
    return Math.abs(endOffset - startOffset);
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.findChar', () => findChar(false, false)),
        vscode.commands.registerCommand('extension.findCharAndSelect', () => findChar(true, false)),
        vscode.commands.registerCommand('extension.findCharBackward', () => findChar(false, true)),
        vscode.commands.registerCommand('extension.findCharAndSelectBackward', () =>
            findChar(true, true)
        )
    );
}

export function deactivate() {}
