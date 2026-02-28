/**
 * Safari-safe clipboard write utility.
 *
 * On iOS Safari the Clipboard API requires the write to happen in the
 * *synchronous* call-stack of a user gesture. When we need to fetch data
 * (e.g. generate a share token via Firestore) before copying, the gesture
 * expires by the time the async work finishes.
 *
 * The fix: `ClipboardItem` accepts a **Promise<Blob>** as its value,
 * allowing the browser to "reserve" clipboard access during the gesture
 * while the actual content resolves asynchronously.
 */
export async function copyTextToClipboard(
  textOrPromise: string | Promise<string>,
): Promise<void> {
  if (typeof ClipboardItem !== 'undefined') {
    const blobPromise = Promise.resolve(textOrPromise).then(
      (text) => new Blob([text], { type: 'text/plain' }),
    );
    await navigator.clipboard.write([
      new ClipboardItem({ 'text/plain': blobPromise }),
    ]);
  } else {
    // Fallback for browsers without ClipboardItem support
    const text = await Promise.resolve(textOrPromise);
    await navigator.clipboard.writeText(text);
  }
}
