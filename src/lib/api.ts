declare const browser: any;

export const DEFAULT_API_URL = "";
const STORAGE_KEY = "flomox_api_url";
const THEME_STORAGE_KEY = "flomox_theme";

export type Theme = "light" | "dark" | "system";

export interface FlomoResponse {
  code: number;
  message: string;
}

export interface SendResult {
  success: boolean;
  message: string;
}

export async function getApiUrl(): Promise<string> {
  try {
    if (typeof browser !== "undefined" && browser.storage) {
      const result = await browser.storage.local.get(STORAGE_KEY);
      return result[STORAGE_KEY] || "";
    }
    // Fallback for development outside extension context (optional)
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch (error) {
    console.error("Error getting API URL:", error);
    return "";
  }
}

export async function setApiUrl(url: string): Promise<void> {
  try {
    if (typeof browser !== "undefined" && browser.storage) {
      await browser.storage.local.set({ [STORAGE_KEY]: url });
    } else {
      localStorage.setItem(STORAGE_KEY, url);
    }
  } catch (error) {
    console.error("Error setting API URL:", error);
  }
}

export async function getTheme(): Promise<Theme> {
  try {
    if (typeof browser !== "undefined" && browser.storage) {
      const result = await browser.storage.local.get(THEME_STORAGE_KEY);
      return (result[THEME_STORAGE_KEY] as Theme) || "system";
    }
    return (localStorage.getItem(THEME_STORAGE_KEY) as Theme) || "system";
  } catch (error) {
    console.error("Error getting theme:", error);
    return "system";
  }
}

export async function setTheme(theme: Theme): Promise<void> {
  try {
    if (typeof browser !== "undefined" && browser.storage) {
      await browser.storage.local.set({ [THEME_STORAGE_KEY]: theme });
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  } catch (error) {
    console.error("Error setting theme:", error);
  }
}

export interface Command {
  name: string;
  description: string;
  shortcut: string;
}

export async function getCommands(): Promise<Command[]> {
  try {
    if (typeof browser !== "undefined" && browser.commands) {
      return await browser.commands.getAll();
    }
    return [];
  } catch (error) {
    console.error("Error getting commands:", error);
    return [];
  }
}

export async function openShortcutsPage(): Promise<void> {
  try {
    if (typeof browser !== "undefined" && browser.tabs) {
      await browser.tabs.create({ url: "about:addons" });
    }
  } catch (error) {
    console.error("Error opening shortcuts page:", error);
  }
}

export async function updateCommandShortcut(
  name: string,
  shortcut: string,
): Promise<void> {
  try {
    if (typeof browser !== "undefined" && browser.commands) {
      await browser.commands.update({
        name: name,
        shortcut: shortcut,
      });
    }
  } catch (error) {
    console.error("Error updating command shortcut:", error);
    throw error;
  }
}

export async function sendToFlomo(content: string): Promise<SendResult> {
  const apiUrl = await getApiUrl();

  if (!apiUrl) {
    return { success: false, message: "No API URL configured" };
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      return { success: false, message: `HTTP Error: ${response.statusText}` };
    }

    const data: FlomoResponse = await response.json();
    return {
      success: data.code === 0, // Assuming 0 is success, but relying on message mostly? Usually code 0 is success.
      // Actually Flomo API returns code 0 for success and -1 for error usually.
      // But the requirement says "take message field as notification content".
      // So regardless of success/fail, we return the message.
      message: data.message,
    };
  } catch (error: any) {
    console.error("Error sending to Flomo:", error);
    return { success: false, message: error.message || "Network Error" };
  }
}
