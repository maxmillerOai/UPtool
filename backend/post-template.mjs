export function buildPost({
  title,
  date,
  imageBbcode,
  metadataLine,
  fileLinks,
}) {
  const lines = [
    title,
    "",
    date,
    "",
    imageBbcode,
    "",
    metadataLine,
    "",
  ];

  for (const link of fileLinks) {
    if (link) {
      lines.push(`[url]${link}[/url]`);
    }
  }

  return lines.join("\n").trimEnd();
}
