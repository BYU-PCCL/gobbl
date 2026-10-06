import { EditorSkeleton } from "@/components/studio/EditorSkeleton";

export default function StudioEditorPage({ params }: { params: { id: string } }) {
  return <EditorSkeleton moduleId={params.id} />;
}
