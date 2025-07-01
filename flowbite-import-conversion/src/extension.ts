import * as vscode from 'vscode';
import { convertFlowbiteImports } from './flowbiteImportConverter';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    'svelte.flowbiteImportConversion',
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const document = editor.document;
      const selection = editor.selection;
      let range: vscode.Range;
      let text: string;

      if (!selection.isEmpty) {
        range = new vscode.Range(
          document.lineAt(selection.start.line).range.start,
          document.lineAt(selection.end.line).range.end
        );
        text = document.getText(range);
      } else {
        range = new vscode.Range(
          new vscode.Position(0, 0),
          new vscode.Position(
            document.lineCount - 1,
            document.lineAt(document.lineCount - 1).text.length
          )
        );
        text = document.getText();
      }

      const newText = convertFlowbiteImports(text);
      editor.edit((editBuilder) => {
        editBuilder.replace(range, newText);
      });
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}