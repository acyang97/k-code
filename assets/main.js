//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
  // @ts-ignore
  const vscode = acquireVsCodeApi();
  const oldState = vscode.getState() || {
    images: [null, null, null],
  };

  const buttons = [
    {
      className: ".add-image-button-happy",
      sendToExtensionCommand: "openFileDialogHappy",
      getFromExtensionCommand: "fileDialogResultHappy",
    },
    {
      className: ".add-image-button-moody",
      sendToExtensionCommand: "openFileDialogMoody",
      getFromExtensionCommand: "fileDialogResultMoody",
    },
    {
      className: ".add-image-button-frustrated",
      sendToExtensionCommand: "openFileDialogFrustrated",
      getFromExtensionCommand: "fileDialogResultFrustrated",
    },
  ];

  buttons.forEach((button) => {
    // @ts-ignore
    document.querySelector(button.className).addEventListener("click", () => {
      // Send a message to the extension code to open the file dialog
      vscode.postMessage({ command: button.sendToExtensionCommand });
    });
    window.addEventListener("message", (event) => {
      const message = event.data;
      // Handle messages sent from the extension code
      if (message.command === button.getFromExtensionCommand) {
        const fileUri = message.fileUri;
        if (fileUri) {
          // Process the selected image file here
          console.log(fileUri);
        }
      }
    });
  });
  // // @ts-ignore
  // document.querySelector(".add-image-button").addEventListener("click", () => {
  //   // Send a message to the extension code to open the file dialog
  //   vscode.postMessage({ command: "openFileDialog" });
  // });

  // // Receive messages from the extension code
  // window.addEventListener("message", (event) => {
  //   const message = event.data;
  //   // Handle messages sent from the extension code
  //   if (message.command === "fileDialogResult") {
  //     const fileUri = message.fileUri;
  //     if (fileUri) {
  //       // Process the selected image file here
  //       console.log(fileUri);
  //     }
  //   }
  // });
})();
