"use strict";
import * as vscode from "vscode";
import { BUTTONS } from "./constants/Buttons.constants";

export function activate(context: vscode.ExtensionContext) {
  const provider = new KpopSideBar(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(KpopSideBar.viewType, provider)
  );
}

class KpopSideBar implements vscode.WebviewViewProvider {
  public static readonly viewType = "in-your-face.openview";

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}
  // debounce the function to show errors
  private debounce(
    webviewView: vscode.WebviewView,
    action: string,
    updating: boolean
  ): void {
    const updateSideBar = () => {
      if (updating) {
        return;
      }
      updating = true;
      setTimeout(() => {
        let errors = getNumErrors();
        let i = "0";
        if (errors) i = errors < 5 ? "1" : errors < 10 ? "2" : "3";
        webviewView.webview.html = this.getHtmlContent(webviewView.webview, i);
        updating = false;
      }, 1000);
    };

    if (action === "onDidChangeTextDocument") {
      vscode.workspace.onDidChangeTextDocument((event) => {
        updateSideBar();
      });
    } else if (action === "onDidChangeDiagnostics") {
      vscode.languages.onDidChangeDiagnostics((event) => {
        updateSideBar();
      });
    } else {
      vscode.workspace.onDidOpenTextDocument((event) => {
        updateSideBar();
      });
    }
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext<unknown>,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    this._view = webviewView;

    BUTTONS.forEach((button) => {
      // from gpt
      webviewView.webview.onDidReceiveMessage((message) => {
        if (message.command === button.sendToExtensionCommand) {
          // Open the file dialog and send the result back to the webview
          vscode.window
            .showOpenDialog({
              canSelectFiles: true,
              canSelectFolders: false,
              canSelectMany: false,
              filters: {
                Images: ["png", "jpg", "jpeg"],
              },
            })
            .then((fileUri) => {
              const selectedFile =
                fileUri && fileUri.length > 0 ? fileUri[0].toString() : "";
              // Send the file dialog result back to the webview
              // process the uri
              console.log("selectedFile", selectedFile);
              webviewView.webview.postMessage({
                command: button.getFromExtensionCommand,
                fileUri: selectedFile,
              });
            });
        }
      });
    });
    // now I need to handle the function of uploading an image

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    webviewView.webview.html = this.getHtmlContent(webviewView.webview, "0");
    let updating = false;
    // 3 cases that I need to keep track and update the number of errors and render the proper image
    this.debounce(webviewView, "onDidChangeTextDocument", updating);
    this.debounce(webviewView, "onDidChangeDiagnostics", updating);
    this.debounce(webviewView, "onDidOpenTextDocument", updating);
  }

  private getHtmlContent(webview: vscode.Webview, i: string): string {
    const stylesheetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", "main.css")
    );

    const doomFace = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", `doom${i}.png`)
    );

    return this.getHtml(doomFace, stylesheetUri, webview);
  }

  getHtml(
    // doomface should be an image from that the user uploaded now
    doomFace: vscode.Uri,
    stylesheetUri: vscode.Uri,
    webview: vscode.Webview
  ) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", "main.js")
    );
    // Do the same for the stylesheet.
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", "vscode.css")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", "main.css")
    );
    // const x = acquireVsCode;
    const errorNum = getNumErrors();
    const text1 = "Change images to display!";
    const text2 = "Change happy image!";
    const text3 = "Change sad image!";
    const text4 = "Change frustrated image!";

    let showAllButtons = false;
    const onClick1 = () => {
      console.log("hello 1");
      showAllButtons = true;
    };
    const onClick2 = () => {
      console.log("hello 2");
    };
    const onClick3 = () => {
      console.log("hello 3");
    };
    const onClick4 = () => {
      console.log("hello 4");
    };
    let button1 = `<button onclick="(${onClick1}}')">${text1}</button>`;
    let button2 = `<button onclick="(${onClick2}}')">${text2}</button>`;
    let button3 = `<button onclick="(${onClick3}}')">${text3}</button>`;
    let button4 = `<button onclick="(${onClick4}}')">${text4}</button>`;

    function createButtonWithImageUpload(): vscode.QuickInputButton {
      const button: vscode.QuickInputButton = {
        iconPath: vscode.Uri.file("path/to/upload-icon.png"),
        tooltip: "Upload Image",
      };

      return button;
    }

    function handleImageUpload() {
      // Implement the logic to handle image upload
      // and store the image URI or content in your extension's configuration
    }

    // Usage example:
    const button = createButtonWithImageUpload();
    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();
    console.log(vscode.workspace.getConfiguration());
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">

      <!--
        Use a content security policy to only allow loading styles from our extension directory,
        and only allow scripts that have a specific nonce.
        (See the 'webview-sample' extension sample for img-src content security policy examples)
      -->
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

      <meta name="viewport" content="width=device-width, initial-scale=1.0">

      <link href="${styleResetUri}" rel="stylesheet">
      <link href="${styleVSCodeUri}" rel="stylesheet">
      <link href="${styleMainUri}" rel="stylesheet">

      <title>Cat Colors</title>
    </head>
    <body>
      <button class="add-image-button-happy">Add Happy Image</button>
      <button class="add-image-button-moody">Add Moody Image</button>
      <button class="add-image-button-frustrated">Add Frustrated Image</button>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
  }
}
// function to get the number of errors in the open file
function getNumErrors(): number {
  const activeTextEditor: vscode.TextEditor | undefined =
    vscode.window.activeTextEditor;
  if (!activeTextEditor) {
    return 0;
  }
  const document: vscode.TextDocument = activeTextEditor.document;

  let numErrors = 0;

  let aggregatedDiagnostics: any = {};
  let diagnostic: vscode.Diagnostic;

  // Iterate over each diagnostic that VS Code has reported for this file. For each one, add to
  // a list of objects, grouping together diagnostics which occur on a single line.
  for (diagnostic of vscode.languages.getDiagnostics(document.uri)) {
    let key = "line" + diagnostic.range.start.line;

    if (aggregatedDiagnostics[key]) {
      // Already added an object for this key, so augment the arrayDiagnostics[] array.
      aggregatedDiagnostics[key].arrayDiagnostics.push(diagnostic);
    } else {
      // Create a new object for this key, specifying the line: and a arrayDiagnostics[] array
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

// this method is called when your extension is deactivated
export function deactivate() {}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
