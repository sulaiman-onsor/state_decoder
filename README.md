# State Decoder Popup Extension

A Manifest V3 browser extension for Chrome and Microsoft Edge that:

- Checks whether the current page URL matches a configured regex
- Reads a Base64-encoded query parameter (default: `state`)
- Decodes it
- Shows the decoded value in the extension action popup
- Pretty-prints the decoded value when it is valid JSON

## Example URL

If the decoded text should be:

```
hello world
```

Then Base64 is:

```
aGVsbG8gd29ybGQ=
```

Example URL:

```
https://example.com/callback?state=aGVsbG8gd29ybGQ=
```

## Configure

1. Open extension options.
2. Set:
   - URL Regex (example: `^https?://example\\.com/callback.*$`)
   - Query Parameter Name (example: `state`)
3. Save.

## Install in Chrome (unpacked)

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder (`state_decoder`).

## Install in Edge (unpacked)

1. Open `edge://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder (`state_decoder`).

## Files

- `manifest.json`: extension manifest
- `popup.html`, `popup.js`: extension icon popup
- `options.html`, `options.js`: regex and parameter settings
