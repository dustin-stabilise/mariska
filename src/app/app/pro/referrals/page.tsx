import { requireRole } from "@/lib/auth-helpers";
import { PRICING, formatGBP } from "@/lib/pricing";
import { REFERRAL_KINDS } from "@/lib/professional-constants";
import { PageHeading, Card, EmptyState } from "@/components/ui";
import { StatusPill } from "@/components/pro/status-pill";
import { ReferralForm } from "./referral-form";

export const dynamic = "force-dynamic";

const REWARDS = [
  {
    kind: "carer",
    label: "Carer",
    amount: PRICING.referral.carer,
    blurb: "General home carers",
  },
  {
    kind: "specialist_carer",
    label: "Specialist carer",
    amount: PRICING.referral.specialistCarer,
    blurb: "Dementia, complex or end-of-life specialists",
  },
  {
    kind: "nurse",
    label: "Nurse",
    amount: PRICING.referral.nurse,
    blurb: "NMC-registered nurses",
  },
] as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function ProReferralsPage() {
  const { supabase, user } = await requireRole("professional");

  const [{ data: pro }, { data: rows }] = await Promise.all([
    supabase
      .from("professional_profiles")
      .select("status")
      .eq("id", user.id)
      .single(),
    supabase
      .from("referrals")
      .select("id, referred_email, kind, status, reward_amount, created_at")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const referrals = rows ?? [];
  const isActive = pro?.status === "active";
  const earned = referrals
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + (r.reward_amount ?? 0), 0);
  const kindLabels = Object.fromEntries(
    REFERRAL_KINDS.map((k) => [k.value, k.label])
  );

  return (
    <div>
      <PageHeading
        eyebrow="Professional"
        title="Refer & earn"
        intro="Know a great carer or nurse? Invite them. You're paid once they complete registration and their compliance checks."
        actions={
          earned > 0 ? (
            <span className="text-[15px] text-muted">
              Earned so far:{" "}
              <span className="font-serif text-xl text-ink">{formatGBP(earned)}</span>
            </span>
          ) : undefined
        }
      />

      {/* Reward explainer */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {REWARDS.map((r) => (
          <Card key={r.kind}>
            <div className="font-serif text-3xl text-green">
              {formatGBP(r.amount)}
            </div>
            <div className="text-[15px] font-semibold text-ink mt-1">{r.label}</div>
            <div className="text-[13.5px] text-muted mt-0.5">{r.blurb}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          {referrals.length === 0 ? (
            <EmptyState
              title="No referrals yet"
              body="Invite someone you've worked with and trust. We'll track their progress here, from invited, to registered, to compliant, to paid."
            />
          ) : (
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[14.5px]">
                  <thead>
                    <tr className="border-b border-hairline text-[12.5px] font-semibold uppercase tracking-wide text-faint">
                      <th className="px-5 py-3">Email</th>
                      <th className="px-5 py-3">Kind</th>
                      <th className="px-5 py-3">Invited</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Reward</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {referrals.map((r) => (
                      <tr key={r.id}>
                        <td className="px-5 py-3.5 text-ink font-medium">
                          {r.referred_email}
                        </td>
                        <td className="px-5 py-3.5 text-body whitespace-nowrap">
                          {kindLabels[r.kind] ?? r.kind}
                        </td>
                        <td className="px-5 py-3.5 text-body whitespace-nowrap">
                          {formatDate(r.created_at)}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusPill status={r.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          {r.status === "paid" && r.reward_amount !== null ? (
                            <span className="font-semibold text-green">
                              {formatGBP(r.reward_amount)}
                            </span>
                          ) : (
                            <span className="text-faint">–</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <ReferralForm disabled={!isActive} />
          {!isActive && (
            <Card className="bg-sage-light border-sage">
              <p className="text-[14px] text-body">
                Referrals unlock once your own profile is active, so finish
                your document checks and vetting interview first.
              </p>
            </Card>
          )}
          <p className="text-[13px] text-faint px-1">
            Rewards are paid once the person you refer completes registration
            and passes their compliance checks.
          </p>
        </div>
      </div>
    </div>
  );
}
