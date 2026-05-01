import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "./Icon";

type IconButtonSize = "xs" | "sm" | "md";

const sizeClassByName: Record<IconButtonSize, string> = {
  xs: "h-5 w-5",
  sm: "h-7 w-7",
  md: "h-8 w-8",
};

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: IconName;
  label: string;
  active?: boolean;
  size?: IconButtonSize;
  iconSize?: number;
};

export function IconButton({
  icon,
  label,
  active,
  size = "sm",
  iconSize,
  className,
  title,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-md transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/35 focus-visible:ring-offset-1",
        sizeClassByName[size],
        active
          ? "bg-pine/10 text-pine"
          : "text-stone-400 hover:bg-stone-100 hover:text-stone-600",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
      title={title ?? label}
      {...props}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  );
}
