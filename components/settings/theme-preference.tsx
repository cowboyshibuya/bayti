"use client";

import { useId, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

const themes = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function ThemePreference() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const id = useId();
  const selectedTheme = mounted ? theme ?? "system" : "system";

  return (
    <fieldset aria-describedby={`${id}-description`}>
      <legend className="text-sm font-medium">Theme</legend>
      <p id={`${id}-description`} className="mt-1 text-sm text-muted-foreground">
        System follows your device’s appearance. Your choice is saved on this device.
      </p>
      <div className="mt-4 grid max-w-sm grid-cols-3 gap-2">
        {themes.map(({ value, label, icon: Icon }) => (
          <label key={value} className="relative cursor-pointer">
            <input
              type="radio"
              name={`${id}-theme`}
              value={value}
              checked={selectedTheme === value}
              disabled={!mounted}
              onChange={() => setTheme(value)}
              className="peer sr-only"
            />
            <span className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:bg-muted peer-checked:border-foreground/30 peer-checked:bg-muted peer-checked:font-semibold peer-checked:text-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
              <Icon className="size-4" />
              {label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
