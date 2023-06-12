"use strict";
import * as vscode from "vscode";
import { BUTTONS, IButton } from "./constants/Buttons.constants";
import { getNonce } from "./utils/getNonce";
import { getNumberOfErrors } from "./utils/getNumberOfErrors";
import {
  Mood,
  encodeImageToBase64,
  getEmojiImageFileName,
} from "./utils/image.utils";

export function activate(context: vscode.ExtensionContext) {
  const provider = new KpopSideBar(context.extensionUri, context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(KpopSideBar.viewType, provider)
  );
}

class KpopSideBar implements vscode.WebviewViewProvider {
  public static readonly viewType = "kpop-recommender.openview";
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly extensionContext: vscode.ExtensionContext
  ) {}

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
        if (numberOfErrors >= 5) {
          mood = Mood.FRUSTRATED;
        } else if (numberOfErrors > 0) {
          mood = Mood.MOODY;
        }
        webviewView.webview.html = this.getHtml(
          webviewView.webview,
          mood,
          this.extensionContext
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

  async uploadFile(button: IButton, webviewView: vscode.WebviewView) {
    vscode.window
      .showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          Images: ["png", "jpg", "jpeg", "gif"],
        },
      })
      .then(async (fileUri) => {
        try {
          const selectedFile =
            fileUri && fileUri.length > 0 ? fileUri[0].toString() : "";
          const [encoded, extension] = await encodeImageToBase64(selectedFile);
          this.extensionContext.globalState.update(button.mood.toString(), [
            encoded,
            extension,
          ]);
          webviewView.webview.postMessage({
            command: button.getFromExtensionCommand,
            fileUri: selectedFile,
          });
          // if successful, show the new image
          webviewView.webview.html = this.getHtml(
            webviewView.webview,
            button.mood,
            this.extensionContext
          );
        } catch (error) {}
      });
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext<unknown>,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    this._view = webviewView;

    BUTTONS.forEach((button) => {
      webviewView.webview.onDidReceiveMessage(async (message) => {
        if (message.command === button.sendToExtensionCommand) {
          await this.uploadFile(button, webviewView);
        }
      });
    });

    // Reset images
    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.command === "resetButtonSend") {
        this.extensionContext.globalState.update(
          Mood.FRUSTRATED.toString(),
          undefined
        );
        this.extensionContext.globalState.update(
          Mood.HAPPY.toString(),
          undefined
        );
        this.extensionContext.globalState.update(
          Mood.MOODY.toString(),
          undefined
        );
      }
    });

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    // default it to be happy
    webviewView.webview.html = this.getHtml(
      webviewView.webview,
      Mood.HAPPY,
      this.extensionContext
    );
    let updating = false;
    this.debounce(webviewView, "onDidChangeTextDocument", updating);
    this.debounce(webviewView, "onDidChangeDiagnostics", updating);
    this.debounce(webviewView, "onDidOpenTextDocument", updating);
  }

  getHtml(
    webview: vscode.Webview,
    mood: Mood,
    context: vscode.ExtensionContext
  ): string {
    let base64EncodedImage;
    if (context.globalState.get(mood.toString())) {
      base64EncodedImage = context.globalState.get(mood.toString()) as [
        string,
        string
      ];
    }
    const displayImage = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "assets",
        getEmojiImageFileName(mood)
      )
    );

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

    let toDisplay = base64EncodedImage
      ? `data:image/${base64EncodedImage[1]};base64,${base64EncodedImage[0]}`
      : displayImage;
    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    const formatNumberOfErrorsString = `${numberOfErrors} ${
      numberOfErrors === 1 ? "error" : "errors"
    }`;

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <!-- Resolve this later, for now just allow all images
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; img-src 'self' data:;">
      -->

      <meta name="viewport" content="width=device-width, initial-scale=1.0">

      <link nonce="${nonce}" href="${styleResetUri}" rel="stylesheet">
      <link nonce="${nonce}" href="${styleVSCodeUri}" rel="stylesheet">
      <link nonce="${nonce}" href="${styleMainUri}" rel="stylesheet">

      <title>Kpop Recommender</title>
    </head>
    <body>
      <div class="image-div">
        <img src="${toDisplay}">
        <div class="error-text-div">
          <h2>
            ${formatNumberOfErrorsString}
          </h2>
        </div>
      </div>
      <button class="add-image-button-happy">Update Happy Image</button>
      <button class="add-image-button-moody">Update Moody Image</button>
      <button class="add-image-button-frustrated">Update Frustrated Image</button>
      <button class="reset-button">Reset All Images</button>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
  }
}

// this method is called when your extension is deactivated
export function deactivate() {}
