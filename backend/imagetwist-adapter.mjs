const IMAGE_TWIST_URL = "https://imagetwist.com/";
const DEFAULT_TIMEOUT_MS = 120000;

function assertAbsolutePath(filePath) {
  if (!filePath || !/^(?:[A-Za-z]:[\\/]|\/)/.test(filePath)) {
    throw new Error("Pass an absolute file path to uploadImageTwist().");
  }
}

async function readResult(page) {
  return page.evaluate(() => {
    const clean = (value) => (value || "").trim();

    const aggregateBbcode = clean(document.querySelector("#tl1")?.value);
    const firstFileBbcode = clean(document.querySelector('input[id^="l1-"]')?.value);

    let labelBbcode = "";
    const labelNode = Array.from(document.querySelectorAll("body *")).find((node) => {
      return clean(node.textContent) === "Thumbnail BBCode (Forums):";
    });
    if (labelNode) {
      const candidates = [];
      let current = labelNode;
      for (let i = 0; current && i < 6; i += 1) {
        candidates.push(...Array.from(current.querySelectorAll?.("input,textarea") || []));
        current = current.nextElementSibling;
      }
      labelBbcode = clean(candidates.find((field) => /\[URL=.*\[IMG\]/i.test(field.value))?.value);
    }

    const bbcode = aggregateBbcode || firstFileBbcode || labelBbcode;
    const shareUrl = clean(document.querySelector("#tl0")?.value)
      || clean(document.querySelector('input[id^="l0-"]')?.value);
    const html = clean(document.querySelector("#tl2")?.value)
      || clean(document.querySelector('input[id^="l2-"]')?.value);

    return {
      bbcode,
      shareUrl,
      html,
      heading: clean(document.body?.innerText || "").includes("FILES UPLOADED") ? "FILES UPLOADED" : "",
      url: window.location.href,
    };
  });
}

async function waitForForumBbcode(page, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const started = Date.now();
  let lastResult = null;

  while (Date.now() - started < timeoutMs) {
    lastResult = await readResult(page);
    if (lastResult.bbcode) {
      return lastResult;
    }
    await page.waitForTimeout(1000);
  }

  throw new Error(`Timed out waiting for ImageTwist BBCode. Last page state: ${JSON.stringify(lastResult)}`);
}

export async function uploadImageTwist({ browser, filePath, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  assertAbsolutePath(filePath);

  const tab = await browser.tabs.new();
  await tab.goto(IMAGE_TWIST_URL);
  await tab.playwright.waitForLoadState({ state: "domcontentloaded", timeoutMs: 15000 }).catch(() => {});

  const page = tab.playwright;
  const singleUploadToggle = page.locator("#r_file").first();
  if (await singleUploadToggle.count()) {
    await singleUploadToggle.click({ timeoutMs: 10000 });
    await page.waitForTimeout(300);
  }

  const fileInput = page.locator('form input[type="file"][name="file_0"]').first();
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

  const thumbSize = page.locator('form:has(input[name="file_0"]) select[name="thumb_size"]').first();
  if (await thumbSize.count()) {
    await thumbSize.selectOption("300x300", { timeoutMs: 10000 });
  }

  const uploadButton = page.locator('form:has(input[name="file_0"]) input[type="submit"][name="submit_btn"]').first();
  await uploadButton.click({ timeoutMs: 10000 });

  const result = await waitForForumBbcode(page, timeoutMs);
  return {
    ...result,
    tab,
  };
}

export async function parseCurrentImageTwistResult(tab) {
  const result = await readResult(tab.playwright);
  if (!result.bbcode) {
    throw new Error("No ImageTwist forum BBCode found on the current tab.");
  }
  return result;
}
