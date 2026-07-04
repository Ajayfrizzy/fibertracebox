import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Diagnosis } from "@/lib/types/domain";

export function DiagnosisCard({ diagnosis }: { diagnosis?: Diagnosis }) {
  if (!diagnosis) {
    return (
      <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="text-ckb" size={20} />
          <h2 className="text-lg font-semibold text-ink">No Failure Diagnosis</h2>
        </div>
        <p className="mt-3 text-sm text-gray-600">This trace completed successfully, so no failure fingerprint was produced.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-red-50 text-red-700">
          <AlertTriangle size={20} />
        </span>
        <div>
          <p className="mono text-xs font-semibold uppercase text-signal">{diagnosis.fingerprint}</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">{diagnosis.title}</h2>
          <p className="mt-2 text-sm leading-6 text-gray-700">{diagnosis.explanation}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold uppercase text-gray-500">Likely Causes</h3>
          <ul className="mt-2 space-y-2 text-sm text-gray-700">
            {diagnosis.likelyCauses.map((cause) => (
              <li key={cause} className="rounded-md bg-panel px-3 py-2">
                {cause}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase text-gray-500">Suggested Fixes</h3>
          <ul className="mt-2 space-y-2 text-sm text-gray-700">
            {diagnosis.suggestedFixes.map((fix) => (
              <li key={fix} className="rounded-md bg-panel px-3 py-2">
                {fix}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
