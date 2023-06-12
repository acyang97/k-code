import * as vscode from "vscode";

export function getNumberOfErrors(): number {
  const activeTextEditor = vscode.window.activeTextEditor;
  if (!activeTextEditor) {
    return 0;
  }
  const document = activeTextEditor.document;
  // get lines of code with error
  const errorLines = new Set<number>();

  for (let diagnostic of vscode.languages.getDiagnostics(document.uri)) {
    if (diagnostic.severity === vscode.DiagnosticSeverity.Error) {
      const range = diagnostic.range;
      for (let line = range.start.line; line <= range.end.line; line++) {
        errorLines.add(line);
      }
    }
  }

  return errorLines.size;
}
