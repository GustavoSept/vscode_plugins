// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import * as path from 'path';

const extensionToLanguageId: Record<string, string> = {
    // Web & frontend
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',

    // Backend
    py: 'python',
    rb: 'ruby',
    php: 'php',
    java: 'java',
    kt: 'kotlin',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    cpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    c: 'c',
    h: 'c',
    m: 'objective-c',
    swift: 'swift',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    ps1: 'powershell',
    sql: 'sql',

    // Configs and data formats
    json: 'json',
    jsonc: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    ini: 'ini',
    env: 'dotenv',

    // Markup / Text
    md: 'markdown',
    markdown: 'markdown',
    txt: 'plaintext',
    rst: 'restructuredtext',
    asciidoc: 'asciidoc',

    // Shell / scripting
    make: 'makefile',
    mk: 'makefile',
    Dockerfile: 'dockerfile',
    dockerfile: 'dockerfile',
    bat: 'batchfile',
    fish: 'fish',

    // DevOps & Infrastructure
    tf: 'hcl',
    tfvars: 'hcl',
    hcl: 'hcl',
    cue: 'cue',
    rego: 'rego',

    // Misc
    xml: 'xml',
    svg: 'xml',
    vue: 'vue',
    svelte: 'svelte',
    graphql: 'graphql',
    gql: 'graphql',
    log: 'log',
    cfg: 'ini',
    conf: 'ini',

    // Others (scripts / build tools)
    gradle: 'groovy',
    groovy: 'groovy',
    pl: 'perl',
    pm: 'perl',
    lua: 'lua',
    nim: 'nim',
    elm: 'elm',
    r: 'r',
    jl: 'julia',
    erl: 'erlang',
    ex: 'elixir',
    exs: 'elixir',
    ml: 'ocaml',
    fs: 'fsharp',
    vb: 'vbnet',
    vbs: 'vbscript',
};

// ============================================================================
// Utility Functions (DRY)
// ============================================================================

/**
 * Get language identifier from file extension or VS Code's language ID
 */
function getLanguageId(filePath: string, fallbackLanguageId?: string): string {
    const fileExt = path.extname(filePath).replace('.', '').toLowerCase();
    return extensionToLanguageId[fileExt] || fallbackLanguageId || 'plaintext';
}

/**
 * Get relative path from workspace folder
 */
function getRelativePath(uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder): string {
    return path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
}

/**
 * Format content as a markdown code block with metadata
 */
function formatCodeBlock(
    relativePath: string,
    languageId: string,
    content: string,
    options?: {
        startLine?: number;
        endLine?: number;
        totalLines?: number;
        prefix?: string;
        suffix?: string;
    }
): string {
    const { startLine, endLine, prefix = '', suffix = '' } = options || {};

    const lineRangeNote =
        startLine && endLine && startLine !== endLine
            ? ` (from line ${startLine} to ${endLine})`
            : '';

    return `${relativePath}${lineRangeNote}\n\`\`\`${languageId}\n${prefix}${content}${suffix}\n\`\`\`\n\n`;
}

/**
 * Read file content from URI
 */
async function readFileContent(uri: vscode.Uri): Promise<string> {
    const fileData = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(fileData).toString('utf8');
}

/**
 * Get workspace folder for a URI, showing warning if not found
 */
function getWorkspaceFolderOrWarn(uri: vscode.Uri): vscode.WorkspaceFolder | undefined {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (!workspaceFolder) {
        vscode.window.showWarningMessage('File is not inside a workspace.');
    }
    return workspaceFolder;
}

/**
 * Get active editor or show warning if none
 */
function getActiveEditorOrWarn(): vscode.TextEditor | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor found.');
    }
    return editor;
}

// ============================================================================
// Collapsed Content Processing
// ============================================================================

/**
 * Get all folding ranges for a document
 */
async function getFoldingRanges(document: vscode.TextDocument): Promise<vscode.FoldingRange[]> {
    const ranges = await vscode.commands.executeCommand<vscode.FoldingRange[]>(
        'vscode.executeFoldingRangeProvider',
        document.uri
    );
    return ranges || [];
}

/**
 * Get currently collapsed (folded) ranges in the editor
 * This uses a workaround since VS Code doesn't directly expose collapsed state
 */
async function getCollapsedRanges(editor: vscode.TextEditor): Promise<Set<number>> {
    const document = editor.document;
    const visibleRanges = editor.visibleRanges;
    const foldingRanges = await getFoldingRanges(document);

    const collapsedStartLines = new Set<number>();

    // Get all folding ranges
    for (const range of foldingRanges) {
        // Check if this folding range is collapsed by seeing if its content is not visible
        // A range is collapsed if lines after the start are not in any visible range
        const foldStartLine = range.start;
        const foldEndLine = range.end;

        // Check if the fold body (lines after start, up to end) is hidden
        let isCollapsed = true;
        for (const visible of visibleRanges) {
            // If any line in the fold body is visible, it's not collapsed
            for (let line = foldStartLine + 1; line <= foldEndLine; line++) {
                if (line >= visible.start.line && line <= visible.end.line) {
                    isCollapsed = false;
                    break;
                }
            }
            if (!isCollapsed) {
                break;
            }
        }

        if (isCollapsed && foldEndLine > foldStartLine) {
            collapsedStartLines.add(foldStartLine);
        }
    }

    return collapsedStartLines;
}

/**
 * Build content respecting collapsed regions
 * For collapsed regions, only includes the first line (signature) and adds [...] marker
 */
async function buildContentWithCollapsedRegions(
    editor: vscode.TextEditor,
    lineRange?: { start: number; end: number }
): Promise<string> {
    const document = editor.document;
    const foldingRanges = await getFoldingRanges(document);
    const collapsedStartLines = await getCollapsedRanges(editor);

    const sortedRanges = foldingRanges
        .filter((r) => collapsedStartLines.has(r.start))
        .sort((a, b) => a.start - b.start);

    // Determine line range to process
    const startLineNum = lineRange ? lineRange.start : 0;
    const endLineNum = lineRange ? lineRange.end : document.lineCount - 1;

    const lines: string[] = [];
    let skipUntilLine = -1;

    for (let lineNum = startLineNum; lineNum <= endLineNum; lineNum++) {
        if (lineNum <= skipUntilLine) {
            continue;
        }

        const lineText = document.lineAt(lineNum).text;
        const collapsedRange = sortedRanges.find((r) => r.start === lineNum);

        if (collapsedRange) {
            // Add the signature line (first line of collapsed region)
            lines.push(lineText);
            // Add collapsed marker
            lines.push('    // [...collapsed...]');
            // Only skip if the collapsed range end is within our range
            skipUntilLine = Math.min(collapsedRange.end, endLineNum);
        } else {
            lines.push(lineText);
        }
    }

    return lines.join('\n');
}

// ============================================================================
// Command Handlers
// ============================================================================

/**
 * Core logic for copying file content with context
 */
async function copyFileWithContextCore(options: { respectFolding: boolean }): Promise<void> {
    const editor = getActiveEditorOrWarn();
    if (!editor) {
        return;
    }

    const document = editor.document;
    const workspaceFolder = getWorkspaceFolderOrWarn(document.uri);
    if (!workspaceFolder) {
        return;
    }

    const relativePath = getRelativePath(document.uri, workspaceFolder);
    const selection = editor.selection;
    const hasSelection =
        selection && !selection.isEmpty && document.getText(selection).trim().length > 3;

    let fileContent: string;
    let startLine = 1;
    let endLine = document.lineCount;
    let prefix = '';
    let suffix = '';

    if (hasSelection) {
        startLine = selection.start.line + 1;
        endLine = selection.end.line + 1;

        if (options.respectFolding) {
            // Build folding-aware content for the selected range
            fileContent = await buildContentWithCollapsedRegions(editor, {
                start: selection.start.line,
                end: selection.end.line,
            });
        } else {
            fileContent = document.getText(selection).trim();
        }

        if (startLine > 1) {
            prefix = '[...]\n';
        }
        if (endLine < document.lineCount) {
            suffix = '\n[...]';
        }
    } else {
        if (options.respectFolding) {
            fileContent = await buildContentWithCollapsedRegions(editor);
        } else {
            fileContent = document.getText();
        }
    }

    const languageId = getLanguageId(document.fileName, document.languageId);

    const formatted = formatCodeBlock(relativePath, languageId, fileContent, {
        startLine: hasSelection ? startLine : undefined,
        endLine: hasSelection ? endLine : undefined,
        totalLines: document.lineCount,
        prefix,
        suffix,
    });

    await vscode.env.clipboard.writeText(formatted);

    const mode = options.respectFolding ? ' (respecting folds)' : '';
    vscode.window.showInformationMessage(`Copied file with context${mode}!`);
}

/**
 * Recursively get all files in a directory
 */
async function getFilesRecursively(uri: vscode.Uri): Promise<vscode.Uri[]> {
    const files: vscode.Uri[] = [];

    try {
        const stat = await vscode.workspace.fs.stat(uri);

        if (stat.type === vscode.FileType.File) {
            files.push(uri);
        } else if (stat.type === vscode.FileType.Directory) {
            const entries = await vscode.workspace.fs.readDirectory(uri);

            for (const [name, type] of entries) {
                // Skip common non-essential directories
                if (type === vscode.FileType.Directory) {
                    const skipDirs = [
                        'node_modules',
                        '.git',
                        'dist',
                        'out',
                        '.vscode',
                        '__pycache__',
                        '.next',
                        'build',
                        'coverage',
                    ];
                    if (skipDirs.includes(name)) {
                        continue;
                    }
                }

                const childUri = vscode.Uri.joinPath(uri, name);
                const childFiles = await getFilesRecursively(childUri);
                files.push(...childFiles);
            }
        }
    } catch {
        // Skip files/directories that can't be accessed
    }

    return files;
}

/**
 * Process and copy multiple file URIs to clipboard
 */
async function processAndCopyFiles(uris: vscode.Uri[]): Promise<void> {
    if (uris.length === 0) {
        vscode.window.showWarningMessage('No valid files found.');
        return;
    }

    // Sort files by path for consistent output
    uris.sort((a, b) => a.fsPath.localeCompare(b.fsPath));

    const formattedBlocks: string[] = [];

    for (const uri of uris) {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspaceFolder) {
            continue;
        }

        try {
            const content = await readFileContent(uri);
            const relativePath = getRelativePath(uri, workspaceFolder);
            const languageId = getLanguageId(uri.fsPath);

            const formatted = formatCodeBlock(relativePath, languageId, content);
            formattedBlocks.push(formatted);
        } catch {
            // Skip files that can't be read (binary files, etc.)
        }
    }

    if (formattedBlocks.length === 0) {
        vscode.window.showWarningMessage('No files could be processed.');
        return;
    }

    const combinedOutput = formattedBlocks.join('');
    await vscode.env.clipboard.writeText(combinedOutput);

    const fileWord = formattedBlocks.length === 1 ? 'file' : 'files';
    vscode.window.showInformationMessage(
        `Copied ${formattedBlocks.length} ${fileWord} with context!`
    );
}

/**
 * Copy file or all files in directory (recursively) from explorer selection
 */
async function copyFilesOrDirectoryWithContext(
    clickedUri: vscode.Uri | undefined,
    selectedUris: vscode.Uri[] | undefined
): Promise<void> {
    let uris: vscode.Uri[] = [];

    if (selectedUris && selectedUris.length > 0) {
        uris = selectedUris;
    } else if (clickedUri) {
        uris = [clickedUri];
    } else {
        // Called from keyboard shortcut - try to get the selected resource
        // First, copy the current explorer selection to clipboard path, then read it
        // This is a workaround since VS Code doesn't expose explorer selection directly

        // Save current clipboard content
        const originalClipboard = await vscode.env.clipboard.readText();

        try {
            // Execute the built-in command that copies the file path
            await vscode.commands.executeCommand('copyFilePath');

            // Small delay to ensure clipboard is updated
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Read the path from clipboard
            const copiedPath = await vscode.env.clipboard.readText();

            // Restore original clipboard
            await vscode.env.clipboard.writeText(originalClipboard);

            if (copiedPath && copiedPath !== originalClipboard) {
                // Handle multiple paths (when multiple items selected, they're newline-separated)
                const paths = copiedPath.split(/\r?\n/).filter((p) => p.trim());
                for (const p of paths) {
                    uris.push(vscode.Uri.file(p.trim()));
                }
            }
        } catch {
            // Restore clipboard on error
            await vscode.env.clipboard.writeText(originalClipboard);
        }
    }

    if (uris.length === 0) {
        vscode.window.showWarningMessage(
            'No file or folder selected. Select a file or folder in Explorer first.'
        );
        return;
    }

    // Collect all files (expanding directories recursively)
    const allFiles: vscode.Uri[] = [];
    for (const uri of uris) {
        const files = await getFilesRecursively(uri);
        allFiles.push(...files);
    }

    // Remove duplicates (in case of overlapping selections)
    const uniqueFiles = [...new Map(allFiles.map((f) => [f.fsPath, f])).values()];

    await processAndCopyFiles(uniqueFiles);
}

// ============================================================================
// Extension Activation
// ============================================================================

export function activate(context: vscode.ExtensionContext) {
    // Copy file/selection with context
    const copyFileWithContext = vscode.commands.registerCommand(
        'extension.copyFileWithContext',
        async () => copyFileWithContextCore({ respectFolding: false })
    );

    // Copy file respecting collapsed/folded regions
    const copyFileWithFolding = vscode.commands.registerCommand(
        'extension.copyFileWithFolding',
        async () => copyFileWithContextCore({ respectFolding: true })
    );

    // Copy file or directory (recursively) from Explorer
    const copyMultipleFiles = vscode.commands.registerCommand(
        'extension.copyMultipleFilesWithContext',
        copyFilesOrDirectoryWithContext
    );

    context.subscriptions.push(copyFileWithContext, copyFileWithFolding, copyMultipleFiles);
}

export function deactivate() {}
