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
 * Check if file should be skipped entirely (not copied at all)
 */
function shouldSkipFile(filePath: string): boolean {
    return filePath.endsWith('_templ.go');
}

/**
 * Check if file content should be omitted (path shown, content replaced with message)
 */
function shouldOmitContent(filePath: string): boolean {
    return filePath.endsWith('.min.js');
}

/**
 * Format an omitted-content block (path + brevity message, no code block)
 */
function formatOmittedBlock(relativePath: string): string {
    return `${relativePath}\n(content omitted for brevity)\n\n`;
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
 * Detect collapsed folds by finding gaps between consecutive visible ranges.
 * Each gap in visibleRanges corresponds to a collapsed fold in the viewport.
 */
function detectGapsInVisibleRanges(
    visibleRanges: readonly vscode.Range[],
    foldingRanges: vscode.FoldingRange[],
    result: Set<number>
): void {
    if (visibleRanges.length <= 1) {
        return;
    }

    const sorted = [...visibleRanges].sort((a, b) => a.start.line - b.start.line);

    for (let i = 0; i < sorted.length - 1; i++) {
        const gapFoldStartLine = sorted[i].end.line;
        const matchedFold = foldingRanges.find((r) => r.start === gapFoldStartLine);
        if (matchedFold) {
            result.add(matchedFold.start);
        }
    }
}

/**
 * Get currently collapsed (folded) ranges in the editor.
 * Scans the current viewport for gaps, then scrolls through off-screen regions
 * to detect folds outside the viewport. Restores scroll position when done.
 */
async function getCollapsedRanges(editor: vscode.TextEditor): Promise<Set<number>> {
    const foldingRanges = await getFoldingRanges(editor.document);
    const collapsedStartLines = new Set<number>();

    if (foldingRanges.length === 0) {
        return collapsedStartLines;
    }

    // Detect folds in the current viewport (no scroll needed)
    detectGapsInVisibleRanges(editor.visibleRanges, foldingRanges, collapsedStartLines);

    // Determine viewport span
    const vr = editor.visibleRanges;
    const viewportStart = vr[0].start.line;
    const viewportEnd = vr[vr.length - 1].end.line;
    const viewportHeight = Math.max(viewportEnd - viewportStart, 20);

    // Find fold start lines outside the current viewport
    const uncheckedFolds = foldingRanges.filter(
        (r) => r.start < viewportStart || r.start > viewportEnd
    );

    if (uncheckedFolds.length > 0) {
        const originalVisibleRange = vr[0];

        // Scroll to each unchecked region, batching nearby folds
        const positions = [...new Set(uncheckedFolds.map((r) => r.start))].sort((a, b) => a - b);
        let lastCheckedPos = -viewportHeight;

        for (const pos of positions) {
            // Skip if this position was already covered by a previous scroll
            if (Math.abs(pos - lastCheckedPos) < viewportHeight / 2) {
                continue;
            }

            editor.revealRange(
                new vscode.Range(pos, 0, pos, 0),
                vscode.TextEditorRevealType.InCenter
            );
            await new Promise((r) => setTimeout(r, 50));

            detectGapsInVisibleRanges(editor.visibleRanges, foldingRanges, collapsedStartLines);
            lastCheckedPos = pos;
        }

        // Restore original scroll position
        editor.revealRange(originalVisibleRange, vscode.TextEditorRevealType.AtTop);
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

    // Skip _templ.go files entirely
    if (shouldSkipFile(document.fileName)) {
        vscode.window.showInformationMessage('Skipped: _templ.go files are ignored.');
        return;
    }

    // .min.js files: copy path only, omit content
    if (shouldOmitContent(document.fileName)) {
        await vscode.env.clipboard.writeText(formatOmittedBlock(relativePath));
        vscode.window.showInformationMessage('Copied path (content omitted for brevity).');
        return;
    }

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
            if (!shouldSkipFile(uri.fsPath)) {
                files.push(uri);
            }
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
            const relativePath = getRelativePath(uri, workspaceFolder);

            if (shouldOmitContent(uri.fsPath)) {
                formattedBlocks.push(formatOmittedBlock(relativePath));
                continue;
            }

            const content = await readFileContent(uri);
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
