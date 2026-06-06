const DASHBOARD_PATH_REGEX =
  /^\/dashboards\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/?$/;

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

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const activeTab = tabs[0];
  if (!activeTab || !activeTab.url) {
    setOutput("No active tab URL available.", true);
    return;
  }

  const url = new URL(activeTab.url);
  const isDashboardPath = DASHBOARD_PATH_REGEX.test(url.pathname);
  if (!isDashboardPath || !url.searchParams.has("state")) {
    setOutput("No dashboard detected", true);
    return;
  }

  const encodedValue = url.searchParams.get("state");
  if (!encodedValue) {
    setOutput("No dashboard detected", true);
    return;
  }

  const decoded = decodeBase64Value(encodedValue);
  if (decoded === null) {
    setOutput("The parameter could not be decoded as Base64.", true);
    return;
  }

  setOutput(formatDecodedValue(decoded), false);
});
