import { useEffect, useState } from "react";
import type { ResolvedTheme, ThemePreference } from "../hooks/useThemePreference";
import { Panel } from "../components/Panel";

const options: Array<{
  value: ThemePreference;
  title: string;
  detail: string;
}> = [
  {
    value: "light",
    title: "Light",
    detail: "Use the light desktop theme.",
  },
  {
    value: "dark",
    title: "Dark",
    detail: "Use the dark desktop theme.",
  },
  {
    value: "system",
    title: "System",
    detail: "Follow the operating system appearance.",
  },
];

export function AppearancePage({
  preference,
  resolvedTheme,
  onPreferenceChange,
}: {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  onPreferenceChange: (preference: ThemePreference) => void;
}) {
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!savedMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setSavedMessage(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [savedMessage]);

  function selectPreference(nextPreference: ThemePreference) {
    onPreferenceChange(nextPreference);
    setSavedMessage("Theme preference saved locally.");
  }

  return (
    <div className="space-y-4">
      <Panel title="Appearance">
        <fieldset>
          <legend className="text-sm font-semibold text-stone-800">Theme</legend>
          <p className="mt-1 text-sm text-stone-600">
            Choose how Asteria should render on this device.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {options.map((option) => {
              const selected = option.value === preference;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={[
                    "rounded-lg border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/35",
                    selected
                      ? "border-pine bg-pine/10 text-pine"
                      : "border-stone-200 bg-white text-stone-700 hover:border-pine/50 hover:bg-stone-50",
                  ].join(" ")}
                  aria-pressed={selected}
                  onClick={() => selectPreference(option.value)}
                >
                  <span className="block text-sm font-semibold">{option.title}</span>
                  <span className="mt-1 block text-xs text-stone-500">{option.detail}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
            Current appearance:{" "}
            <span className="font-semibold text-stone-800">
              {preference === "system" ? `System (${resolvedTheme})` : resolvedTheme}
            </span>
          </div>

          {savedMessage ? (
            <p className="mt-3 rounded-lg border border-pine/20 bg-pine/10 px-4 py-3 text-sm text-pine">
              {savedMessage}
            </p>
          ) : null}
        </fieldset>
      </Panel>
    </div>
  );
}
