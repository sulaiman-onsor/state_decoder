const DEFAULT_SETTINGS = {
  urlRegex: "^https?://.*$",
  paramName: "state"
};

function decodeBase64Value(input) {
  if (!input) return null;

  let urlDecoded;
  try {
    urlDecoded = decodeURIComponent(input);
  } catch {
    urlDecoded = input;
  }

  const normalized = urlDecoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

  try {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function formatDecodedValue(value) {
  const trimmed = value.trim();
  if (!trimmed) return value;

  try {
    const parsed = JSON.parse(trimmed);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}

function setOutput(message, isError = false) {
  const output = document.getElementById("output");
  output.textContent = message;
  output.className = isError ? "error" : "";
}

chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (!activeTab || !activeTab.url) {
      setOutput("No active tab URL available.", true);
      return;
    }

    let regex;
    try {
      regex = new RegExp(settings.urlRegex || DEFAULT_SETTINGS.urlRegex);
    } catch {
      setOutput("Saved URL regex is invalid. Fix it in extension options.", true);
      return;
    }

    if (!regex.test(activeTab.url)) {
      setOutput("Current page does not match the configured URL regex.", true);
      return;
    }

    const url = new URL(activeTab.url);
    const encodedValue = url.searchParams.get(settings.paramName || DEFAULT_SETTINGS.paramName);
    if (!encodedValue) {
      setOutput(`No query parameter named \"${settings.paramName}\" was found.`, true);
      return;
    }

    const decoded = decodeBase64Value(encodedValue);
    if (decoded === null) {
      setOutput("The parameter could not be decoded as Base64.", true);
      return;
    }

    setOutput(formatDecodedValue(decoded), false);
  });
});
