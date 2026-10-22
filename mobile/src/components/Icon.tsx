import React from "react";
import Svg, { Path, Circle } from "react-native-svg";
export type IconName =
  | "settings"
  | "menu"
  | "save"
  | "spin"
  | "edit"
  | "chevron"
  | "close"
  | "check"
  | "info"
  | "download"
  | "upload"
  | "history"
  | "plus"
  | "trash"
  | "up"
  | "down";
const paths: Partial<Record<IconName, string>> = {
  menu: "M4 6h16M4 12h16M4 18h16",
  save: "M5 3h12l4 4v14H3V3h2zm2 0v7h10V3M7 21v-7h10v7",
  spin: "M20 4v6h-6M20 10a8 8 0 1 0 .1 5",
  edit: "m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 15z",
  chevron: "m9 5 7 7-7 7",
  close: "m6 6 12 12M6 18 18 6",
  check: "m5 12 4 4L19 6",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  upload: "M12 16V4m-5 5 5-5 5 5M4 17v4h16v-4",
  history: "M3 4v6h6M3 10a9 9 0 1 1 1 8M12 7v6l4 2",
  plus: "M12 4v16M4 12h16",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
  up: "m6 15 6-6 6 6",
  down: "m6 9 6 6 6-6",
  settings: "M9 3h6l1 4 4 1v7l-4 1-1 5H9l-1-5-5-1V8l5-1z",
};
export function Icon({
  name,
  size = 22,
  color = "#6450D9",
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === "info" ? (
        <>
          <Circle cx="12" cy="12" r="9" />
          <Path d="M12 11v6M12 7v.2" />
        </>
      ) : (
        <Path d={paths[name]} />
      )}
      {name === "settings" && <Circle cx="12" cy="12" r="3" />}
    </Svg>
  );
}
