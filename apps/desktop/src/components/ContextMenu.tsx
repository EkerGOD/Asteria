import { useEffect, useRef } from "react";

export interface ContextMenuItem {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] rounded-md border border-stone-200 bg-white py-1 shadow-lg"
      style={{ left: x, top: y }}
      role="menu"
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          className={[
            "flex w-full items-center px-3 py-1.5 text-left text-xs",
            item.disabled
              ? "cursor-not-allowed text-stone-400"
              : "text-stone-700 hover:bg-stone-50",
          ].join(" ")}
          onClick={() => {
            if (!item.disabled && item.onClick) {
              item.onClick();
              onClose();
            }
          }}
          disabled={item.disabled}
          title={item.disabled ? item.disabledReason : undefined}
          role="menuitem"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
