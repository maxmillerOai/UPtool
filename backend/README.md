# Upload tool prototype

This workspace currently contains the ImageTwist adapter prototype.

## Keep2Share API adapter

File: `keep2share-api-adapter.mjs`

Exports:

- `getKeep2ShareUploadFormData({ accessToken, authToken, parentId })`
- `loginKeep2Share({ username, password, recaptchaResponse })`
- `uploadKeep2Share({ accessToken, authToken, filePath, parentId })`
- `uploadFileBoom({ accessToken, authToken, filePath, parentId })`

Expected API flow:

1. Call `https://keep2share.cc/api/v2/getUploadFormData` with `access_token` or `auth_token`.
2. Multipart upload to the returned `form_action`.
3. Send the returned `file_field`, `ajax`, `signature`, and `params`.
4. Return the plain public link from the upload response.

Target output:

```text
https://k2s.cc/file/<id>
```

This adapter works with `accessToken`, `authToken`, or username/password fallback. Prefer a permanent/API token over username/password login, because login can require reCAPTCHA.

FileBoom uses the same API family. Use `uploadFileBoom(...)` or pass `provider: "fileboom"` to `uploadKeep2Share(...)`.

## Rapidgator API adapter

File: `rapidgator-api-adapter.mjs`

Exports:

- `loginRapidgator({ username, password, twoFactorCode })`
- `initRapidgatorUpload({ token, filePath, folderId })`
- `getRapidgatorUploadInfo({ token, uploadId })`
- `uploadRapidgator({ token, username, password, twoFactorCode, filePath, folderId })`

Expected API flow:

1. Login with `/user/login`, unless a token is already available.
2. Create upload session with `/file/upload`, passing filename, size, and MD5 hash.
3. Multipart upload to the returned upload URL with field `file`.
4. Poll `/file/upload_info`.
5. Return the plain Rapidgator public URL.

## PixHost API adapter

File: `pixhost-api-adapter.mjs`

Exports:

- `uploadPixHost({ filePath, contentType, maxThumbnailSize })`

Expected API flow:

1. Multipart upload to `https://api.pixhost.to/images`.
2. Send `img`, `content_type`, and `max_th_size=300`.
3. Read `show_url` and `th_url`.
4. Return forum thumbnail BBCode.

## FileJoker adapter

Files:

- `filejoker-adapter.mjs`
- `filejoker-http-adapter.mjs`

Exports:

- `uploadFileJoker({ browser, filePath, timeoutMs })`
- `parseCurrentFileJokerResult(tab)`

Expected flow:

1. Use an already logged-in Chrome session.
2. Open `https://filejoker.net/`.
3. Select the file input named `file_1` in form `#ff_file`.
4. Check the ToS checkbox.
5. Submit the upload form.
6. Extract the plain-text result from `#out`.

The desired FileJoker output is the plain link, not BBCode.

## ImageTwist adapter

File: `imagetwist-adapter.mjs`

Experimental direct HTTP file:

- `imagetwist-http-adapter.mjs`

Exports:

- `uploadImageTwist({ browser, filePath, timeoutMs })`
- `parseCurrentImageTwistResult(tab)`

Expected flow:

1. Use an already logged-in Chrome session.
2. Open `https://imagetwist.com/`.
3. Select the classic file upload input named `file_0`.
4. Set thumbnail size to `300x300`.
5. Submit the upload form.
6. Extract the forum code from `#tl1`, `input[id^="l1-"]`, or the visible `Thumbnail BBCode (Forums):` field.

## Chrome file upload permission

If file selection fails with a permission error, open `chrome://extensions`, click Details under the Codex extension, and enable `Allow access to file URLs`.

## Server

`server.mjs` exposes the JSON API consumed by the React frontend:

- `POST /api/process` — run a job (`sourcePath` or multipart `video`).
- `GET /api/progress?jobId=` — poll live progress events.
- `GET /api/settings` / `POST /api/settings` — load/save credentials + MTN config.

The pipeline shells out to MediaInfo and MTN (paths configured in `config.json`,
falling back to `config.example.json`). On Windows these are the bundled
`vendor/tools/*.exe`; on other platforms point them at local equivalents.
