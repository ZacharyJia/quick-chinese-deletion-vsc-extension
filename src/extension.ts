'use strict';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
    window,
    commands,
    ExtensionContext,
    Position,
    Range,
    TextEditor,
    TextDocument,
    TextLine,
    Selection,
} from 'vscode';

import { isArray } from 'util';

var Segment = require('segment');

const segment = new Segment();


/**
 *  Find the range to be deleted for smart backspace, backtracing the start position from a cursor positoin
 *
 * @param {TextDocument} textDocument - TextDocument of Editor
 * @param {Selection} selection - A cursor selection of document
 * @returns {Range} range - it includes the range to be detected based on the input selection
 */
function findSmartBackspaceRange(
    textEditor: TextEditor,
    textDocument: TextDocument,
    selection: Selection): Range {
    if (!selection.isEmpty) {
        return new Range(selection.start, selection.end);
    }

    const activePosition = selection.active;
    const lineNumber = activePosition.line;
    const textLine = textDocument.lineAt(activePosition);

    // 如果已经在行首了，就不删除了（暂时没找到删除当前行且光标上移的方法）
    if(activePosition.character == 0) {
        return null;
    }

    // 分词范围为从行首到光标位置
    const segRange = new Range(activePosition, textLine.range.start);

    var result = segment.doSegment(textDocument.getText(segRange), {
        simple: true
    });

    if (isArray(result) && result.length > 0) {
        var startCharater = textLine.text.lastIndexOf(result.pop());
        var deletionStartPosition = new Position(textLine.lineNumber, startCharater);
        return new Range(deletionStartPosition, activePosition);
    }
    else {
        return new Range(new Position(textLine.lineNumber, activePosition.character - 1), activePosition);
    }
}

/**
 *  The smart backspace callback registered in the command
 *
 *  1. It searches the deletion range based on each selection position (a.k.a cursor position)
 *  2. Call EditorBuilder to delete the deletion ranges from step 1
 *
 * @export
 * @returns {Thenable<Boolean>} Promise of the editor.delete() action, can be awaited, or chained, will be resolved async
 */
export function smartBackspace(): Thenable<Boolean> {
    const editor = window.activeTextEditor;
    const document = editor.document;
    const deletions = editor.selections.map(selection => findSmartBackspaceRange(editor, document, selection));

    const returned = editor.edit(editorBuilder => {
        deletions.forEach(deletion => {
            if (deletion != null) {
                editorBuilder.delete(deletion);
            }
        })
    });

    if (deletions.length <= 1) {
        editor.revealRange(new Range(editor.selection.start, editor.selection.end));
    }

    return returned;
}

function registerSmartBackspace() {
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = commands.registerCommand('extension.smartBackspace', smartBackspace);

    return disposable;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "hungry-delete" is now active!');

    context.subscriptions.push(registerSmartBackspace());

    segment.useDefault();
}

// this method is called when your extension is deactivated
export function deactivate() {
    
}
