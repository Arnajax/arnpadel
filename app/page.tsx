"use client";

import { useState, useEffect, useRef } from "react";

interface Slot {
  id: string | number;
  date: string;
  time: string;
  duration: number;
  maxPlayers: number;
}

interface FormData {
  name: string;
  phone: string;
  players: number;
}

function formatDutchDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function getPrice(players: number): number {
  return players <= 2 ? 80 : 90;
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="h-10 bg-gray-200 rounded-xl" />
    </div>
  );
}

export default function Home() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    phone: "",
    players: 2,
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slotsRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    fetch(`${apiUrl}/slots`)
      .then((res) => res.json())
      .then((data: Slot[]) => {
        setSlots(data);
        setLoading(false);
      })
      .catch(() => {
        setSlots([]);
        setLoading(false);
      });
  }, []);

  function handleSelectSlot(slot: Slot) {
    setSelectedSlot(slot);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function getSlotLabel(slot: Slot): string {
    const dateLabel = formatDutchDate(slot.date);
    const time = slot.time ?? slot.date.split("T")[1]?.slice(0, 5) ?? "";
    return `${dateLabel} om ${time} (${slot.duration} min)`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) {
      setError("Selecteer eerst een slot hierboven.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          players: formData.players,
          slotId: selectedSlot.id,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message ?? `Fout: ${res.status}`);
      }

      setSuccess(true);
      setFormData({ name: "", phone: "", players: 2 });
      setSelectedSlot(null);
      slotsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Er is iets misgegaan.");
    } finally {
      setSubmitting(false);
    }
  }

  const price = getPrice(formData.players);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8F9FA" }}>
      {/* Hero */}
      <header
        className="w-full py-16 px-4 text-center"
        style={{
          background: "linear-gradient(135deg, #00C27C 0%, #1A1A2E 100%)",
        }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="text-6xl mb-4">🎾</div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-3 leading-tight tracking-tight">
            Boek een padelles bij Arn
          </h1>
          <p className="text-lg sm:text-xl font-medium" style={{ color: "#d4f5e9" }}>
            Hoorn&nbsp;•&nbsp;Top-150 NL&nbsp;•&nbsp;Alle niveaus welkom
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* Slot Overview */}
        <section ref={slotsRef} className="mb-12">
          <h2
            className="text-2xl font-bold mb-6"
            style={{ color: "#1A1A2E" }}
          >
            Beschikbare slots
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <div
              className="rounded-2xl p-8 text-center text-base font-medium"
              style={{ backgroundColor: "#e8f5e9", color: "#1A1A2E" }}
            >
              Geen slots beschikbaar — volg{" "}
              <a
                href="https://instagram.com/arnpadel"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-bold"
                style={{ color: "#00C27C" }}
              >
                @arnpadel
              </a>{" "}
              op Instagram voor updates.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {slots.map((slot) => {
                const isSelected = selectedSlot?.id === slot.id;
                const time =
                  slot.time ?? slot.date.split("T")[1]?.slice(0, 5) ?? "";
                return (
                  <div
                    key={slot.id}
                    className="bg-white rounded-2xl p-5 shadow-sm border-2 transition-all"
                    style={{
                      borderColor: isSelected ? "#00C27C" : "transparent",
                      boxShadow: isSelected
                        ? "0 0 0 2px #00C27C"
                        : "0 1px 4px rgba(0,0,0,0.08)",
                    }}
                  >
                    <div
                      className="text-sm font-semibold uppercase tracking-wide mb-1"
                      style={{ color: "#00C27C" }}
                    >
                      {formatDutchDate(slot.date)}
                    </div>
                    <div
                      className="text-xl font-bold mb-1"
                      style={{ color: "#1A1A2E" }}
                    >
                      {time}
                    </div>
                    <div className="text-sm text-gray-500 mb-1">
                      {slot.duration} min &middot; max {slot.maxPlayers} spelers
                    </div>
                    <div
                      className="text-lg font-bold mb-4"
                      style={{ color: "#1A1A2E" }}
                    >
                      Vanaf €80
                    </div>
                    <button
                      onClick={() => handleSelectSlot(slot)}
                      className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 active:scale-95"
                      style={{
                        backgroundColor: isSelected ? "#009e63" : "#00C27C",
                      }}
                    >
                      {isSelected ? "Geselecteerd ✓" : "Boek dit slot"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Booking Form */}
        <section
          id="booking-form"
          ref={formRef}
          className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm"
        >
          <h2
            className="text-2xl font-bold mb-6"
            style={{ color: "#1A1A2E" }}
          >
            Aanvraag indienen
          </h2>

          {success && (
            <div
              className="rounded-xl p-4 mb-6 text-sm font-medium"
              style={{ backgroundColor: "#d4f5e9", color: "#065f46" }}
            >
              Aanvraag ontvangen! Arn neemt snel contact op via WhatsApp ✅
            </div>
          )}

          {error && (
            <div
              className="rounded-xl p-4 mb-6 text-sm font-medium"
              style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Naam */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold mb-1"
                style={{ color: "#1A1A2E" }}
              >
                Naam
              </label>
              <input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Jouw naam"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2"
                style={{
                  borderColor: "#e5e7eb",
                  color: "#1A1A2E",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "#00C27C")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "#e5e7eb")
                }
              />
            </div>

            {/* Telefoon */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-semibold mb-1"
                style={{ color: "#1A1A2E" }}
              >
                Telefoon
              </label>
              <input
                id="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="06 12 34 56 78"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2"
                style={{
                  borderColor: "#e5e7eb",
                  color: "#1A1A2E",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "#00C27C")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "#e5e7eb")
                }
              />
            </div>

            {/* Aantal spelers */}
            <div>
              <label
                htmlFor="players"
                className="block text-sm font-semibold mb-1"
                style={{ color: "#1A1A2E" }}
              >
                Aantal spelers
              </label>
              <select
                id="players"
                value={formData.players}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    players: Number(e.target.value),
                  }))
                }
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none bg-white"
                style={{ borderColor: "#e5e7eb", color: "#1A1A2E" }}
              >
                <option value={1}>1 speler — €80</option>
                <option value={2}>2 spelers — €80</option>
                <option value={3}>3 spelers — €90</option>
                <option value={4}>4 spelers — €90</option>
              </select>
              <p className="text-xs mt-1" style={{ color: "#6b7280" }}>
                Prijs voor dit slot:{" "}
                <span className="font-bold" style={{ color: "#00C27C" }}>
                  €{price}
                </span>
              </p>
            </div>

            {/* Geselecteerd slot */}
            <div>
              <label
                htmlFor="slot"
                className="block text-sm font-semibold mb-1"
                style={{ color: "#1A1A2E" }}
              >
                Geselecteerd slot
              </label>
              <input
                id="slot"
                type="text"
                readOnly
                value={selectedSlot ? getSlotLabel(selectedSlot) : ""}
                placeholder="Selecteer een slot hierboven"
                className="w-full rounded-xl border px-4 py-3 text-sm bg-gray-50 cursor-default"
                style={{ borderColor: "#e5e7eb", color: "#1A1A2E" }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-xl text-base font-bold text-white transition-opacity disabled:opacity-60 hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "#00C27C" }}
            >
              {submitting ? "Versturen…" : "Verstuur aanvraag 🎾"}
            </button>
          </form>
        </section>
      </main>

      <footer
        className="text-center py-8 text-sm"
        style={{ color: "#9ca3af" }}
      >
        © {new Date().getFullYear()} arnpadel — Hoorn
      </footer>
    </div>
  );
}
