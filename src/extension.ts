"use strict";
import * as vscode from "vscode";
import { BUTTONS } from "./constants/Buttons.constants";
import { getNonce } from "./utils/getNounce";
import { getNumberOfErrors } from "./utils/getNumberOfErrors";
import { Mood, getEmojiImageFileName } from "./utils/image.utils";

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
        let numberOfErrors = getNumberOfErrors();
        let mood = Mood.HAPPY;
        if (numberOfErrors >= 10) {
          mood = Mood.FRUSTRATED;
        } else if (numberOfErrors > 0) {
          mood = Mood.MOODY;
        }
        webviewView.webview.html = this.getHtmlContent(
          webviewView.webview,
          getEmojiImageFileName(mood)
        );
        updating = false;
      }, 1000);
    };

    if (action === "onDidChangeTextDocument") {
      vscode.workspace.onDidChangeTextDocument(() => {
        updateSideBar();
      });
    } else if (action === "onDidChangeDiagnostics") {
      vscode.languages.onDidChangeDiagnostics(() => {
        updateSideBar();
      });
    } else {
      vscode.workspace.onDidOpenTextDocument(() => {
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
                Images: ["png", "jpg", "jpeg", "gif"],
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
    // default it to be happy
    webviewView.webview.html = this.getHtmlContent(
      webviewView.webview,
      getEmojiImageFileName(Mood.HAPPY)
    );
    let updating = false;
    // 3 cases that I need to keep track and update the number of errors and render the proper image
    this.debounce(webviewView, "onDidChangeTextDocument", updating);
    this.debounce(webviewView, "onDidChangeDiagnostics", updating);
    this.debounce(webviewView, "onDidOpenTextDocument", updating);
  }

  private getHtmlContent(webview: vscode.Webview, fileName: string): string {
    const displayImage = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", fileName)
    );
    console.log("displayImage", displayImage);
    return this.getHtml(webview, displayImage);
  }

  getHtml(webview: vscode.Webview, displayImage: vscode.Uri) {
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
    const numberOfErrors = getNumberOfErrors();

    // Usage example:
    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <!-- Resolve this later, for now just allow all images -->
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${
        webview.cspSource
      }; script-src 'nonce-${nonce}'; img-src *;">

      <meta name="viewport" content="width=device-width, initial-scale=1.0">

      <link href="${styleResetUri}" rel="stylesheet">
      <link href="${styleVSCodeUri}" rel="stylesheet">
      <link href="${styleMainUri}" rel="stylesheet">

      <title>Kpop Recommender</title>
    </head>
    <body>
      <section>
        <img src="${displayImage}">
        <h2 class=${numberOfErrors ? "alarm" : ""}>
          ${numberOfErrors} ${numberOfErrors === 1 ? "error" : "errors"}
        </h2>
      </section>
      <button class="add-image-button-happy">Update Happy Image</button>
      <button class="add-image-button-moody">Update Moody Image</button>
      <button class="add-image-button-frustrated">Update Frustrated Image</button>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
  }
}

// this method is called when your extension is deactivated
export function deactivate() {}
