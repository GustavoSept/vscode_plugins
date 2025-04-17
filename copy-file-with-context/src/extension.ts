// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

const extensionToLanguageId: Record<string, string> = {
	// Web & frontend
	'js': 'javascript',
	'jsx': 'javascript',
	'ts': 'typescript',
	'tsx': 'typescript',
	'html': 'html',
	'htm': 'html',
	'css': 'css',
	'scss': 'scss',
	'sass': 'sass',
	'less': 'less',
  
	// Backend
	'py': 'python',
	'rb': 'ruby',
	'php': 'php',
	'java': 'java',
	'kt': 'kotlin',
	'cs': 'csharp',
	'go': 'go',
	'rs': 'rust',
	'cpp': 'cpp',
	'cc': 'cpp',
	'cxx': 'cpp',
	'c': 'c',
	'h': 'c',
	'm': 'objective-c',
	'swift': 'swift',
	'sh': 'bash',
	'bash': 'bash',
	'zsh': 'bash',
	'ps1': 'powershell',
	'sql': 'sql',
  
	// Configs and data formats
	'json': 'json',
	'jsonc': 'json',
	'yaml': 'yaml',
	'yml': 'yaml',
	'toml': 'toml',
	'ini': 'ini',
	'env': 'dotenv',
  
	// Markup / Text
	'md': 'markdown',
	'markdown': 'markdown',
	'txt': 'plaintext',
	'rst': 'restructuredtext',
	'asciidoc': 'asciidoc',
  
	// Shell / scripting
	'make': 'makefile',
	'mk': 'makefile',
	'Dockerfile': 'dockerfile',
	'dockerfile': 'dockerfile',
	'bat': 'batchfile',
	'fish': 'fish',
  
	// DevOps & Infrastructure
	'tf': 'hcl',
	'tfvars': 'hcl',
	'hcl': 'hcl',
	'cue': 'cue',
	'rego': 'rego',
  
	// Misc
	'xml': 'xml',
	'svg': 'xml',
	'vue': 'vue',
	'svelte': 'svelte',
	'graphql': 'graphql',
	'gql': 'graphql',
	'log': 'log',
	'cfg': 'ini',
	'conf': 'ini',
  
	// Others (scripts / build tools)
	'gradle': 'groovy',
	'groovy': 'groovy',
	'pl': 'perl',
	'pm': 'perl',
	'lua': 'lua',
	'nim': 'nim',
	'elm': 'elm',
	'r': 'r',
	'jl': 'julia',
	'erl': 'erlang',
	'ex': 'elixir',
	'exs': 'elixir',
	'ml': 'ocaml',
	'fs': 'fsharp',
	'vb': 'vbnet',
	'vbs': 'vbscript'
  };
  

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('extension.copyFileWithContext', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor found.');
      return;
    }

    const document = editor.document;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!workspaceFolder) {
      vscode.window.showWarningMessage('File is not inside a workspace.');
      return;
    }

    const relativePath = path.relative(workspaceFolder.uri.fsPath, document.uri.fsPath);
    const fileContent = document.getText();
	const fileExt = path.extname(document.fileName).replace('.', '').toLowerCase();
	const languageId = extensionToLanguageId[fileExt] || document.languageId || 'plaintext';


    const formatted = `{${relativePath}}\n\`\`\`${languageId}\n${fileContent}\n\`\`\``;

    await vscode.env.clipboard.writeText(formatted);
    vscode.window.showInformationMessage('Copied file with context!');
  });

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
