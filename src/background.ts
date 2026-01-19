import { sendToFlomo, getApiUrl } from "./lib/api";

declare const browser: any;

// Create context menu item
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: "send-to-flomox",
    title: "Send to FlomoX",
    contexts: ["selection"],
  });
});

// Helper to show notification
function showNotification(title: string, message: string) {
  browser.notifications.create({
    type: "basic",
    iconUrl: browser.runtime.getURL("icons/icon.svg"),
    title: title,
    message: message,
  });
}

// Handle toolbar icon click to toggle sidebar
browser.action.onClicked.addListener(() => {
  browser.sidebarAction.toggle();
});

// Handle context menu click
browser.contextMenus.onClicked.addListener(async (info: any, tab: any) => {
  if (info.menuItemId === "send-to-flomox" && info.selectionText) {
    const apiUrl = await getApiUrl();
    if (!apiUrl) {
      showNotification(
        "FlomoX Error",
        "API URL not configured. Please open FlomoX sidebar settings.",
      );
      return;
    }

    const content = info.selectionText.trim();
    if (content) {
      // Optional: Add source URL
      const source = tab?.url ? `\n\nFrom: ${tab.url}` : "";
      const fullContent = `${content}${source}`;

      const result = await sendToFlomo(fullContent);

      showNotification(
        result.success ? "FlomoX Success" : "FlomoX Failed",
        result.message,
      );
    }
  }
});
