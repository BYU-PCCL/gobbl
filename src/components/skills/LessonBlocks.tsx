export interface LessonBlock {
  heading: string;
  body: string;
}

/** The lesson's reading cards. Used by the content step and by the read-only "Read the lesson again" view. */
export function LessonBlocks({ blocks }: { blocks: LessonBlock[] }) {
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, i) => (
        <div key={i} className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="font-display text-base font-bold">{block.heading}</h2>
          <p className="mt-1.5 whitespace-pre-line font-body text-sm text-ink-soft">{block.body}</p>
        </div>
      ))}
    </div>
  );
}
