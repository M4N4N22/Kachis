import type { Metadata } from "next";
import { WorkspaceView } from "@/components/workspace/workspace-view";

export const metadata: Metadata = {
  title: "Walkthrough",
};

export default function DemoPage() {
  return <WorkspaceView demo />;
}
