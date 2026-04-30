import { useState } from "react";
import { Panel } from "../components/Panel";
import { useSavedMessage } from "../hooks/useSavedMessage";
import {
  type MessageDisplayConfig,
  readMessageDisplayConfig,
  saveMessageDisplayConfig,
} from "../store/messageDisplay";

type ToggleOption = {
  key: keyof MessageDisplayConfig;
  label: string;
  description: string;
};

const options: ToggleOption[] = [
  {
    key: "show_model_name",
    label: "Model name",
    description: "Show which AI model generated the reply.",
  },
  {
    key: "show_timestamp",
    label: "Timestamp",
    description: "Show when the message was sent.",
  },
  {
    key: "show_token_count",
    label: "Token count",
    description: "Show token usage for the reply.",
  },
  {
    key: "show_response_delay",
    label: "Response delay",
    description: "Show how long the provider took to respond.",
  },
];

export function MessageDisplayPage() {
  const [config, setConfig] = useState<MessageDisplayConfig>(readMessageDisplayConfig);
  const { savedMessage, setSavedMessage } = useSavedMessage();

  function toggle(key: keyof MessageDisplayConfig) {
    const next = { ...config, [key]: !config[key] };
    setConfig(next);
    saveMessageDisplayConfig(next);
    setSavedMessage("Display preferences saved.");
  }

  return (
    <div className="space-y-4">
      <Panel title="Message Display">
        <fieldset>
          <legend className="text-sm font-semibold text-stone-800">
            Show metadata below AI replies
          </legend>
          <p className="mt-1 text-sm text-stone-600">
            Choose which information to display below each assistant message.
          </p>

          <div className="mt-4 space-y-2">
            {options.map((option) => {
              const checked = config[option.key];
              return (
                <label
                  key={option.key}
                  className={[
                    "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition",
                    checked
                      ? "border-pine/50 bg-pine/5"
                      : "border-stone-200 bg-white hover:border-stone-300",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-stone-300 text-pine focus:ring-pine"
                    checked={checked}
                    onChange={() => toggle(option.key)}
                  />
                  <div className="min-w-0">
                    <span className="block text-sm font-medium text-stone-800">
                      {option.label}
                    </span>
                    <span className="block text-xs text-stone-500">
                      {option.description}
                    </span>
                  </div>
                </label>
              );
            })}
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
