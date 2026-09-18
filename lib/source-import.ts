const allowedCloudHosts = [
  "drive.google.com",
  "drive.usercontent.google.com",
  "docs.google.com",
  "dropbox.com",
  "www.dropbox.com",
  "dl.dropboxusercontent.com",
  "storage.googleapis.com",
  "firebasestorage.googleapis.com",
];

function isPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}

export function assertPublicHttpsUrl(value: string | URL) {
  const url = value instanceof URL ? new URL(value) : new URL(value);
  if (url.protocol !== "https:" || isPrivateHostname(url.hostname))
    throw new Error("Link sumber harus menggunakan HTTPS publik");
  if (url.username || url.password)
    throw new Error("Link sumber tidak boleh berisi kredensial");
  return url;
}

export function importableVideoUrl(value: string) {
  const url = assertPublicHttpsUrl(value);

  if (url.hostname === "drive.google.com") {
    const fileId =
      url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ||
      url.searchParams.get("id");
    if (!fileId) throw new Error("Link Google Drive tidak dikenali");
    return {
      provider: "google-drive",
      url: new URL(
        `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`,
      ),
    };
  }

  if (url.hostname === "dropbox.com" || url.hostname === "www.dropbox.com") {
    url.hostname = "www.dropbox.com";
    url.searchParams.set("dl", "1");
    return { provider: "dropbox", url };
  }

  const knownCloud = allowedCloudHosts.includes(url.hostname.toLowerCase());
  const directVideo = /\.(mp4|mov|webm|m4v)(?:$|\?)/i.test(
    `${url.pathname}${url.search}`,
  );
  if (!knownCloud && !directVideo)
    throw new Error(
      "Gunakan link Google Drive, Dropbox, Firebase Storage, R2, atau file MP4/WebM langsung",
    );
  return { provider: knownCloud ? "cloud" : "direct-url", url };
}
