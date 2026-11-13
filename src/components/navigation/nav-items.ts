import {
  Activity,
  Guitar,
  Hand,
  LayoutDashboard,
  Mic2,
  Music2,
  Puzzle,
  Settings,
  Timer,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "train",
    label: "Train",
    items: [
      { href: "/app", label: "Dashboard", icon: LayoutDashboard, match: (p) => p === "/app" },
      { href: "/daily-puzzle", label: "Daily Puzzle", icon: Puzzle, match: (p) => p.startsWith("/daily-puzzle") },
      { href: "/tempo", label: "Tempo Training", icon: Timer, match: (p) => p.startsWith("/tempo") },
      { href: "/fingers", label: "Finger Training", icon: Hand, match: (p) => p.startsWith("/fingers") },
      { href: "/notes", label: "Note Recognition", icon: Music2, match: (p) => p.startsWith("/notes") },
      { href: "/fretboard", label: "Fretboard Learning", icon: Guitar, match: (p) => p.startsWith("/fretboard") },
      { href: "/voice", label: "Voice Training", icon: Mic2, match: (p) => p.startsWith("/voice") },
    ],
  },
  {
    id: "progress",
    label: "Progress",
    items: [
      { href: "/progress", label: "Statistics", icon: Activity, match: (p) => p.startsWith("/progress") },
      { href: "/settings", label: "Settings", icon: Settings, match: (p) => p.startsWith("/settings") },
    ],
  },
];

/** Flat list for mobile tabs and legacy consumers. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
