import { LijiApp } from "@/features/liji/liji-app";
import { demoWorkspace } from "@/lib/liji/sample-data";

export default function Home() {
  return <LijiApp initialData={demoWorkspace} />;
}
