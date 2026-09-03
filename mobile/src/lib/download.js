// Ported from frontend/src/lib/api.js's downloadFile(). The web version
// fetches a blob and clicks a synthetic <a download>; neither exists in
// RN, so this downloads to the cache directory (with the same Bearer
// auth header api.js attaches) via expo-file-system's legacy API, then
// hands it to the OS share sheet via expo-sharing — the closest native
// equivalent to "save this file somewhere."
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { BASE_URL, getToken } from "./api";

// Ported from Reports.jsx's client-side exportCsv() (Blob + URL.createObjectURL
// + synthetic <a download>, all web-only APIs) — writes the string straight
// to a cache file and shares it instead.
export async function writeAndShareText(content, filename) {
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri);
  }
  return fileUri;
}

export async function downloadAndShare(path, filename) {
  const token = await getToken();
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  const result = await FileSystem.downloadAsync(`${BASE_URL}${path}`, fileUri, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (result.status !== 200) {
    throw new Error(`Download failed (status ${result.status})`);
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri);
  }
  return result.uri;
}
