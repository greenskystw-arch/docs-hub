"use client";

import { useOptimistic, useTransition } from "react";
import { setTheme } from "@/lib/actions";
import { THEMES, type ThemeId } from "@/lib/themes";

export function ThemePicker({ current }: { current: ThemeId }) {
  const [, startTransition] = useTransition();
  const [theme, setOptimistic] = useOptimistic(current);

  return (
    <div className="themes">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          className={theme === t.id ? "on" : undefined}
          onClick={() => {
            document.documentElement.dataset.theme = t.id;
            startTransition(async () => {
              setOptimistic(t.id);
              await setTheme(t.id);
            });
          }}
        >
          <i style={{ background: t.swatch }} />
          {t.name}
        </button>
      ))}
    </div>
  );
}
