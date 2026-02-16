// Simple browser fingerprint generator
// Combines multiple browser properties to create a unique-ish device ID
export const getDeviceFingerprint = (): string => {
  const canvas = (() => {
    try {
      const c = document.createElement("canvas");
      const ctx = c.getContext("2d");
      if (!ctx) return "";
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillText("fingerprint", 2, 2);
      return c.toDataURL();
    } catch {
      return "";
    }
  })();

  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || "",
    canvas.slice(-50), // last 50 chars of canvas data
  ].join("|");

  // Simple hash
  let hash = 0;
  for (let i = 0; i < components.length; i++) {
    const char = components.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return "fp_" + Math.abs(hash).toString(36);
};
