"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  completeBooking,
  createBookingProposal,
  startBookingCheckout,
  startConnectOnboarding,
} from "@/lib/payments/bookings";

export type BookingActionState = { error?: string; success?: string } | undefined;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

const proposalSchema = z.object({
  professionalId: z.uuid(),
  startsAt: z.string().min(1, "Start time is required"),
  endsAt: z.string().min(1, "End time is required"),
  notes: z.string().max(2000).optional(),
});

export async function proposeBooking(
  _prev: BookingActionState,
  formData: FormData
): Promise<BookingActionState> {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "client") return { error: "Only clients can book care" };

  const parsed = proposalSchema.safeParse({
    professionalId: formData.get("professionalId"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    notes: (formData.get("notes") as string) || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { error: "Invalid date or time" };
  }
  if (startsAt < new Date()) return { error: "Booking must start in the future" };
  if (endsAt <= startsAt) return { error: "End time must be after the start time" };

  try {
    const booking = await createBookingProposal({
      clientId: user.id,
      professionalId: parsed.data.professionalId,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      notes: parsed.data.notes,
    });

    const { sendToUser } = await import("@/lib/email");
    const { bookingProposedEmail } = await import("@/lib/email/templates");
    const email = bookingProposedEmail(Number(booking.hours), booking.carer_net_amount);
    await sendToUser(booking.professional_id, email.subject, email.html);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    if (msg === "professional_has_no_rate") {
      return { error: "This professional hasn't set an hourly rate yet" };
    }
    if (msg === "professional_not_bookable") {
      return { error: "This professional isn't currently available to book" };
    }
    if (msg === "professional_unavailable") {
      return { error: "They're already booked or away at that time. Check their busy times and pick another slot." };
    }
    return { error: "Could not create the booking, please try again" };
  }

  revalidatePath("/app/bookings");
  redirect("/app/bookings?status=proposed");
}

export async function acceptBooking(formData: FormData) {
  const { supabase, user } = await requireUser();
  const bookingId = formData.get("bookingId") as string;
  if (!bookingId) return;
  const { data: booking, error: acceptError } = await supabase.rpc("accept_booking", {
    p_booking_id: bookingId,
  });
  if (acceptError?.message.includes("booking_clash")) {
    revalidatePath("/app/pro/bookings");
    redirect("/app/pro/bookings?clash=1");
  }

  if (booking) {
    const { data: me } = await supabase
      .from("profiles")
      .select("first_name")
      .eq("id", user.id)
      .single();
    const { sendToUser } = await import("@/lib/email");
    const { bookingAcceptedEmail } = await import("@/lib/email/templates");
    const email = bookingAcceptedEmail(me?.first_name ?? "Your carer", booking.total_amount);
    await sendToUser(booking.client_id, email.subject, email.html);
  }

  revalidatePath("/app/pro/bookings");
}

export async function cancelBooking(formData: FormData) {
  const { supabase } = await requireUser();
  const bookingId = formData.get("bookingId") as string;
  const reason = (formData.get("reason") as string) || undefined;
  if (!bookingId) return;
  await supabase.rpc("cancel_booking", {
    p_booking_id: bookingId,
    p_reason: reason,
  });
  revalidatePath("/app/bookings");
  revalidatePath("/app/pro/bookings");
}

export async function payBooking(formData: FormData) {
  const { user } = await requireUser();
  const bookingId = formData.get("bookingId") as string;
  if (!bookingId) return;
  const earlyStartAck = formData.get("earlyStart") === "on";
  let url: string;
  try {
    url = await startBookingCheckout(user.id, bookingId, earlyStartAck);
  } catch (e) {
    if (e instanceof Error && e.message === "early_start_ack_required") {
      redirect("/app/bookings?ack=required");
    }
    throw e;
  }
  redirect(url);
}

export async function markBookingComplete(formData: FormData) {
  const { supabase, user } = await requireUser();
  const bookingId = formData.get("bookingId") as string;
  if (!bookingId) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  await completeBooking(bookingId, user.id, profile?.role === "admin");
  revalidatePath("/app/bookings");
  revalidatePath("/app/pro/bookings");
}

export async function connectPayouts() {
  const { supabase, user } = await requireUser();

  const { data: pro } = await supabase
    .from("professional_profiles")
    .select("id")
    .eq("id", user.id)
    .single();
  if (!pro) redirect("/app");

  const url = await startConnectOnboarding(user.id);
  redirect(url);
}
