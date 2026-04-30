import { useState } from "react";
import { SettingsPage } from "../pages/SettingsPage";
import { DiagnosticsPage } from "../pages/DiagnosticsPage";
import { AppearancePage } from "../pages/AppearancePage";
import { ModelRolesPage } from "../pages/ModelRolesPage";
import type { ResolvedTheme, ThemePreference } from "../hooks/useThemePreference";
import { Icon } from "./Icon";

type SettingsTab = "providers" | "model-roles" | "appearance" | "diagnostics";

export function SettingsOverlay({
  themePreference,
  resolvedTheme,
  onThemePreferenceChange,
  onClose,
}: {
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  onThemePreferenceChange: (preference: ThemePreference) => void;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("providers");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-8">
      <div
        className="flex h-full max-h-[640px] w-full max-w-[720px] flex-col rounded-xl border border-stone-300 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-stone-200 px-6 py-4">
          <h2 className="flex-1 text-lg font-semibold">Settings</h2>
          <button
            type="button"
            className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            onClick={onClose}
            aria-label="Close settings"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Tabs + Content */}
        <div className="flex min-h-0 flex-1">
          {/* Tab sidebar */}
          <div className="flex w-44 shrink-0 flex-col border-r border-stone-200 px-2 py-3">
            <SettingsTabButton
              active={activeTab === "providers"}
              onClick={() => setActiveTab("providers")}
            >
              Providers
            </SettingsTabButton>
            <SettingsTabButton
              active={activeTab === "model-roles"}
              onClick={() => setActiveTab("model-roles")}
            >
              Model Roles
            </SettingsTabButton>
            <SettingsTabButton
              active={activeTab === "appearance"}
              onClick={() => setActiveTab("appearance")}
            >
              Appearance
            </SettingsTabButton>
            <SettingsTabButton
              active={activeTab === "diagnostics"}
              onClick={() => setActiveTab("diagnostics")}
            >
              Diagnostics
            </SettingsTabButton>
          </div>

          {/* Content area */}
          <div className="min-w-0 flex-1 overflow-auto px-6 py-4">
            {activeTab === "providers" && <SettingsPage />}
            {activeTab === "model-roles" && <ModelRolesPage />}
            {activeTab === "appearance" && (
              <AppearancePage
                preference={themePreference}
                resolvedTheme={resolvedTheme}
                onPreferenceChange={onThemePreferenceChange}
              />
            )}
            {activeTab === "diagnostics" && (
              <DiagnosticsPage onNavigateToSettings={() => setActiveTab("providers")} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={[
        "rounded-md px-3 py-1.5 text-left text-sm font-medium transition",
        active
          ? "bg-pine/10 text-pine"
          : "text-stone-600 hover:bg-stone-100"
      ].join(" ")}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
