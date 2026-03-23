"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { saveAiKey, removeAiKey, testAiKey } from "@/actions/ai-keys";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
  Key,
  Zap,
} from "lucide-react";

type ExistingKey = {
  id: string;
  provider: "anthropic" | "openai";
  apiKey: string;
  model: string | null;
  isActive: boolean;
} | null;

type Usage = {
  used: number;
  limit: number;
};

const ANTHROPIC_MODELS = ["claude-sonnet-4-20250514", "claude-haiku-4-5-20251001"];
const OPENAI_MODELS = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"];

function maskKey(key: string): string {
  if (key.length <= 10) return key.slice(0, 4) + "****";
  return key.slice(0, 10) + "****";
}

export function AiSettingsForm({
  existingKey,
  usage,
}: {
  existingKey: ExistingKey;
  usage: Usage;
}) {
  const [provider, setProvider] = useState<"anthropic" | "openai">(
    existingKey?.provider ?? "anthropic"
  );
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(existingKey?.model ?? "");
  const [showKey, setShowKey] = useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [isSaving, startSaveTransition] = useTransition();
  const [isRemoving, startRemoveTransition] = useTransition();
  const [isTesting, startTestTransition] = useTransition();

  const hasExistingKey = existingKey !== null;
  const modelSuggestions = provider === "anthropic" ? ANTHROPIC_MODELS : OPENAI_MODELS;

  function handleSave() {
    setMessage(null);
    const keyToSave = apiKey.trim() || (hasExistingKey ? existingKey.apiKey : "");
    if (!keyToSave) {
      setMessage({ type: "error", text: "API key is required" });
      return;
    }
    startSaveTransition(async () => {
      const result = await saveAiKey(provider, keyToSave, model || undefined);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "API key saved successfully." });
        setApiKey("");
      }
    });
  }

  function handleRemove() {
    setMessage(null);
    startRemoveTransition(async () => {
      const result = await removeAiKey();
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "API key removed. Using platform AI." });
        setApiKey("");
        setModel("");
      }
    });
  }

  function handleTest() {
    setMessage(null);
    const keyToTest = apiKey.trim() || (hasExistingKey ? existingKey.apiKey : "");
    if (!keyToTest) {
      setMessage({ type: "error", text: "Enter an API key first" });
      return;
    }
    startTestTransition(async () => {
      const result = await testAiKey(provider, keyToTest, model || undefined);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Connection successful! Key is valid." });
      }
    });
  }

  const usagePercent = hasExistingKey
    ? 0
    : Math.min(100, Math.round((usage.used / usage.limit) * 100));

  return (
    <div className="space-y-4">
      {/* Usage card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            AI Usage This Month
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasExistingKey ? (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Unlimited — using your own API key</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span>
                  {usage.used} / {usage.limit} operations used
                </span>
                <span className="text-muted-foreground">{usagePercent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* API Key card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Use your own API key
          </CardTitle>
          <CardDescription>
            Using your own key removes the monthly limit. Your key is stored securely and never shared.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <div
              className={`flex items-center gap-2 rounded-md p-3 text-sm ${
                message.type === "success"
                  ? "bg-green-500/10 text-green-700 dark:text-green-400"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              {message.text}
            </div>
          )}

          {/* Provider */}
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select
              value={provider}
              onValueChange={(val) => {
                if (val === "anthropic" || val === "openai") {
                  setProvider(val);
                  setModel("");
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="apiKey"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    hasExistingKey
                      ? maskKey(existingKey.apiKey)
                      : provider === "anthropic"
                        ? "sk-ant-..."
                        : "sk-..."
                  }
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Model override */}
          <div className="space-y-2">
            <Label htmlFor="model">Model (optional)</Label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={modelSuggestions[0]}
            />
            <p className="text-xs text-muted-foreground">
              Suggestions:{" "}
              {modelSuggestions.map((m, i) => (
                <span key={m}>
                  <button
                    type="button"
                    className="underline underline-offset-2 hover:text-foreground"
                    onClick={() => setModel(m)}
                  >
                    {m}
                  </button>
                  {i < modelSuggestions.length - 1 ? ", " : ""}
                </span>
              ))}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button
              type="button"
              onClick={handleTest}
              variant="outline"
              disabled={isTesting || isSaving}
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isTesting}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Key"
              )}
            </Button>
            {hasExistingKey && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleRemove}
                disabled={isRemoving || isSaving}
              >
                {isRemoving ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Remove Key
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Link to product settings */}
      <div className="text-center text-sm text-muted-foreground">
        Looking for product context?{" "}
        <Link
          href="/settings/product"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Configure product settings
        </Link>
      </div>
    </div>
  );
}
