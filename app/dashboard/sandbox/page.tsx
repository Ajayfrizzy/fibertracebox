import { ScenarioRunner } from "@/components/sandbox/scenario-runner";
import { scenarios } from "@/lib/core/scenarios";

export default function SandboxPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <ScenarioRunner scenarios={scenarios} />
    </div>
  );
}
