import type { FingerId, FingerName, Hand, KeyMapping, Tier } from "@/types";
import { keyLabel } from "@/lib/utils";

export const FINGER_NAMES: FingerName[] = ["thumb", "index", "middle", "ring", "pinky"];
export const HANDS: Hand[] = ["left", "right"];

export const ALL_FINGERS: FingerId[] = HANDS.flatMap((h) => FINGER_NAMES.map((f) => `${h}-${f}` as FingerId));

export const FINGER_LABEL: Record<FingerName, string> = {
  thumb: "Thumb",
  index: "Index",
  middle: "Middle",
  ring: "Ring",
  pinky: "Pinky",
};

/**
 * Classical guitar right-hand fingering: P I M A.
 * Pinky is not a traditional PIMA letter — represented as C (chiquito / extension).
 */
export const PIMA_LABEL: Record<FingerName, string> = {
  thumb: "P",
  index: "I",
  middle: "M",
  ring: "A",
  pinky: "C",
};

export function parseFinger(id: FingerId): { hand: Hand; finger: FingerName } {
  const [hand, finger] = id.split("-") as [Hand, FingerName];
  return { hand, finger };
}

export function fingerDisplay(id: FingerId) {
  const { hand, finger } = parseFinger(id);
  return {
    hand,
    finger,
    handLabel: hand === "left" ? "Left hand" : "Right hand",
    handShort: hand === "left" ? "LEFT" : "RIGHT",
    fingerLabel: FINGER_LABEL[finger],
    pima: PIMA_LABEL[finger],
    title: `${hand === "left" ? "Left" : "Right"} · ${FINGER_LABEL[finger]} (${PIMA_LABEL[finger]})`,
  };
}

/** Keys that can map to more than one finger (Space → both thumbs). */
export function fingersForCode(mapping: KeyMapping, code: string): FingerId[] {
  return (Object.entries(mapping) as [FingerId, string][]).filter(([, c]) => c === code).map(([id]) => id);
}

export function shortcutFor(mapping: KeyMapping, id: FingerId) {
  return keyLabel(mapping[id]);
}

export type FingerMode = "individual" | "random" | "left" | "right" | "challenge";

export const FINGER_MODE_LABEL: Record<FingerMode, string> = {
  individual: "Individual",
  random: "Random",
  left: "Left hand",
  right: "Right hand",
  challenge: "Challenge",
};

export function poolForMode(mode: FingerMode, individual: FingerId): FingerId[] {
  switch (mode) {
    case "individual":
      return [individual];
    case "left":
      return ALL_FINGERS.filter((f) => f.startsWith("left-"));
    case "right":
      return ALL_FINGERS.filter((f) => f.startsWith("right-"));
    case "random":
    case "challenge":
      return ALL_FINGERS;
  }
}

/** Challenge windows shrink every 8 trials, floor at 550 ms. */
export function challengeWindow(baseMs: number, trialIndex: number) {
  const steps = Math.floor(trialIndex / 8);
  return Math.max(550, baseMs - steps * 120);
}

export const TIER_FINGER_WINDOW: Record<Tier, number> = {
  0: 1800,
  1: 1400,
  2: 1100,
  3: 850,
};

export interface FingerAssistConfig {
  showHands: boolean;
  showAnatomicalName: boolean;
  showPima: boolean;
  showKeyboardHint: boolean;
  highlightFinger: boolean;
}

/** Default visual assistance decreases with difficulty. User prefs can further hide hands. */
export function assistForTier(
  tier: Tier,
  prefs: { showFingerHands: boolean; showFingerAnatomicalNames: boolean },
): FingerAssistConfig {
  const base: Record<Tier, FingerAssistConfig> = {
    0: {
      showHands: true,
      showAnatomicalName: true,
      showPima: true,
      showKeyboardHint: true,
      highlightFinger: true,
    },
    1: {
      showHands: true,
      showAnatomicalName: false,
      showPima: true,
      showKeyboardHint: true,
      highlightFinger: true,
    },
    2: {
      showHands: false,
      showAnatomicalName: false,
      showPima: true,
      showKeyboardHint: true,
      highlightFinger: false,
    },
    3: {
      showHands: false,
      showAnatomicalName: false,
      showPima: true,
      showKeyboardHint: false,
      highlightFinger: false,
    },
  };
  const cfg = { ...base[tier] };
  if (!prefs.showFingerHands) cfg.showHands = false;
  if (prefs.showFingerAnatomicalNames) cfg.showAnatomicalName = true;
  return cfg;
}
