import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendToFlomo, getApiUrl, setApiUrl, DEFAULT_API_URL, getCommands, updateCommandShortcut, type Command } from "@/lib/api";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Settings,
  ChevronUp,
  Keyboard,
} from "lucide-react";

declare const browser: any;

function App() {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [showSettings, setShowSettings] = useState(false);
  const [apiUrl, setApiUrlState] = useState("");
  const [isApiLoading, setIsApiLoading] = useState(true);
  const [command, setCommand] = useState<Command | null>(null);
  const [shortcutInput, setShortcutInput] = useState("");

  const loadApiUrl = async () => {
    setIsApiLoading(true);
    const url = await getApiUrl();
    if (url) {
      setApiUrlState(url);
      setShowSettings(false);
    } else {
      setApiUrlState(DEFAULT_API_URL);
      setShowSettings(true);
    }
    const cmds = await getCommands();
    const sidebarCmd = cmds.find(c => c.name === "_execute_sidebar_action");
    if (sidebarCmd) {
      setCommand(sidebarCmd);
      setShortcutInput(sidebarCmd.shortcut || "");
    }
    setIsApiLoading(false);
  };

  const handleSaveSettings = async () => {
    if (!apiUrl.trim()) {
      showNotification("Configuration Error", "API URL cannot be empty");
      return;
    }

    const apiRegex = /^https:\/\/flomoapp\.com\/iwh\/[a-zA-Z0-9]+\/[a-zA-Z0-9]+\/?$/;
    if (!apiRegex.test(apiUrl.trim())) {
      showNotification("Configuration Error", "Invalid API URL format");
      return;
    }

    try {
      await setApiUrl(apiUrl);
      if (command && shortcutInput && shortcutInput !== command.shortcut) {
        await updateCommandShortcut(command.name, shortcutInput);
        // Refresh command info
        const cmds = await getCommands();
        const sidebarCmd = cmds.find(c => c.name === "_execute_sidebar_action");
        if (sidebarCmd) {
          setCommand(sidebarCmd);
        }
      }
      setShowSettings(false);
      showNotification("Success", "Configuration saved");
    } catch (error) {
      console.error("Save settings error:", error);
      showNotification("Configuration Error", "Failed to save settings");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Ignore modifier keys alone
    if (['Control', 'Shift', 'Alt', 'Meta', 'Command'].includes(e.key)) {
      return;
    }

    const keys = [];
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.metaKey) keys.push('Command');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');
    
    // Convert key to uppercase
    let key = e.key.toUpperCase();
    if (key === ' ') key = 'Space';
    
    keys.push(key);
    
    setShortcutInput(keys.join('+'));
  };

  const showNotification = (title: string, message: string) => {
    if (typeof browser !== "undefined" && browser.notifications) {
      browser.notifications.create({
        type: "basic",
        iconUrl: browser.runtime.getURL("icons/icon.svg"),
        title: title,
        message: message,
      });
    } else {
      console.log("Notification:", title, message);
    }
  };

  const handleSend = async () => {
    if (!content.trim()) return;

    // Check if API URL is saved
    const storedUrl = await getApiUrl();
    if (!storedUrl) {
      showNotification("Error", "请先配置 api");
      setShowSettings(true);
      return;
    }

    setStatus("loading");
    const result = await sendToFlomo(content);

    if (result.success) {
      setStatus("success");
      setContent("");
      setTimeout(() => setStatus("idle"), 2000);
      showNotification("FlomoX Success", result.message);
    } else {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
      showNotification("FlomoX Failed", result.message);
    }
  };

  useEffect(() => {
    // 异步加载 API URL，避免在 effect 中同步调用 setState
    (async () => {
      await loadApiUrl();
    })();
  }, []);

  if (isApiLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-background p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          <img src="/icons/flomo_logo.png" alt="FlomoX" className="w-6 h-6" />
          <h1 className="text-lg font-bold">FlomoX</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {showSettings && (
        <div className="p-3 bg-muted rounded-md space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="api-url" className="text-xs font-semibold">
              Flomo API URL
            </Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setShowSettings(false)}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
          <Input
            id="api-url"
            value={apiUrl}
            onChange={(e) => setApiUrlState(e.target.value)}
            placeholder="https://flomoapp.com/iwh/..."
            className="text-xs"
          />
          <div className="pt-2 border-t">
            <Label htmlFor="shortcut" className="text-xs font-semibold flex items-center gap-2 mb-2">
              <Keyboard className="h-3 w-3" />
              Toggle Sidebar Shortcut
            </Label>
            <Input
              id="shortcut"
              value={shortcutInput}
              onKeyDown={handleKeyDown}
              placeholder="Click and press shortcut..."
              className="text-xs font-mono"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Example: {navigator.platform.includes("Mac") ? "Command+Shift+Y" : "Ctrl+Shift+Y"}
            </p>
          </div>
          <Button size="sm" onClick={handleSaveSettings} className="w-full">
            Save Configuration
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2 flex-1">
        <Label htmlFor="note">New Note</Label>
        <Textarea
          id="note"
          placeholder="What's on your mind?"
          className="flex-1 resize-none min-h-[150px]"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleSend();
            }
          }}
        />
        <p className="text-xs text-muted-foreground">
          Press {navigator.platform.includes("Mac") ? "Cmd" : "Ctrl"} + Enter to
          send
        </p>
      </div>

      <Button
        onClick={handleSend}
        disabled={status === "loading" || !content.trim()}
        className="w-full"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : status === "success" ? (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Sent!
          </>
        ) : status === "error" ? (
          <>
            <XCircle className="mr-2 h-4 w-4" />
            Failed
          </>
        ) : (
          "Send to Flomo"
        )}
      </Button>
    </div>
  );
}

export default App;
