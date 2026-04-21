"use client";

import { useState, useEffect } from "react";

export interface BookingBlockContent {
  title?: string;
  subtitle?: string;
  sectionLabel?: string;
  buttonText?: string;
  cancelPolicy?: string;
  showPartySize?: string; // "true" | "false" — radio fields come through as strings
  availableTimes?: { time: string }[];
  address?: string;
  phone?: string;
  contactEmail?: string;
  /** Legacy free-form image URL. Kept for backwards-compat. */
  backgroundImageUrl?: string;
  /** Preferred: id of a tenant media item — rendered via /api/media/{id}/img. */
  backgroundImageId?: number;
}

interface BookingBlockProps {
  content: BookingBlockContent;
}

type FormState = "idle" | "submitting" | "success" | "error";

export function BookingBlock({ content }: BookingBlockProps) {
  const {
    title = "Book Your Visit",
    subtitle = "Reserve your spot today.",
    sectionLabel = "Secure your booking",
    buttonText = "Confirm Booking",
    cancelPolicy = "By confirming, you agree to our 24-hour cancellation policy.",
    showPartySize = "true",
    availableTimes = [
      { time: "18:00" }, { time: "18:30" }, { time: "19:15" },
      { time: "20:00" }, { time: "20:30" }, { time: "21:00" }, { time: "21:45" },
    ],
    address,
    phone,
    contactEmail,
    backgroundImageUrl,
    backgroundImageId,
  } = content;

  const showPartySizeField = showPartySize !== "false";

  // Prefer tenant media → stable permanent proxy URL
  const resolvedBgUrl = backgroundImageId
    ? `/api/media/${backgroundImageId}/img`
    : backgroundImageUrl;

  // ── Form state ──
  const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneVal, setPhoneVal] = useState("");
  const [notes, setNotes] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [bookingId, setBookingId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // ── Availability state ──
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // "HH:MM" now, only used for filtering when date === today
  const [todayStr, setTodayStr] = useState("");
  const [nowHM, setNowHM] = useState("");
  useEffect(() => {
    function tick() {
      const d = new Date();
      setTodayStr(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      );
      setNowHM(
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
      );
    }
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, []);

  // Fetch booked times whenever the date changes
  useEffect(() => {
    if (!date) { setBookedTimes([]); setSelectedTime(""); return; }
    let cancelled = false;
    setLoadingSlots(true);
    setSelectedTime(""); // reset selection when date changes
    fetch(`/api/bookings?date=${date}`)
      .then((r) => r.json())
      .then((json) => { if (!cancelled) setBookedTimes(json.bookedTimes ?? []); })
      .catch(() => { /* silently ignore — all slots shown on error */ })
      .finally(() => { if (!cancelled) setLoadingSlots(false); });
    return () => { cancelled = true; };
  }, [date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !selectedTime || !name || !email) return;

    setFormState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name.trim(),
          customer_email: email.trim(),
          customer_phone: phoneVal.trim() || undefined,
          booking_date: date,
          booking_time: selectedTime,
          party_size: showPartySizeField ? partySize : 1,
          special_notes: notes.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Booking failed. Please try again.");
      }

      setBookingId(json.bookingId ?? "");
      setFormState("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setFormState("error");
    }
  }

  function resetForm() {
    setFormState("idle");
    setDate("");
    setSelectedTime("");
    setName("");
    setEmail("");
    setPhoneVal("");
    setNotes("");
    setPartySize(2);
    setErrorMsg("");
    setBookingId("");
    setBookedTimes([]);
  }

  return (
    <section className="min-h-[600px] w-full md:flex">
      {/* ── Left: Brand / Ambient Panel ─────────────────────────────── */}
      <div
        className="relative flex min-h-[300px] flex-col justify-end bg-[var(--color-foreground)] md:min-h-[600px] md:w-[55%]"
        style={
          resolvedBgUrl
            ? {
                backgroundImage: `url(${resolvedBgUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        <div className="relative z-10 p-8 md:p-12">
          <h2 className="mb-3 text-3xl font-bold leading-tight text-white md:text-4xl lg:text-5xl">
            {title}
          </h2>
          <p className="mb-8 max-w-md text-base text-white/80">
            {subtitle}
          </p>

          {/* Contact / location info */}
          {(address || phone || contactEmail) && (
            <div className="space-y-1 border-t border-white/20 pt-6 text-sm text-white/70">
              {address && <p>{address}</p>}
              {phone && <p>{phone}</p>}
              {contactEmail && <p>{contactEmail}</p>}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Booking Form Panel ────────────────────────────────── */}
      <div className="flex flex-col justify-center bg-[var(--color-background)] px-6 py-10 md:w-[45%] md:px-10 lg:px-14">
        {formState === "success" ? (
          /* Success state */
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold text-[var(--color-foreground)]">Booking Confirmed</h3>
            <p className="mb-1 text-sm text-[var(--color-muted-foreground)]">
              We&apos;ve sent a confirmation email to <strong>{email}</strong>.
            </p>
            {bookingId && (
              <p className="mb-6 font-mono text-xs text-[var(--color-muted-foreground)]">
                Reference: {bookingId.slice(0, 8).toUpperCase()}
              </p>
            )}
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-[var(--color-primary)] underline underline-offset-4 hover:opacity-80"
            >
              Make another booking
            </button>
          </div>
        ) : (
          /* Booking form */
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
                {sectionLabel}
              </p>
            </div>

            {/* Party size */}
            {showPartySizeField && (
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-foreground)]">
                  Party Size
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPartySize((p) => Math.max(1, p - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] text-lg text-[var(--color-foreground)] transition hover:bg-[var(--color-muted)]"
                    aria-label="Decrease party size"
                  >
                    −
                  </button>
                  <span className="min-w-[2rem] text-center text-lg font-medium text-[var(--color-foreground)]">
                    {partySize}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPartySize((p) => Math.min(20, p + 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] text-lg text-[var(--color-foreground)] transition hover:bg-[var(--color-muted)]"
                    aria-label="Increase party size"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Date */}
            <div>
              <label htmlFor="booking-date" className="mb-2 block text-sm font-medium text-[var(--color-foreground)]">
                Preferred Date <span className="text-red-500">*</span>
              </label>
              <input
                id="booking-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={todayStr || new Date().toISOString().split("T")[0]}
                className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-1 text-sm text-[var(--color-foreground)] shadow-sm placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              />
            </div>

            {/* Time slots */}
            {availableTimes && availableTimes.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-[var(--color-foreground)]">
                  Available Times <span className="text-red-500">*</span>
                  {!date && (
                    <span className="ml-2 font-normal text-[var(--color-muted-foreground)]">
                      — pick a date first
                    </span>
                  )}
                </p>
                {loadingSlots ? (
                  <div className="flex gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-8 w-16 animate-pulse rounded-full bg-[var(--color-muted)]" />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableTimes
                      .filter(({ time }) => {
                        // Hide past times if the selected date is today
                        if (!date || date !== todayStr) return true;
                        return time > nowHM;
                      })
                      .map(({ time }) => {
                      const isBooked = bookedTimes.includes(time);
                      const isSelected = selectedTime === time;
                      return (
                        <button
                          key={time}
                          type="button"
                          disabled={isBooked || !date}
                          onClick={() => setSelectedTime(time)}
                          className={[
                            "rounded-full border px-4 py-1.5 text-sm font-medium transition",
                            isBooked
                              ? "cursor-not-allowed border-[var(--color-border)] text-[var(--color-muted-foreground)] line-through opacity-50"
                              : isSelected
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                                : !date
                                  ? "cursor-not-allowed border-[var(--color-border)] text-[var(--color-muted-foreground)] opacity-50"
                                  : "border-[var(--color-border)] text-[var(--color-foreground)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]",
                          ].join(" ")}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Name */}
            <div>
              <label htmlFor="booking-name" className="mb-2 block text-sm font-medium text-[var(--color-foreground)]">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="booking-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-1 text-sm text-[var(--color-foreground)] shadow-sm placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="booking-email" className="mb-2 block text-sm font-medium text-[var(--color-foreground)]">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="booking-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-1 text-sm text-[var(--color-foreground)] shadow-sm placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              />
            </div>

            {/* Phone (optional) */}
            <div>
              <label htmlFor="booking-phone" className="mb-2 block text-sm font-medium text-[var(--color-foreground)]">
                Phone <span className="text-[var(--color-muted-foreground)] font-normal">(optional)</span>
              </label>
              <input
                id="booking-phone"
                type="tel"
                value={phoneVal}
                onChange={(e) => setPhoneVal(e.target.value)}
                placeholder="+44 7000 000000"
                className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-1 text-sm text-[var(--color-foreground)] shadow-sm placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="booking-notes" className="mb-2 block text-sm font-medium text-[var(--color-foreground)]">
                Special Requests <span className="text-[var(--color-muted-foreground)] font-normal">(optional)</span>
              </label>
              <textarea
                id="booking-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Dietary requirements, accessibility needs, special occasions…"
                className="flex w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-foreground)] shadow-sm placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              />
            </div>

            {/* Error */}
            {formState === "error" && errorMsg && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                {errorMsg}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={formState === "submitting" || !date || !selectedTime || !name || !email}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)] shadow transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {formState === "submitting" ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Confirming…
                </span>
              ) : buttonText}
            </button>

            {/* Cancel policy */}
            {cancelPolicy && (
              <p className="text-center text-xs text-[var(--color-muted-foreground)]">
                {cancelPolicy}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
