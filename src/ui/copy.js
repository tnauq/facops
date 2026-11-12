// The Copy button (spec section 10). Tries the clipboard API first. It must be started inside the
// click handler, because Safari only allows clipboard writes during a user gesture. If that fails,
// it falls back to a textarea: the caller shows the text there, selected, and we try the older
// copy command on it. The functions are passed in so this can be tested without a browser.

/**
 * Resolves to 'copied' (clipboard API), 'selected-copied' (fallback copy worked) or
 * 'selected' (the text is selected in the textarea for the player to copy by hand).
 */
export async function copyText(text, { clipboard, selectFallback }) {
  try {
    if (clipboard && typeof clipboard.writeText === 'function') {
      await clipboard.writeText(text);
      return 'copied';
    }
  } catch {
    // fall through to the textarea
  }
  return selectFallback(text) ? 'selected-copied' : 'selected';
}

/** Button label after a copy attempt. */
export function copyLabel(outcome) {
  return outcome === 'selected' ? 'Select and copy' : 'Copied';
}
