// src/components/InterruptorTema.jsx — Theme switcher component
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Tabs } from "@heroui/react";
import { Moon, Sun, Gear } from "@gravity-ui/icons";

const emptySubscribe = () => () => {};

export function InterruptorTema() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const { theme, setTheme } = useTheme();

  if (!mounted) {
    return null;
  }

  return (
    <Tabs selectedKey={theme} onSelectionChange={(key) => setTheme(key)}>
      <Tabs.ListContainer>
        <Tabs.List aria-label="Theme selection" className="*:px-2">
          <Tabs.Tab id="system">
            <Gear />
            <Tabs.Indicator />
          </Tabs.Tab>

          <Tabs.Tab id="light">
            <Sun />
            <Tabs.Indicator />
          </Tabs.Tab>

          <Tabs.Tab id="dark">
            <Moon />
            <Tabs.Indicator />
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>

      {/* We omit <Tabs.Panel> since the selection changes the global theme
          and does not need to render local content inside the switch */}
    </Tabs>
  );
}
