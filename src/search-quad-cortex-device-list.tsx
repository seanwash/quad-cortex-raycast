import { ActionPanel, Action, List } from "@raycast/api";
import { useMemo, useState } from "react";
import devices from "../lib/devices.json";
import { DEVICE_LIST_URL } from "../lib/constants";

interface Device {
  category: string;
  name: string;
  basedOn?: string;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");

  // Filter and group devices based on search
  const groupedDevices = useMemo(() => {
    // Filter out announced devices that haven't been released
    const releasedDevices = (devices as Device[]).filter(
      (device) => device.category !== "Announced devices that have not yet been released",
    );

    const searchLower = searchText.toLowerCase();

    // Filter devices based on search text
    const filtered = releasedDevices.filter((device) => {
      if (!searchText) return true;
      return (
        device.name.toLowerCase().includes(searchLower) ||
        device.category.toLowerCase().includes(searchLower) ||
        (device.basedOn && device.basedOn.trim() && device.basedOn.toLowerCase().includes(searchLower))
      );
    });

    // Group filtered devices by category
    const grouped = filtered.reduce(
      (acc, device) => {
        if (!acc[device.category]) {
          acc[device.category] = [];
        }
        acc[device.category].push(device);
        return acc;
      },
      {} as Record<string, Device[]>,
    );

    return grouped;
  }, [searchText]);

  // Sort categories alphabetically
  const sortedCategories = Object.keys(groupedDevices).sort();

  return (
    <List searchBarPlaceholder="Search devices by name, category, or based on..." onSearchTextChange={setSearchText}>
      {sortedCategories.map((category) => (
        <List.Section key={category} title={category}>
          {groupedDevices[category].map((device, index) => (
            <List.Item
              key={`${category}-${device.name}-${index}`}
              title={device.name}
              subtitle={device.basedOn || ""}
              accessories={[{ text: category }]}
              actions={
                <ActionPanel>
                  {device.basedOn && device.basedOn.trim() && (
                    <Action.CopyToClipboard content={device.basedOn} title="Copy 'Based On' to Clipboard" />
                  )}
                  <Action.OpenInBrowser url={DEVICE_LIST_URL} title="Open Quad Cortex device list in browser" />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
