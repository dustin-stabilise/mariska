import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { subscribeRetainer } from "@/lib/actions/marketplace";
import { PRICING, formatGBP } from "@/lib/pricing";
import { PageHeading, Card } from "@/components/ui";
import { Banner, formatDate } from "@/components/client/shared";

const BANNERS: Record<
  string,
  { tone: "success" | "warn"; text: string }
> = {
  "test-subscribed": {
    tone: "success",
    text: "Retainer activated — payment was completed via the test bypass.",
  },
  success: {
    tone: "success",
    text: "Payment received — your retainer is now active.",
  },
  cancelled: {
    tone: "warn",
    text: "Checkout was cancelled — you haven't been charged and no retainer was started.",
  },
};

const BENEFITS = [
  {
    title: `${PRICING.retainer.includedCredits} extra profile unlocks every month`,
    detail: "Credits are added to your balance automatically each billing cycle.",
  },
  {
    title: "Free replacement search",
    detail:
      "If a placement doesn't work out, we re-run the search for you at no extra cost.",
  },
  {
    title: "Priority support",
    detail:
      "Jump the queue — a dedicated coordinator answers your questions first.",
  },
  {
    title: "Ongoing care reviews",
    detail:
      "We check in on how the placement is going and help you adjust as needs change.",
  },
];

export default async function RetainerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const banner =
    typeof sp.status === "string" ? BANNERS[sp.status] : undefined;

  const { supabase } = await requireRole("client");

  const { data: subscription } = await supabase
    .from("retainer_subscriptions")
    .select("status, current_period_end, created_at, cancelled_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const isActive =
    subscription?.status === "active" || subscription?.status === "past_due";

  return (
    <div>
      <PageHeading
        eyebrow="Ongoing support"
        title="Support retainer"
        intro={`Continuous support for your care arrangement — ${formatGBP(PRICING.retainer.amount)} a month, cancel any time.`}
      />

      {banner && <Banner tone={banner.tone}>{banner.text}</Banner>}

      {isActive ? (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif text-2xl text-ink">
                    Your retainer is{" "}
                    {subscription!.status === "active" ? "active" : "past due"}
                  </h2>
                  <p className="text-muted text-[14.5px] mt-1.5">
                    {subscription!.current_period_end
                      ? `Current period ends ${formatDate(subscription!.current_period_end)}.`
                      : "Billing period details will appear after your first payment."}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-semibold capitalize ${
                    subscription!.status === "active"
                      ? "bg-green/10 text-green"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {subscription!.status === "past_due"
                    ? "Past due"
                    : subscription!.status}
                </span>
              </div>
              {subscription!.status === "past_due" && (
                <p className="text-[14px] text-red-700 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  Your last payment didn&apos;t go through. Please update your
                  payment details to keep your benefits — or contact support if
                  you need a hand.
                </p>
              )}
            </Card>

            <Card>
              <h3 className="font-serif text-xl text-ink mb-4">
                What&apos;s included
              </h3>
              <ul className="space-y-4">
                {BENEFITS.map((b) => (
                  <li key={b.title} className="flex gap-3">
                    <span className="text-green font-bold mt-0.5">✓</span>
                    <div>
                      <div className="text-[15px] font-semibold text-ink">
                        {b.title}
                      </div>
                      <p className="text-[14px] text-muted mt-0.5">{b.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div>
            <Card>
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-faint mb-2">
                Monthly credits
              </h3>
              <p className="text-[14.5px] text-body">
                Your {PRICING.retainer.includedCredits} monthly unlocks are
                added automatically. See them in your{" "}
                <Link
                  href="/app/credits"
                  className="font-semibold text-green hover:text-green-dark"
                >
                  credit history
                </Link>
                .
              </p>
              <p className="text-[13.5px] text-muted mt-4">
                Need to cancel or change your plan? Contact our support team
                and we&apos;ll sort it the same day.
              </p>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <h2 className="font-serif text-2xl text-ink">
                Ongoing support, long after the introduction
              </h2>
              <p className="text-muted text-[15px] mt-2 max-w-xl">
                Care needs change. The retainer keeps us by your side — with
                fresh unlocks each month, replacement searches when things
                don&apos;t work out, and a coordinator who knows your situation.
              </p>
              <ul className="space-y-4 mt-6">
                {BENEFITS.map((b) => (
                  <li key={b.title} className="flex gap-3">
                    <span className="text-green font-bold mt-0.5">✓</span>
                    <div>
                      <div className="text-[15px] font-semibold text-ink">
                        {b.title}
                      </div>
                      <p className="text-[14px] text-muted mt-0.5">{b.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {subscription?.status === "cancelled" && (
                <p className="text-[13.5px] text-muted mt-6">
                  Your previous retainer was cancelled
                  {subscription.cancelled_at
                    ? ` on ${formatDate(subscription.cancelled_at)}`
                    : ""}
                  . You can restart it any time below.
                </p>
              )}
            </Card>
          </div>

          <div>
            <Card>
              <div className="text-[13px] font-semibold uppercase tracking-wide text-faint">
                {PRICING.retainer.label}
              </div>
              <div className="font-serif text-4xl text-ink mt-2">
                {formatGBP(PRICING.retainer.amount)}
                <span className="text-[15px] text-muted font-sans">/month</span>
              </div>
              <p className="text-[14px] text-muted mt-2">
                Includes {PRICING.retainer.includedCredits} profile unlocks a
                month. Cancel any time.
              </p>
              <form action={subscribeRetainer} className="mt-5">
                <button
                  type="submit"
                  className="w-full px-5 py-2.5 rounded-full font-semibold text-[15px] bg-green text-cream hover:bg-green-dark transition-colors"
                >
                  {subscription?.status === "cancelled"
                    ? "Restart retainer"
                    : "Subscribe"}{" "}
                  — {formatGBP(PRICING.retainer.amount)}/mo
                </button>
              </form>
              <p className="text-[12.5px] text-faint mt-3 text-center">
                Secure checkout. You&apos;ll return here once it&apos;s set up.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
