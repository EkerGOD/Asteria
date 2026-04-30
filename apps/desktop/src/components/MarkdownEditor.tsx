import { useEffect, useRef } from "react";
import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";

interface MarkdownEditorProps {
  content: string;
  onContentChange?: (content: string) => void;
}

export function MarkdownEditor({ content, onContentChange }: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const onChangeRef = useRef(onContentChange);
  onChangeRef.current = onContentChange;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const crepe = new Crepe({
      root: container,
      defaultValue: content,
    });

    crepeRef.current = crepe;

    crepe.create().then(() => {
      crepe.on((listener) => {
        listener.markdownUpdated((_ctx, markdown) => {
          onChangeRef.current?.(markdown);
        });
      });
    });

    return () => {
      if (crepeRef.current) {
        crepeRef.current.destroy();
        crepeRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}
