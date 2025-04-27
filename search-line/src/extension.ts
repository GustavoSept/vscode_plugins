import * as vscode from 'vscode';

async function findCharacter(expandSelection: boolean) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor found.');
        return;
    }

    const document = editor.document;
    const cursors = editor.selections;

    // Prompt user to enter a character
    const char = await vscode.window.showInputBox({
        prompt: 'Enter character to find',
        validateInput: (text) => (text.length === 1 ? null : 'Enter exactly one character'),
    });

    if (!char) {
        return; // User cancelled input
    }

    const newSelections: vscode.Selection[] = [];

    editor
        .edit((editBuilder) => {
            // No text modifications needed, but required for edit context
        })
        .then(() => {
            for (const selection of cursors) {
                const position = selection.active;
                const lineText = document.lineAt(position.line).text;

                const searchFrom = position.character + 1; // start AFTER current cursor
                const index = lineText.indexOf(char, searchFrom);

                if (index !== -1) {
                    const newPosition = new vscode.Position(position.line, index + 1); // after the character
                    if (expandSelection) {
                        newSelections.push(new vscode.Selection(selection.anchor, newPosition));
                    } else {
                        newSelections.push(new vscode.Selection(newPosition, newPosition));
                    }
                } else {
                    // No match found: keep cursor where it is
                    newSelections.push(selection);
                }
            }

            editor.selections = newSelections;
            editor.revealRange(newSelections[0]);
        });
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.findCharacter', () => findCharacter(false)),
        vscode.commands.registerCommand('extension.findCharacterAndSelect', () =>
            findCharacter(true)
        )
    );
}

export function deactivate() {}
