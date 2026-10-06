import { ModuleEditor } from "@/components/studio/ModuleEditor";

export default function StudioEditorPage({ params }: { params: { id: string } }) {
  return <ModuleEditor moduleId={params.id} />;
}
