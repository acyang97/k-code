"use strict";
import * as vscode from "vscode";
import { BUTTONS, IButton } from "./constants/Buttons.constants";
import { getNonce } from "./utils/getNonce";
import { getNumberOfErrors } from "./utils/getNumberOfErrors";
import {
  Mood,
  encodeImageToBase64,
  getEmojiImageFileName,
  getMood,
} from "./utils/image.utils";
import { getRandomSongLink } from "./utils/songs.utils";

export function activate(context: vscode.ExtensionContext) {
  const provider = new KCodeSideBar(context.extensionUri, context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(KCodeSideBar.viewType, provider, {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    })
  );
}

class KCodeSideBar implements vscode.WebviewViewProvider {
  public static readonly viewType = "k-code.openview";
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
        updating = false;
        webviewView.webview.html = this.getHtml(
          webviewView.webview,
          getMood(numberOfErrors),
          this.extensionContext
        );
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
            getMood(getNumberOfErrors()),
            this.extensionContext
          );
        } catch (error) {}
      });
  }

  // private updateWebviewCSP(webview: vscode.Webview, cspSource: string) {
  //   const cspMetaTag = `<meta http-equiv="Content-Security-Policy" content="${cspSource}">`;
  //   const cspHeader = webview
  //     .asWebviewUri(vscode.Uri.parse(""))
  //     .with({ scheme: "vscode-resource" });
  //   webview.html = webview.html.replace(
  //     /<meta.*http-equiv=['"]Content-Security-Policy['"].*>/g,
  //     cspMetaTag
  //   );
  //   webview.html = webview.html.replace(
  //     /content=["'][^"']*["']/gi,
  //     `content="${cspHeader}"`
  //   );
  // }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext<unknown>,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, "assets")],
    };
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
      webviewView.webview.html = this.getHtml(
        webviewView.webview,
        getMood(getNumberOfErrors()),
        this.extensionContext
      );
    });

    webviewView.webview.options = {
      ...webviewView.webview.options,
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, "assets")],
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

    let formatNumberOfErrorsString = `${numberOfErrors} ${
      numberOfErrors === 1 ? "error" : "errors"
    }`;
    if (mood === Mood.FRUSTRATED) {
      formatNumberOfErrorsString += " 🤬🤬 씨발";
    } else if (mood === Mood.MOODY) {
      formatNumberOfErrorsString += " 😨😨 씨발";
    } else {
      formatNumberOfErrorsString += " 😊😊";
    }
    const SONG = getRandomSongLink();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <!--
      Use a content security policy to only allow loading images from https or from our extension directory,
      and only allow scripts that have a specific nonce.
    -->
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'self' http://*.vscode-cdn.net 'unsafe-inline'; img-src ${webview.cspSource} https: data:; script-src ${webview.cspSource} 'nonce-${nonce}' ; frame-src ${webview.cspSource} https://open.spotify.com https://spotify.com">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="${styleResetUri}" rel="stylesheet">
      <link href="${styleVSCodeUri}" rel="stylesheet">
      <link href="${styleMainUri}" rel="stylesheet">
      <title>K-Code</title>
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
      <div class="play-on-spotify-button-container">
        <a class="play-on-spotify-button" href="${SONG}" target="_blank">
          Play Random Song
        </a>
      </div>
      <script nonce="${nonce}" src="${scriptUri}"></script>
      </div>
    </body>
    </html>`;
  }
}

// this method is called when your extension is deactivated
export function deactivate() {}
