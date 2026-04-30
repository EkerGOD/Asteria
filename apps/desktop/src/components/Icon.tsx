import type { CSSProperties, HTMLAttributes } from "react";

const iconClassByName = {
  add: "codicon-add",
  archive: "codicon-archive",
  chat: "codicon-comment-discussion",
  check: "codicon-check",
  chevronDown: "codicon-chevron-down",
  chevronLeft: "codicon-chevron-left",
  chevronRight: "codicon-chevron-right",
  close: "codicon-close",
  command: "codicon-terminal-cmd",
  file: "codicon-file",
  fileAdd: "codicon-file-add",
  fileBrowser: "codicon-layout-sidebar-left",
  folder: "codicon-folder",
  folderOpened: "codicon-folder-opened",
  graph: "codicon-graph",
  knowledge: "codicon-book",
  outline: "codicon-list-tree",
  project: "codicon-project",
  references: "codicon-references",
  settings: "codicon-settings-gear",
  workspace: "codicon-layout-centered",
} as const;

export type IconName = keyof typeof iconClassByName;

type IconProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  name: IconName;
  size?: number;
};

export function Icon({
  name,
  className,
  size,
  style,
  "aria-hidden": ariaHidden = true,
  ...props
}: IconProps) {
  const mergedStyle: CSSProperties | undefined = size
    ? { ...style, fontSize: size }
    : style;

  return (
    <span
      aria-hidden={ariaHidden}
      className={["codicon", iconClassByName[name], className].filter(Boolean).join(" ")}
      style={mergedStyle}
      {...props}
    />
  );
}
