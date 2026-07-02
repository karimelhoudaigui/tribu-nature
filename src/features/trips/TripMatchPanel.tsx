import { AlertTriangle, BadgeCheck, Info } from "lucide-react";
import type { MatchResult } from "../../services/matchService";

export function TripMatchPanel({ tripMatch, groupMatch }: { tripMatch: MatchResult; groupMatch?: MatchResult | null }) {
  return (
    <section className="rounded-[1.5rem] bg-white p-5 shadow-soft sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="pill">Match personnalisé</p>
          <h2 className="mt-3 text-3xl font-semibold">{matchTitle(tripMatch)}</h2>
          <p className="mt-2 text-sm font-semibold text-forest-600">{confidenceLabel(tripMatch)} · {tripMatch.coverage}% des critères disponibles</p>
        </div>
        <div className="min-w-32 rounded-[1.25rem] bg-forest-900 px-6 py-4 text-center text-white">
          <span className="text-3xl font-semibold">{tripMatch.score == null ? "—" : `${tripMatch.score}%`}</span>
          <span className="mt-1 block text-xs font-semibold text-white/70">compatibilité Trip</span>
        </div>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-forest-100"><div className="h-full rounded-full bg-forest-800" style={{ width: `${tripMatch.coverage}%` }} /></div>

      {tripMatch.score == null ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl bg-skysoft p-4 font-semibold text-forest-800"><Info className="mt-0.5 shrink-0" size={18} /><span>Complète ton profil d'aventure pour obtenir un pourcentage précis. Le classement reste provisoire tant que moins de la moitié des critères sont disponibles.</span></div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ReasonList title="Pourquoi cette proposition ?" reasons={tripMatch.positiveReasons} positive />
          <ReasonList title="Points à vérifier" reasons={tripMatch.warningReasons.length ? tripMatch.warningReasons : ["Aucune incompatibilité importante détectée"]} />
        </div>
      )}

      {tripMatch.missingFields.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{tripMatch.missingFields.slice(0, 6).map((field) => <span className="pill text-xs" key={field}>À compléter : {field}</span>)}</div>}

      {groupMatch && groupMatch.coverage > 0 && (
        <div className="mt-6 border-t border-forest-100 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold text-forest-600">Compatibilité avec le groupe</p><h3 className="mt-1 text-xl font-semibold">{groupMatch.score == null ? "Groupe encore peu documenté" : `${groupMatch.score}% avec les membres actuels`}</h3></div><span className="pill text-xs">Couverture {groupMatch.coverage}%</span></div>
          {groupMatch.positiveReasons[0] && <p className="mt-3 text-sm font-semibold text-forest-700">{groupMatch.positiveReasons[0]}</p>}
        </div>
      )}
    </section>
  );
}

function ReasonList({ title, reasons, positive = false }: { title: string; reasons: string[]; positive?: boolean }) {
  return <div><h3 className="font-semibold">{title}</h3><div className="mt-3 grid gap-2">{reasons.slice(0, 4).map((reason) => <div className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${positive ? "bg-forest-50 text-forest-800" : "bg-amber-50 text-amber-900"}`} key={reason}>{positive ? <BadgeCheck className="mt-0.5 shrink-0" size={16} /> : <AlertTriangle className="mt-0.5 shrink-0" size={16} />}<span>{reason}</span></div>)}</div></div>;
}

function matchTitle(match: MatchResult) {
  if (match.score == null) return "Profil à compléter";
  return `${match.score}% compatible avec toi`;
}

function confidenceLabel(match: MatchResult) {
  if (match.confidence === "high") return "Confiance élevée";
  if (match.confidence === "medium") return "Confiance moyenne";
  return "Confiance faible";
}
