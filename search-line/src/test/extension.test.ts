import * as assert from 'assert';
import * as vscode from 'vscode';
import { findChar } from '../extension'; // Adjust import if needed

async function setupDocument(content: string): Promise<vscode.TextEditor> {
    const doc = await vscode.workspace.openTextDocument({ content });
    const editor = await vscode.window.showTextDocument(doc);
    return editor;
}

suite('Search Line Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('findChar moves cursor after match (forward)', async () => {
        const editor = await setupDocument('abc\ndef\nghi');
        editor.selection = new vscode.Selection(
            new vscode.Position(0, 0),
            new vscode.Position(0, 0)
        );

        await findChar(false, false, 'd'); // expandSelection = false, backwards = false

        const newPos = editor.selection.active;

        assert.strictEqual(newPos.line, 1);
        assert.strictEqual(newPos.character, 1); // after 'd'
    });

    test('findCharBackward moves cursor before match (backward)', async () => {
        const editor = await setupDocument('abc\ndef\nghi');
        editor.selection = new vscode.Selection(
            new vscode.Position(2, 2),
            new vscode.Position(2, 2)
        );

        await findChar(false, true, 'd'); // expandSelection = false, backwards = true

        const newPos = editor.selection.active;

        assert.strictEqual(newPos.line, 1);
        assert.strictEqual(newPos.character, 0); // before 'd'
    });

    test('findCharAndSelect selects from A to after match (forward select)', async () => {
        const editor = await setupDocument('abc\ndef\nghi');
        editor.selection = new vscode.Selection(
            new vscode.Position(0, 0),
            new vscode.Position(0, 0)
        );

        await findChar(true, false, 'd'); // expandSelection = true, backwards = false

        const sel = editor.selection;
        assert.strictEqual(sel.anchor.line, 0);
        assert.strictEqual(sel.anchor.character, 0);
        assert.strictEqual(sel.active.line, 1);
        assert.strictEqual(sel.active.character, 1); // after 'd'
    });

    test('findCharAndSelectBackward selects from A to before match (backward select)', async () => {
        const editor = await setupDocument('abc\ndef\nghi');
        editor.selection = new vscode.Selection(
            new vscode.Position(2, 2),
            new vscode.Position(2, 2)
        );

        await findChar(true, true, 'd'); // expandSelection = true, backwards = true

        const sel = editor.selection;
        assert.strictEqual(sel.anchor.line, 2);
        assert.strictEqual(sel.anchor.character, 2);
        assert.strictEqual(sel.active.line, 1);
        assert.strictEqual(sel.active.character, 0); // before 'd'
    });

    test('cursors stay when no match', async () => {
        const editor = await setupDocument('abc\ndef\nghi');
        editor.selection = new vscode.Selection(
            new vscode.Position(0, 0),
            new vscode.Position(0, 0)
        );

        await findChar(false, false, 'zzz'); // No match in text

        const newPos = editor.selection.active;

        // Cursor should stay at original place
        assert.strictEqual(newPos.line, 0);
        assert.strictEqual(newPos.character, 0);
    });

    test('duplicate cursors deduplicated with longer selection winning', async () => {
        const editor = await setupDocument('abc abc abc');
        editor.selections = [
            new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0)),
            new vscode.Selection(new vscode.Position(0, 4), new vscode.Position(0, 4)),
            new vscode.Selection(new vscode.Position(0, 8), new vscode.Position(0, 8)),
        ];

        await findChar(true, false, 'abc'); // expandSelection = true, forwards, searching 'abc'

        // Now check that after deduplication, no two selections are identical
        const seen = new Set<string>();
        for (const sel of editor.selections) {
            const key = `${sel.start.line}:${sel.start.character}-${sel.end.line}:${sel.end.character}`;
            assert.ok(!seen.has(key), `Duplicate selection detected: ${key}`);
            seen.add(key);
        }
    });

    test('duplicate cursors collapse when ending at same position', async () => {
        const editor = await setupDocument('foobar');
        editor.selections = [
            new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0)),
            new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0)),
        ];

        await findChar(false, false, 'foo');

        assert.strictEqual(editor.selections.length, 1);
        const sel = editor.selections[0];
        assert.strictEqual(sel.active.line, 0);
        assert.strictEqual(sel.active.character, 3);
    });

    test('mixed match and no-match cursors remain correctly', async () => {
        const editor = await setupDocument('abc\nxyz');
        editor.selections = [
            new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0)),
            new vscode.Selection(new vscode.Position(1, 3), new vscode.Position(1, 3)),
        ];

        await findChar(false, false, 'a');
        const selections = editor.selections;

        assert.strictEqual(selections.length, 2);
        assert.strictEqual(selections[0].active.line, 0);
        assert.strictEqual(selections[0].active.character, 1);
        assert.strictEqual(selections[1].active.line, 1);
        assert.strictEqual(selections[1].active.character, 3);
    });

    // Edge case tests

    test('invalid regex injection leaves cursors unchanged', async () => {
        const editor = await setupDocument('abc');
        editor.selection = new vscode.Selection(
            new vscode.Position(0, 0),
            new vscode.Position(0, 0)
        );
        const original = editor.selection;

        await findChar(false, false, '[');

        const after = editor.selection;
        assert.strictEqual(after.active.line, original.active.line);
        assert.strictEqual(after.active.character, original.active.character);
    });

    test('empty injectedInput does nothing', async () => {
        const editor = await setupDocument('abc');
        editor.selection = new vscode.Selection(
            new vscode.Position(0, 1),
            new vscode.Position(0, 1)
        );
        const original = editor.selection;

        await findChar(false, false, '');

        const after = editor.selection;
        assert.strictEqual(after.active.line, original.active.line);
        assert.strictEqual(after.active.character, original.active.character);
    });

    test('zero-length regex pattern yields no moves', async () => {
        const editor = await setupDocument('abc');
        editor.selection = new vscode.Selection(
            new vscode.Position(0, 1),
            new vscode.Position(0, 1)
        );
        const original = editor.selection;

        await findChar(false, false, '^');

        const after = editor.selection;
        assert.strictEqual(after.active.line, original.active.line);
        assert.strictEqual(after.active.character, original.active.character);
    });

    test('forward search at document end stays at end', async () => {
        const editor = await setupDocument('abc');
        editor.selection = new vscode.Selection(
            new vscode.Position(0, 3),
            new vscode.Position(0, 3)
        );

        await findChar(false, false, 'a');

        const after = editor.selection.active;
        assert.strictEqual(after.line, 0);
        assert.strictEqual(after.character, 3);
    });

    test('backward search at document start stays at start', async () => {
        const editor = await setupDocument('abc');
        editor.selection = new vscode.Selection(
            new vscode.Position(0, 0),
            new vscode.Position(0, 0)
        );

        await findChar(false, true, 'c');

        const after = editor.selection.active;
        assert.strictEqual(after.line, 0);
        assert.strictEqual(after.character, 0);
    });

    test('existing selection collapses to single cursor with no-expand', async () => {
        const editor = await setupDocument('abcdef');
        editor.selection = new vscode.Selection(
            new vscode.Position(0, 0),
            new vscode.Position(0, 3)
        );

        await findChar(false, false, 'd');

        const sel = editor.selection;
        assert.strictEqual(editor.selections.length, 1);
        assert.strictEqual(sel.active.line, 0);
        assert.strictEqual(sel.active.character, 4);
    });

    test('newline forward moves to next line start', async () => {
        const editor = await setupDocument('a\nb');
        editor.selection = new vscode.Selection(
            new vscode.Position(0, 1),
            new vscode.Position(0, 1)
        );

        await findChar(false, false, '\\n');
        const after = editor.selection.active;
        assert.strictEqual(after.line, 1);
        assert.strictEqual(after.character, 0);
    });

    test('newline backward moves to before newline', async () => {
        const editor = await setupDocument('a\nb');
        editor.selection = new vscode.Selection(
            new vscode.Position(1, 1),
            new vscode.Position(1, 1)
        );

        await findChar(false, true, '\\n');
        const after = editor.selection.active;
        assert.strictEqual(after.line, 0);
        assert.strictEqual(after.character, 1);
    });

    test('CRLF newline forward works correctly', async () => {
        const editor = await setupDocument('a\r\n b');
        editor.selection = new vscode.Selection(
            new vscode.Position(0, 1),
            new vscode.Position(0, 1)
        );

        await findChar(false, false, '\\r\\n');
        const after = editor.selection.active;
        assert.strictEqual(after.line, 1);
        assert.strictEqual(after.character, 0);
    });

    test('CRLF newline backward works correctly', async () => {
        const editor = await setupDocument('a\r\n b');
        editor.selection = new vscode.Selection(
            new vscode.Position(1, 0),
            new vscode.Position(1, 0)
        );

        await findChar(false, true, '\\r\\n');
        const after = editor.selection.active;
        assert.strictEqual(after.line, 0);
        assert.strictEqual(after.character, 1);
    });

    test('overlapping pattern finds first occurrence only', async () => {
        const editor = await setupDocument('ababa');
        editor.selection = new vscode.Selection(
            new vscode.Position(0, 0),
            new vscode.Position(0, 0)
        );

        await findChar(false, false, 'aba');
        const after = editor.selection.active;

        assert.strictEqual(after.line, 0);
        assert.strictEqual(after.character, 3);
    });

    test('emoji text handles surrogate pairs correctly', async () => {
        const editor = await setupDocument('😀😁😂');
        editor.selection = new vscode.Selection(
            new vscode.Position(0, 0),
            new vscode.Position(0, 0)
        );

        await findChar(false, false, '\\uD83D\\uDE01');
        const after = editor.selection.active;
        assert.strictEqual(after.line, 0);
        assert.strictEqual(after.character, 4);
    });

    // Complex regex tests

    test('complex regex: wildcard across lines', async () => {
        const editor = await setupDocument('a\nb\nc');
        editor.selection = new vscode.Selection(
            new vscode.Position(0, 0),
            new vscode.Position(0, 0)
        );

        await findChar(false, false, 'a[\\s\\S]*?c');
        const after = editor.selection.active;
        assert.strictEqual(after.line, 2);
        assert.strictEqual(after.character, 1);
    });

    test('complex regex: positive lookbehind', async () => {
        const editor = await setupDocument('foobar');
        editor.selection = new vscode.Selection(
            new vscode.Position(0, 0),
            new vscode.Position(0, 0)
        );

        await findChar(false, false, '(?<=foo)bar');
        const after = editor.selection.active;
        assert.strictEqual(after.line, 0);
        assert.strictEqual(after.character, 6);
    });

    test('complex regex: alternation', async () => {
        const editor = await setupDocument('apple banana cherry');
        editor.selection = new vscode.Selection(
            new vscode.Position(0, 0),
            new vscode.Position(0, 0)
        );

        await findChar(false, false, 'banana|cherry');
        const after = editor.selection.active;
        assert.strictEqual(after.line, 0);
        assert.strictEqual(after.character, 12);
    });
});
