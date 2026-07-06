import { requireRole } from "@/lib/auth-helpers";
import { buyCreditPack } from "@/lib/actions/marketplace";
import { PRICING, formatGBP } from "@/lib/pricing";
import { PageHeading, Card, Stat, EmptyState } from "@/components/ui";
import { Banner, formatDate, labelize } from "@/components/client/shared";

const BANNERS: Record<
  string,
  { tone: "success" | "warn" | "error"; text: string }
> = {
  "test-purchase": {
    tone: "success",
    text: "Credits added. Payment was completed via the test bypass.",
  },
  success: {
    tone: "success",
    text: "Payment received. Your credits have been added.",
  },
  cancelled: {
    tone: "warn",
    text: "Checkout was cancelled. You haven't been charged.",
  },
  insufficient: {
    tone: "error",
    text: "You don't have enough credits to unlock that profile. Top up below to continue.",
  },
};

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const banner =
    typeof sp.status === "string" ? BANNERS[sp.status] : undefined;

  const { supabase } = await requireRole("client");

  const [balanceRes, ledgerRes] = await Promise.all([
    supabase.rpc("my_credit_balance"),
    supabase
      .from("credit_ledger")
      .select("id, delta, reason, note, payment_id, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const balance = balanceRes.data ?? 0;
  const ledger = ledgerRes.data ?? [];

  // Tag entries funded by a test-bypass payment.
  const paymentIds = [
    ...new Set(ledger.map((l) => l.payment_id).filter((p): p is string => !!p)),
  ];
  const { data: payments } = paymentIds.length
    ? await supabase.from("payments").select("id, provider").in("id", paymentIds)
    : { data: [] };
  const testPaymentIds = new Set(
    (payments ?? []).filter((p) => p.provider === "test_bypass").map((p) => p.id)
  );

  return (
    <div>
      <PageHeading
        eyebrow="Credits"
        title="Profile unlock credits"
        intro="One credit unlocks one full profile for 30 days: bio, rates, compliance record and interview requests."
      />

      {banner && <Banner tone={banner.tone}>{banner.text}</Banner>}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <Stat
            label="Current balance"
            value={balance}
            hint={balance === 1 ? "credit remaining" : "credits remaining"}
          />
          <Card>
            <h2 className="font-serif text-xl text-ink">
              {PRICING.creditPack.label}
            </h2>
            <div className="font-serif text-3xl text-ink mt-2">
              {formatGBP(PRICING.creditPack.amount)}
            </div>
            <ul className="text-[14.5px] text-body mt-4 space-y-1.5">
              <li className="flex gap-2">
                <span className="text-green font-bold">✓</span>
                {PRICING.creditPack.credits} full-profile unlocks
              </li>
              <li className="flex gap-2">
                <span className="text-green font-bold">✓</span>
                Each unlock lasts {PRICING.unlockDurationDays} days
              </li>
              <li className="flex gap-2">
                <span className="text-green font-bold">✓</span>
                Credits never expire
              </li>
            </ul>
            <form action={buyCreditPack} className="mt-5">
              <button
                type="submit"
                className="w-full px-5 py-2.5 rounded-full font-semibold text-[15px] bg-green text-cream hover:bg-green-dark transition-colors"
              >
                Buy {PRICING.creditPack.credits} unlocks for{" "}
                {formatGBP(PRICING.creditPack.amount)}
              </button>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <h2 className="font-serif text-2xl text-ink mb-4">History</h2>
          {ledger.length === 0 ? (
            <EmptyState
              title="No credit activity yet"
              body="Purchases, retainer grants and unlocks will show here once you get started."
            />
          ) : (
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[14.5px]">
                  <thead>
                    <tr className="text-left text-[12.5px] uppercase tracking-wide text-faint border-b border-hairline">
                      <th className="px-6 py-3.5 font-semibold">Date</th>
                      <th className="px-6 py-3.5 font-semibold">Reason</th>
                      <th className="px-6 py-3.5 font-semibold text-right">
                        Credits
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b border-hairline last:border-0"
                      >
                        <td className="px-6 py-3.5 text-muted whitespace-nowrap">
                          {formatDate(entry.created_at)}
                        </td>
                        <td className="px-6 py-3.5 text-body">
                          {labelize(entry.reason)}
                          {entry.note && (
                            <span className="text-faint"> · {entry.note}</span>
                          )}
                          {entry.payment_id &&
                            testPaymentIds.has(entry.payment_id) && (
                              <span className="ml-2 inline-flex px-2 py-0.5 rounded-full bg-tan/30 text-[11.5px] font-semibold text-[#7a6a3d] uppercase tracking-wide">
                                Test transaction
                              </span>
                            )}
                        </td>
                        <td
                          className={`px-6 py-3.5 text-right font-semibold ${entry.delta > 0 ? "text-green" : "text-ink"}`}
                        >
                          {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
