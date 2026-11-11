"use client";

import { TurkeyCharacter, type TurkeyCharacterProps } from "./TurkeyCharacter";
import type { TurkeyView } from "@/lib/flock/view";

type Passthrough = Pick<
  TurkeyCharacterProps,
  "size" | "reaction" | "onReactionEnd" | "onTap" | "className" | "animate" | "showShadow" | "flip" | "decorative" | "crop"
>;

export interface MyTurkeyProps extends Passthrough {
  /** One of the user's turkeys (or eggs). null while it loads: a plain egg is drawn. */
  turkey: TurkeyView | null;
  /**
   * Inside an activity (a conversation, a lesson, School) the turkey wears its outfit but the
   * background item is left out, so it stands in the scene instead of on a tile.
   */
  inScene?: boolean;
}

/** The one way to draw a turkey the user owns: its stage, mood, species colours and its own outfit. */
export function MyTurkey({ turkey, inScene = false, ...rest }: MyTurkeyProps) {
  if (!turkey) return <TurkeyCharacter stage={1} decorative animate={false} {...rest} />;
  return (
    <TurkeyCharacter
      stage={turkey.stage}
      mood={turkey.mood}
      skill={turkey.skill}
      equipped={turkey.equipped}
      showBackground={!inScene}
      label={turkey.name ?? (turkey.hatched ? undefined : "Your egg")}
      {...rest}
    />
  );
}
