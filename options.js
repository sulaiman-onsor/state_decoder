const DEFAULT_SETTINGS = {
  urlRegex: "^https?://.*$",
  paramName: "state"
};

function setStatus(message, isError = false) {
  const status = document.getElementById("status");
  status.textContent = message;
  status.style.color = isError ? "#b91c1c" : "#065f46";
}

function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    document.getElementById("urlRegex").value = settings.urlRegex || DEFAULT_SETTINGS.urlRegex;
    document.getElementById("paramName").value = settings.paramName || DEFAULT_SETTINGS.paramName;
  });
}

function saveSettings() {
  const urlRegex = document.getElementById("urlRegex").value.trim();
  const paramName = document.getElementById("paramName").value.trim();

  if (!urlRegex) {
    setStatus("URL regex cannot be empty.", true);
    return;
  }
  if (!paramName) {
    setStatus("Parameter name cannot be empty.", true);
    return;
  }

  try {
    new RegExp(urlRegex);
  } catch {
    setStatus("URL regex is invalid.", true);
    return;
  }

  chrome.storage.sync.set({ urlRegex, paramName }, () => {
    setStatus("Settings saved.");
  });
}

document.getElementById("save").addEventListener("click", saveSettings);
loadSettings();
