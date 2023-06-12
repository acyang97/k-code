import * as vscode from "vscode";

export function getNumberOfErrors(): number {
  const activeTextEditor: vscode.TextEditor | undefined =
    vscode.window.activeTextEditor;
  if (!activeTextEditor) {
    return 0;
  }
  const document: vscode.TextDocument = activeTextEditor.document;

  let numErrors = 0;

  let aggregatedDiagnostics: any = {};
  let diagnostic: vscode.Diagnostic;

  for (diagnostic of vscode.languages.getDiagnostics(document.uri)) {
    let key = "line" + diagnostic.range.start.line;

    if (aggregatedDiagnostics[key]) {
      aggregatedDiagnostics[key].arrayDiagnostics.push(diagnostic);
    } else {
      aggregatedDiagnostics[key] = {
        line: diagnostic.range.start.line,
        arrayDiagnostics: [diagnostic],
      };
    }
    if (diagnostic.severity === 0) {
      numErrors++;
    }
  }

  return numErrors;
}
