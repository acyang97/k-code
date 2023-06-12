import * as vscode from "vscode";

export function getNumberOfErrors(): number {
  const activeTextEditor = vscode.window.activeTextEditor;
  if (!activeTextEditor) {
    return 0;
  }
  const document = activeTextEditor.document;
  let numberOfErrors = 0;

  for (let diagnostic of vscode.languages.getDiagnostics(document.uri)) {
    if (diagnostic.severity === 0) {
      numberOfErrors++;
    }
  }
  return numberOfErrors;
}
