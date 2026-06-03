const FILEJOKER_URL = "https://filejoker.net/";
const DEFAULT_TIMEOUT_MS = 180000;

function assertAbsolutePath(filePath) {
  if (!filePath || !/^(?:[A-Za-z]:[\\/]|\/)/.test(filePath)) {
    throw new Error("Pass an absolute file path to uploadFileJoker().");
  }
}

async function readResult(page) {
  return page.evaluate(() => {
    const clean = (value) => (value || "").trim();
    const output = clean(document.querySelector("#out")?.value);
    const firstUrl = output.match(/https?:\/\/filejoker\.net\/[^\s\]]+/i)?.[0] || "";
    const heading = clean(document.body?.innerText || "").includes("Files Uploaded") ? "Files Uploaded" : "";

    return {
      plainText: firstUrl,
      fileUrl: firstUrl,
      output,
      heading,
      url: window.location.href,
    };
  });
}

async function waitForBbcode(page, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const started = Date.now();
  let lastResult = null;

  while (Date.now() - started < timeoutMs) {
    lastResult = await readResult(page);
    if (lastResult.bbcode) {
      return lastResult;
    }
    await page.waitForTimeout(1000);
  }

  throw new Error(`Timed out waiting for FileJoker BBCode. Last page state: ${JSON.stringify(lastResult)}`);
}

export async function uploadFileJoker({ browser, filePath, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  assertAbsolutePath(filePath);

  const tab = await browser.tabs.new();
  await tab.goto(FILEJOKER_URL);
  await tab.playwright.waitForLoadState({ state: "domcontentloaded", timeoutMs: 15000 }).catch(() => {});

  const page = tab.playwright;
  const fileInput = page.locator('#ff_file input[type="file"][name="file_1"]').first();
  await fileInput.waitFor({ state: "attached", timeoutMs: 15000 });

  const chooserPromise = page.waitForEvent("filechooser", { timeoutMs: 10000 });
  await fileInput.click({ timeoutMs: 10000 });
  const chooser = await chooserPromise;
  try {
    await chooser.setFiles([filePath]);
  } catch (error) {
    const message = String(error?.message || error);
    if (/not allowed|access|permission|file/i.test(message)) {
      throw new Error(
        'Chrome blocked file upload. Go to chrome://extensions, click Details under the Codex extension, and enable "Allow access to file URLs."',
      );
    }
    throw error;
  }

  const tos = page.locator('#ff_file input[name="tos"]').first();
  if (await tos.count()) {
    await tos.setChecked(true, { timeoutMs: 10000 });
  }

  const uploadButton = page.locator('#ff_file button[name="submit_btn"]').first();
  await uploadButton.click({ timeoutMs: 10000 });

  const result = await waitForBbcode(page, timeoutMs);
  return {
    ...result,
    tab,
  };
}

export async function parseCurrentFileJokerResult(tab) {
  const result = await readResult(tab.playwright);
  if (!result.plainText) {
    throw new Error("No FileJoker plain text link found on the current tab.");
  }
  return result;
}
