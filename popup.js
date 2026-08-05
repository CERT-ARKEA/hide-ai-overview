const enabledBox = document.getElementById("enabled");
const strictBox = document.getElementById("strict");

chrome.storage.sync.get({ enabled: true, strict: false }, (stored) => {
  enabledBox.checked = stored.enabled;
  strictBox.checked = stored.strict;
});

enabledBox.addEventListener("change", () => {
  chrome.storage.sync.set({ enabled: enabledBox.checked });
});

strictBox.addEventListener("change", () => {
  chrome.storage.sync.set({ strict: strictBox.checked });
});
