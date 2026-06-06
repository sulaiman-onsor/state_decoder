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

function clearOutput() {
  const output = document.getElementById("output");
  output.className = "";
  output.innerHTML = "";
}

function setTextOutput(message, isError = false) {
  const output = document.getElementById("output");
  output.className = isError ? "error" : "muted";
  output.innerHTML = "";

  const pre = document.createElement("pre");
  pre.className = isError ? "plain error" : "plain";
  pre.textContent = message;
  output.appendChild(pre);
}

function renderValue(value) {
  if (value === null) return "null";
  if (Array.isArray(value) || typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function renderStatePanels(states) {
  const output = document.getElementById("output");
  output.className = "";
  output.innerHTML = "";

  states.forEach((state, index) => {
    const panel = document.createElement("details");
    panel.className = "panel";
    panel.open = index === 0;

    const title = document.createElement("summary");
    title.className = "panel-toggle";
    title.textContent = state && typeof state === "object" && state.id ? state.id : `state_${index + 1}`;

    const body = document.createElement("div");
    body.className = "panel-body";

    if (!state || typeof state !== "object") {
      const field = document.createElement("div");
      field.className = "field";

      const value = document.createElement("pre");
      value.className = "field-value";
      value.textContent = renderValue(state);

      field.appendChild(value);
      body.appendChild(field);
    } else {
      Object.entries(state).forEach(([key, value]) => {
        if (key === "id") {
          return;
        }

        const field = document.createElement("div");
        field.className = "field";

        const keyEl = document.createElement("div");
        keyEl.className = "field-key";
        keyEl.textContent = key;

        const valueEl = document.createElement("pre");
        valueEl.className = "field-value";
        valueEl.textContent = renderValue(value);

        field.appendChild(keyEl);
        field.appendChild(valueEl);
        body.appendChild(field);
      });
    }

    panel.appendChild(title);
    panel.appendChild(body);
    output.appendChild(panel);
  });
}

function renderDecodedData(decoded) {
  const trimmed = decoded.trim();
  if (!trimmed) {
    setTextOutput(decoded, false);
    return;
  }

  try {
    const parsed = JSON.parse(trimmed);

    if (Array.isArray(parsed)) {
      renderStatePanels(parsed);
      return;
    }

    if (parsed && typeof parsed === "object") {
      renderStatePanels([parsed]);
      return;
    }
  } catch {
    // Fall through to raw text rendering.
  }

  setTextOutput(formatDecodedValue(decoded), false);
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const activeTab = tabs[0];
  if (!activeTab || !activeTab.url) {
    setTextOutput("No active tab URL available.", true);
    return;
  }

  const url = new URL(activeTab.url);
  const isDashboardPath = DASHBOARD_PATH_REGEX.test(url.pathname);
  if (!isDashboardPath || !url.searchParams.has("state")) {
    setTextOutput("No dashboard detected", true);
    return;
  }

  const encodedValue = url.searchParams.get("state");
  if (!encodedValue) {
    setTextOutput("No dashboard detected", true);
    return;
  }

  const decoded = decodeBase64Value(encodedValue);
  if (decoded === null) {
    setTextOutput("The parameter could not be decoded as Base64.", true);
    return;
  }

  renderDecodedData(decoded);
});
