const DASHBOARD_PATH_REGEX =
  /^\/dashboards\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/?$/;
const VIEW_MODE_KEY = "state_decoder_view_mode";
const VIEW_MODE_PANELS = "panels";
const VIEW_MODE_RAW = "raw";

const viewState = {
  mode: localStorage.getItem(VIEW_MODE_KEY) === VIEW_MODE_RAW ? VIEW_MODE_RAW : VIEW_MODE_PANELS,
  decoded: "",
  parsed: null,
  baseUrl: ""
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

function clearOutput() {
  const output = document.getElementById("output");
  output.className = "";
  output.innerHTML = "";
}

function setControlsVisible(visible) {
  const controls = document.getElementById("viewControls");
  controls.classList.toggle("hidden", !visible);
}

function syncViewButtons(canRenderPanels, canCopyRaw) {
  const panelsBtn = document.getElementById("panelsViewBtn");
  const rawBtn = document.getElementById("rawViewBtn");
  const copyBtn = document.getElementById("copyRawBtn");

  panelsBtn.disabled = !canRenderPanels;
  if (!canRenderPanels && viewState.mode === VIEW_MODE_PANELS) {
    viewState.mode = VIEW_MODE_RAW;
  }

  panelsBtn.classList.toggle("active", viewState.mode === VIEW_MODE_PANELS);
  rawBtn.classList.toggle("active", viewState.mode === VIEW_MODE_RAW);
  copyBtn.classList.toggle("hidden", !(viewState.mode === VIEW_MODE_RAW && canCopyRaw));
}

function getRawJsonText() {
  if (viewState.parsed !== null) {
    return JSON.stringify(viewState.parsed, null, 2);
  }
  return formatDecodedValue(viewState.decoded);
}

function persistViewMode() {
  localStorage.setItem(VIEW_MODE_KEY, viewState.mode);
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

function setRawOutput(rawText) {
  const output = document.getElementById("output");
  output.className = "";
  output.innerHTML = "";

  const pre = document.createElement("pre");
  pre.className = "plain";
  pre.textContent = rawText;
  output.appendChild(pre);
}

function renderValue(value) {
  if (value === null) return "null";
  if (Array.isArray(value) || typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function extractParamRow(paramKey, paramValue) {
  if (paramValue && typeof paramValue === "object" && !Array.isArray(paramValue)) {
    const entityId = paramValue.entityId && typeof paramValue.entityId === "object" ? paramValue.entityId : null;
    const rawType = entityId?.entityType || "";
    const linkType = rawType === "DEVICE" ? "devices" : rawType === "ASSET" ? "assets" : "";

    return {
      param: paramKey,
      name: paramValue.entityName || "",
      title: paramValue.entityLabel || "",
      type: linkType,
      id: entityId?.id || ""
    };
  }

  return {
    param: paramKey,
    name: String(paramValue ?? ""),
    title: "",
    type: "",
    id: ""
  };
}

function shortenId(id) {
  if (!id || id.length <= 12) {
    return id;
  }
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

function buildParamsTable(paramsValue, baseUrl) {
  const wrapper = document.createElement("div");
  wrapper.className = "field";

  const keyEl = document.createElement("div");
  keyEl.className = "field-key";
  keyEl.textContent = "params";

  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap";

  const table = document.createElement("table");
  table.className = "params-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Param", "Name/Value", "Title", "Type", "UUID"].forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");
  Object.entries(paramsValue || {}).forEach(([paramKey, paramValue]) => {
    const rowData = extractParamRow(paramKey, paramValue);
    const tr = document.createElement("tr");

    const paramTd = document.createElement("td");
    const paramStrong = document.createElement("strong");
    paramStrong.textContent = rowData.param;
    paramTd.appendChild(paramStrong);
    tr.appendChild(paramTd);

    const nameTd = document.createElement("td");
    nameTd.textContent = rowData.name;
    tr.appendChild(nameTd);

    const titleTd = document.createElement("td");
    titleTd.textContent = rowData.title;
    tr.appendChild(titleTd);

    const typeTd = document.createElement("td");
    typeTd.textContent = rowData.type;
    tr.appendChild(typeTd);

    const idTd = document.createElement("td");
    if (rowData.id && rowData.type && baseUrl) {
      const link = document.createElement("a");
      link.className = "id-link";
      link.href = `${baseUrl}/entities/${rowData.type}/${rowData.id}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = shortenId(rowData.id);
      idTd.appendChild(link);
    } else {
      idTd.textContent = shortenId(rowData.id);
    }
    tr.appendChild(idTd);

    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  wrapper.appendChild(keyEl);
  wrapper.appendChild(tableWrap);

  return wrapper;
}

function renderStatePanels(states, baseUrl) {
  const output = document.getElementById("output");
  output.className = "";
  output.innerHTML = "";

  [...states].reverse().forEach((state, index) => {
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

        if (key === "params" && value && typeof value === "object" && !Array.isArray(value)) {
          body.appendChild(buildParamsTable(value, baseUrl));
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

function renderDecodedData(decoded, baseUrl) {
  viewState.decoded = decoded;
  viewState.baseUrl = baseUrl;

  const trimmed = decoded.trim();
  if (!trimmed) {
    setControlsVisible(false);
    setTextOutput(decoded, false);
    return;
  }

  try {
    viewState.parsed = JSON.parse(trimmed);
  } catch {
    viewState.parsed = null;
  }

  const canRenderPanels =
    Array.isArray(viewState.parsed) || (viewState.parsed !== null && typeof viewState.parsed === "object");

  setControlsVisible(true);
  syncViewButtons(canRenderPanels, true);

  if (viewState.mode === VIEW_MODE_PANELS && canRenderPanels) {
    if (Array.isArray(viewState.parsed)) {
      renderStatePanels(viewState.parsed, baseUrl);
      return;
    }

    renderStatePanels([viewState.parsed], baseUrl);
    return;
  }

  setRawOutput(getRawJsonText());
}

function handleViewModeChange(mode) {
  viewState.mode = mode;
  persistViewMode();
  renderDecodedData(viewState.decoded, viewState.baseUrl);
}

function wireControls() {
  const panelsBtn = document.getElementById("panelsViewBtn");
  const rawBtn = document.getElementById("rawViewBtn");
  const copyBtn = document.getElementById("copyRawBtn");

  panelsBtn.addEventListener("click", () => {
    handleViewModeChange(VIEW_MODE_PANELS);
  });

  rawBtn.addEventListener("click", () => {
    handleViewModeChange(VIEW_MODE_RAW);
  });

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(getRawJsonText());
      copyBtn.textContent = "Copied";
      setTimeout(() => {
        copyBtn.textContent = "Copy Raw JSON";
      }, 1200);
    } catch {
      copyBtn.textContent = "Copy failed";
      setTimeout(() => {
        copyBtn.textContent = "Copy Raw JSON";
      }, 1200);
    }
  });
}

wireControls();

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const activeTab = tabs[0];
  if (!activeTab || !activeTab.url) {
    setControlsVisible(false);
    setTextOutput("No active tab URL available.", true);
    return;
  }

  const url = new URL(activeTab.url);
  const isDashboardPath = DASHBOARD_PATH_REGEX.test(url.pathname);
  if (!isDashboardPath || !url.searchParams.has("state")) {
    setControlsVisible(false);
    setTextOutput("No dashboard detected", true);
    return;
  }

  const encodedValue = url.searchParams.get("state");
  if (!encodedValue) {
    setControlsVisible(false);
    setTextOutput("No dashboard detected", true);
    return;
  }

  const decoded = decodeBase64Value(encodedValue);
  if (decoded === null) {
    setControlsVisible(false);
    setTextOutput("The parameter could not be decoded as Base64.", true);
    return;
  }

  renderDecodedData(decoded, url.origin);
});
