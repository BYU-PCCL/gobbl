/**
 * The Module Studio component registry: the building blocks an author can
 * place in a module. This is the one place to add a component.
 *
 * Plain data only. This file is imported by client pages, so it is sent to
 * the browser.
 */
export interface StudioComponentDef {
  /** Stored on each step as `type`. Never rename once drafts use it. */
  type: string;
  label: string;
  description: string;
  /** The `props` a new step of this type starts with. */
  defaultProps: Record<string, unknown>;
}

export const STUDIO_COMPONENTS: StudioComponentDef[] = [];

export function getStudioComponent(type: string): StudioComponentDef | undefined {
  return STUDIO_COMPONENTS.find((c) => c.type === type);
}
