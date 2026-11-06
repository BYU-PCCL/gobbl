import type { ComponentType } from "react";
import type { ChatMsg } from "@/components/chat/ChatInterface";
import { DiscomfortButton } from "./DiscomfortButton";

/** What every practice addon receives from the module runner. */
export interface PracticeAddonProps {
  /** The `addonProps` object from the practice step in registry.ts (empty if none were given). */
  props: Record<string, unknown>;
  /** The conversation so far, updated as messages come in. */
  messages: ChatMsg[];
  /** Whatever this addon last passed to onChange (starts as initialValue). */
  value: unknown;
  /** Saves the addon's data. It's sent to the server when the conversation ends. */
  onChange: (value: unknown) => void;
}

export interface PracticeAddonDef {
  Component: ComponentType<PracticeAddonProps>;
  /** The value saved if the user never interacts with the addon. Defaults to null. */
  initialValue?: unknown;
}

/**
 * Components shown next to the chat during a practice step, keyed by the name a step uses
 * in registry.ts:
 *   { id: "practice", kind: "practice", ..., addon: "discomfort-button" }
 */
export const PRACTICE_ADDONS: Record<string, PracticeAddonDef> = {
  "discomfort-button": { Component: DiscomfortButton, initialValue: { count: 0, presses: [] } },
};
