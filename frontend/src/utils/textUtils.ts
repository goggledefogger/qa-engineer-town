export const unwrapMarkdown = (rawText: string | undefined | null): string => {
  if (!rawText) {
    return '';
  }
  // Attempt to strip ```markdown wrapper if present
  const unwrapped = rawText.replace(/^(\s*`{3}(markdown|\w+)?\n)?([\s\S]+?)(\n\s*`{3}\s*)?$/, '$3').trim();
  // If unwrapping results in an empty string (e.g. rawText was just the wrapper), return the original rawText.
  // Otherwise, return the unwrapped content.
  return unwrapped === '' && rawText.length > 0 ? rawText : unwrapped;
};
