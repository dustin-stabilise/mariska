import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { formatGBP } from "@/lib/pricing";
import { PageHeading, Card, Stat, CompliancePill } from "@/components/ui";
import {
  daysSince,
  daysUntil,
  formatDate,
  fullName,
  humanise,
  isoDaysFromNow,
  nameMap,
  td,
  th,
  trow,
} from "@/lib/admin/helpers";

export default async function AdminOverviewPage() {
  const { supabase } = await requireRole("admin");

  const in60Days = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);
  const staleCutoff = isoDaysFromNow(-21);

  const [
    activeCarers,
    activeNurses,
    pendingApplications,
    docsAwaitingReview,
    openInterviews,
    activePlacements,
    openFlags,
    paidPayments,
    activePros,
    expiringDocs,
    stalePros,
    activeBookings,
    completedBookings,
  ] = await Promise.all([
    supabase
      .from("professional_profiles")
      .select("id", { count: "exact", head: true })
      .eq("kind", "carer")
      .eq("status", "active"),
    supabase
      .from("professional_profiles")
      .select("id", { count: "exact", head: true })
      .eq("kind", "nurse")
      .eq("status", "active"),
    supabase
      .from("professional_profiles")
      .select("id", { count: "exact", head: true })
      .in("status", ["applied", "in_review"]),
    supabase
      .from("compliance_documents")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review"),
    supabase
      .from("interview_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["requested", "accepted", "scheduled"]),
    supabase
      .from("placements")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("safeguarding_flags")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_review"]),
    supabase.from("payments").select("amount, paid_at").eq("status", "paid"),
    supabase
      .from("professional_profiles")
      .select("compliance_status")
      .eq("status", "active"),
    supabase
      .from("compliance_documents")
      .select("id, professional_id, doc_type, expiry_date")
      .eq("status", "approved")
      .not("expiry_date", "is", null)
      .lte("expiry_date", in60Days)
      .order("expiry_date", { ascending: true }),
    supabase
      .from("professional_profiles")
      .select("id, kind, availability_confirmed_at")
      .eq("status", "active")
      .lt("availability_confirmed_at", staleCutoff)
      .order("availability_confirmed_at", { ascending: true }),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .in("status", ["proposed", "confirmed"]),
    supabase
      .from("bookings")
      .select("client_fee_amount, carer_fee_amount")
      .eq("status", "completed"),
  ]);

  // Revenue
  const thirtyDaysAgo = Date.now() - 30 * 86_400_000;
  let revenueAllTime = 0;
  let revenueLast30 = 0;
  for (const p of paidPayments.data ?? []) {
    revenueAllTime += p.amount;
    if (p.paid_at && new Date(p.paid_at).getTime() >= thirtyDaysAgo) {
      revenueLast30 += p.amount;
    }
  }

  // Booking commission (DR-0001): platform take on completed bookings
  const completedBookingRows = completedBookings.data ?? [];
  const bookingCommission = completedBookingRows.reduce(
    (sum, b) => sum + b.client_fee_amount + b.carer_fee_amount,
    0
  );

  // Compliance overview for active professionals
  const complianceCounts = { green: 0, amber: 0, red: 0 };
  for (const p of activePros.data ?? []) complianceCounts[p.compliance_status] += 1;

  // Names for the two lists
  const proIds = [
    ...new Set([
      ...(expiringDocs.data ?? []).map((d) => d.professional_id),
      ...(stalePros.data ?? []).map((p) => p.id),
    ]),
  ];
  const { data: nameRows } = proIds.length
    ? await supabase.from("profiles").select("id, first_name, last_name").in("id", proIds)
    : { data: [] };
  const names = nameMap(nameRows);

  return (
    <div>
      <PageHeading
        eyebrow="Agency admin"
        title="Overview"
        intro="A live picture of the register, the review queues and revenue."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Active carers" value={activeCarers.count ?? 0} />
        <Stat label="Active nurses" value={activeNurses.count ?? 0} />
        <Stat label="Pending applications" value={pendingApplications.count ?? 0} />
        <Stat label="Docs awaiting review" value={docsAwaitingReview.count ?? 0} />
        <Stat label="Open interview requests" value={openInterviews.count ?? 0} />
        <Stat label="Active placements" value={activePlacements.count ?? 0} />
        <Stat label="Open safeguarding flags" value={openFlags.count ?? 0} />
        <Stat
          label="Revenue"
          value={formatGBP(revenueAllTime)}
          hint={`${formatGBP(revenueLast30)} in the last 30 days`}
        />
        <Stat
          label="Active bookings"
          value={activeBookings.count ?? 0}
          hint="Proposed or confirmed"
        />
        <Stat label="Completed bookings" value={completedBookingRows.length} />
        <Stat
          label="Booking commission"
          value={formatGBP(bookingCommission)}
          hint="Platform take on completed bookings"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-8">
        {(["green", "amber", "red"] as const).map((status) => (
          <Card key={status}>
            <div className="flex items-center justify-between">
              <CompliancePill status={status} />
              <span className="font-serif text-3xl text-ink">
                {complianceCounts[status]}
              </span>
            </div>
            <p className="text-[13px] text-muted mt-2">
              Active professionals rated {status}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-8 items-start">
        <Card>
          <h2 className="font-serif text-xl text-ink mb-4">
            Documents expiring within 60 days
          </h2>
          {(expiringDocs.data ?? []).length === 0 ? (
            <p className="text-muted text-[14.5px]">Nothing expiring soon.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={th}>Professional</th>
                    <th className={th}>Document</th>
                    <th className={th}>Expires</th>
                    <th className={th}>Days left</th>
                  </tr>
                </thead>
                <tbody>
                  {(expiringDocs.data ?? []).map((doc) => {
                    const left = daysUntil(doc.expiry_date!);
                    return (
                      <tr key={doc.id} className={trow}>
                        <td className={td}>
                          <Link
                            href={`/app/admin/professionals/${doc.professional_id}`}
                            className="font-medium text-ink hover:text-green"
                          >
                            {names.get(doc.professional_id) ?? "Unknown"}
                          </Link>
                        </td>
                        <td className={`${td} capitalize`}>{humanise(doc.doc_type)}</td>
                        <td className={td}>{formatDate(doc.expiry_date)}</td>
                        <td className={td}>
                          <span
                            className={
                              left <= 0
                                ? "font-semibold text-red-700"
                                : left <= 30
                                  ? "font-semibold text-[#7a6a3d]"
                                  : ""
                            }
                          >
                            {left <= 0 ? "Expired" : `${left} days`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="font-serif text-xl text-ink mb-4">
            Stale availability (21+ days)
          </h2>
          {(stalePros.data ?? []).length === 0 ? (
            <p className="text-muted text-[14.5px]">
              Every active professional has confirmed availability recently.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={th}>Professional</th>
                    <th className={th}>Kind</th>
                    <th className={th}>Last confirmed</th>
                    <th className={th}>Days ago</th>
                  </tr>
                </thead>
                <tbody>
                  {(stalePros.data ?? []).map((pro) => (
                    <tr key={pro.id} className={trow}>
                      <td className={td}>
                        <Link
                          href={`/app/admin/professionals/${pro.id}`}
                          className="font-medium text-ink hover:text-green"
                        >
                          {names.get(pro.id) ?? "Unknown"}
                        </Link>
                      </td>
                      <td className={`${td} capitalize`}>{pro.kind}</td>
                      <td className={td}>{formatDate(pro.availability_confirmed_at)}</td>
                      <td className={td}>{daysSince(pro.availability_confirmed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
