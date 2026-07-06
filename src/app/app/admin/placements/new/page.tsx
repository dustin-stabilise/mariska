import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { PRICING, formatGBP } from "@/lib/pricing";
import { PageHeading, Card, Button } from "@/components/ui";
import { recordPlacementForm } from "@/lib/actions/admin";
import { fullName, nameMap } from "@/lib/admin/helpers";

const selectClass =
  "w-full border border-hairline-strong rounded-xl px-3.5 py-2.5 text-[15px] bg-card text-ink";

export default async function AdminNewPlacementPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; pro?: string; interview?: string }>;
}) {
  const { supabase } = await requireRole("admin");
  const { client, pro, interview } = await searchParams;

  const [{ data: clientRows }, { data: proRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("role", "client")
      .order("first_name"),
    supabase
      .from("professional_profiles")
      .select("id, kind, location")
      .eq("status", "active"),
  ]);
  const clients = clientRows ?? [];
  const pros = proRows ?? [];

  const proNameRows = pros.length
    ? (
        await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in(
            "id",
            pros.map((p) => p.id)
          )
      ).data
    : [];
  const proNames = nameMap(proNameRows);
  const sortedPros = [...pros].sort((a, b) =>
    (proNames.get(a.id) ?? "").localeCompare(proNames.get(b.id) ?? "")
  );

  const selectedPro = pros.find((p) => p.id === pro);

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/app/admin/placements"
          className="text-[14px] font-semibold text-green hover:text-green-dark"
        >
          &larr; All placements
        </Link>
      </div>

      <PageHeading
        eyebrow="Agency admin"
        title="Record a placement"
        intro="Logs the introduction fee as a manual payment and opens an active placement."
      />

      <Card className="max-w-xl">
        <form action={recordPlacementForm} className="space-y-5">
          <div>
            <label className="block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5">
              Client
            </label>
            <select name="clientId" defaultValue={client ?? ""} required className={selectClass}>
              <option value="" disabled>
                Choose a client…
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {fullName(c)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5">
              Professional (active only)
            </label>
            <select
              name="professionalId"
              defaultValue={selectedPro ? selectedPro.id : ""}
              required
              className={selectClass}
            >
              <option value="" disabled>
                Choose a professional…
              </option>
              {sortedPros.map((p) => (
                <option key={p.id} value={p.id}>
                  {proNames.get(p.id) ?? "Unknown"} — {p.kind}
                  {p.location ? ` (${p.location})` : ""} ·{" "}
                  {formatGBP(PRICING.placement[p.kind].amount)}
                </option>
              ))}
            </select>
          </div>

          {interview && <input type="hidden" name="interviewId" value={interview} />}

          <div className="bg-sand/60 border border-hairline rounded-xl px-4 py-3 text-[14px] text-body">
            {selectedPro ? (
              <>
                Introduction fee:{" "}
                <strong className="text-ink">
                  {formatGBP(PRICING.placement[selectedPro.kind].amount)}
                </strong>{" "}
                ({PRICING.placement[selectedPro.kind].label.toLowerCase()})
              </>
            ) : (
              <>
                The fee follows the professional&rsquo;s kind:{" "}
                <strong className="text-ink">
                  {formatGBP(PRICING.placement.carer.amount)}
                </strong>{" "}
                for carers,{" "}
                <strong className="text-ink">
                  {formatGBP(PRICING.placement.nurse.amount)}
                </strong>{" "}
                for nurses.
              </>
            )}
            {interview && (
              <span className="block text-[13px] text-muted mt-1">
                This placement will be linked to the completed interview.
              </span>
            )}
          </div>

          <Button type="submit">Record placement</Button>
        </form>
      </Card>
    </div>
  );
}
