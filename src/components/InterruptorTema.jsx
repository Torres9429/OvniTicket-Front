// src/components/InterruptorTema.jsx
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

      {/* Omitimos <Tabs.Panel> ya que la selección cambia el tema global 
          y no necesita mostrar contenido local dentro del switch */}
    </Tabs>
  );
}
