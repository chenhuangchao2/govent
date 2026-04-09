"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

const TAG_PRESETS = [
  "Leadership",
  "Technology",
  "Policy",
  "Cloud",
  "AI",
  "Data",
  "Agile",
  "Security",
] as const;

interface FormData {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  venue: string;
  capacity: string;
  registrationDeadline: string;
  imageUrl: string;
  tags: string[];
  allowedDomains: string;
  allowedOrganisations: string;
  cpdHours: string;
  isPaid: boolean;
  price: string;
}

const initialForm: FormData = {
  title: "",
  description: "",
  startTime: "",
  endTime: "",
  venue: "",
  capacity: "",
  registrationDeadline: "",
  imageUrl: "",
  tags: [],
  allowedDomains: "",
  allowedOrganisations: "",
  cpdHours: "",
  isPaid: false,
  price: "",
};

export default function CreateEventPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // ── Field updaters ──
  const set = (field: keyof FormData, value: string | boolean | string[]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleTag = (tag: string) =>
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));

  // ── Validation ──
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (form.startTime && form.endTime && form.endTime <= form.startTime) {
      e.endTime = "End time must be after start time";
    }
    if (
      form.registrationDeadline &&
      form.startTime &&
      form.registrationDeadline >= form.startTime
    ) {
      e.registrationDeadline = "Deadline must be before event start";
    }
    if (form.capacity && Number(form.capacity) <= 0) {
      e.capacity = "Capacity must be greater than 0";
    }
    if (form.isPaid && form.price && Number(form.price) <= 0) {
      e.price = "Price must be greater than 0";
    }
    return e;
  }, [form]);

  const requiredFilled =
    form.title.trim() &&
    form.description.trim() &&
    form.startTime &&
    form.endTime &&
    form.venue.trim() &&
    form.capacity &&
    form.registrationDeadline;

  const canSubmit =
    requiredFilled && Object.keys(errors).length === 0 && !submitting;

  // ── Submit (shared logic) ──
  const createEvent = async (publish: boolean) => {
    if (!canSubmit) return;
    setSubmitting(true);
    setApiError(null);

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        startTime: form.startTime,
        endTime: form.endTime,
        venue: form.venue.trim(),
        capacity: Number(form.capacity),
        registrationDeadline: form.registrationDeadline,
        imageUrl: form.imageUrl.trim() || undefined,
        tags: form.tags,
        allowedDomains: form.allowedDomains
          ? form.allowedDomains.split(",").map((d) => d.trim()).filter(Boolean)
          : [],
        allowedOrganisations: form.allowedOrganisations
          ? form.allowedOrganisations.split(",").map((o) => o.trim()).filter(Boolean)
          : [],
        cpdHours: form.cpdHours ? Number(form.cpdHours) : 0,
        isPaid: form.isPaid,
        price: form.isPaid ? Number(form.price) : undefined,
      };

      const createRes = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const createJson = await createRes.json();
      if (!createRes.ok || createJson.error) {
        setApiError(createJson.error || "Failed to create event");
        setSubmitting(false);
        return;
      }

      const eventId = createJson.data.id;

      if (publish) {
        const publishRes = await fetch(`/api/events/${eventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "publish" }),
        });
        const publishJson = await publishRes.json();
        if (!publishRes.ok || publishJson.error) {
          console.warn("Publish failed:", publishJson.error);
        }
      }

      router.push(`/admin/events/${eventId}`);
    } catch {
      setApiError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createEvent(true);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">
          Create New Event
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Fill in the details below. The event will be published automatically
          upon creation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Section: Basic Info ── */}
        <section className="glass-card rounded-md p-6 space-y-5">
          <SectionHeading icon={<InfoIcon />} label="Basic Information" />

          <Field label="Title" required error={undefined}>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. AI in Government Workshop"
              className={inputClass}
            />
          </Field>

          <Field label="Description" required error={undefined}>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              placeholder="Describe the event objectives, agenda, and target audience..."
              className={inputClass + " resize-y min-h-[100px]"}
            />
          </Field>

          <Field label="Venue" required error={undefined}>
            <input
              type="text"
              value={form.venue}
              onChange={(e) => set("venue", e.target.value)}
              placeholder="e.g. GovTech Hive, Level 3"
              className={inputClass}
            />
          </Field>

          <Field label="Cover Image URL" required={false} error={undefined}>
            <input
              type="url"
              value={form.imageUrl}
              onChange={(e) => set("imageUrl", e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className={inputClass}
            />
          </Field>

          {/* Tags */}
          <div>
            <label className={labelClass}>Tags</label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {TAG_PRESETS.map((tag) => {
                const active = form.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all ${
                      active
                        ? "bg-primary text-on-primary shadow-md shadow-primary/20"
                        : "bg-surface-container-high/50 text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Section: Schedule ── */}
        <section className="glass-card rounded-md p-6 space-y-5">
          <SectionHeading icon={<ClockIcon />} label="Schedule" />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Time" required error={undefined}>
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={(e) => set("startTime", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="End Time" required error={errors.endTime}>
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={(e) => set("endTime", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Registration Deadline"
              required
              error={errors.registrationDeadline}
            >
              <input
                type="datetime-local"
                value={form.registrationDeadline}
                onChange={(e) => set("registrationDeadline", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Capacity" required error={errors.capacity}>
              <input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => set("capacity", e.target.value)}
                placeholder="e.g. 50"
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        {/* ── Section: Eligibility ── */}
        <section className="glass-card rounded-md p-6 space-y-5">
          <SectionHeading icon={<ShieldIcon />} label="Eligibility" />

          <Field label="Allowed Domains" required={false} error={undefined}>
            <input
              type="text"
              value={form.allowedDomains}
              onChange={(e) => set("allowedDomains", e.target.value)}
              placeholder="e.g. tech.gov.sg, imda.gov.sg (leave empty for all)"
              className={inputClass}
            />
            <p className="text-[11px] text-outline mt-1">
              Comma-separated. Leave empty to allow all email domains.
            </p>
          </Field>

          <Field
            label="Allowed Organisations"
            required={false}
            error={undefined}
          >
            <input
              type="text"
              value={form.allowedOrganisations}
              onChange={(e) => set("allowedOrganisations", e.target.value)}
              placeholder="e.g. GovTech, IMDA (leave empty for all)"
              className={inputClass}
            />
            <p className="text-[11px] text-outline mt-1">
              Comma-separated. Leave empty to allow all organisations.
            </p>
          </Field>

          <Field
            label="CPD Hours"
            required={false}
            error={undefined}
          >
            <input
              type="number"
              min={0}
              step={0.5}
              value={form.cpdHours}
              onChange={(e) => set("cpdHours", e.target.value)}
              placeholder="e.g. 2"
              className={inputClass}
            />
          </Field>
        </section>

        {/* ── Section: Payment ── */}
        <section className="glass-card rounded-md p-6 space-y-5">
          <SectionHeading icon={<CreditCardIcon />} label="Payment" />

          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className={labelClass}>Paid Event</span>
              <p className="text-[11px] text-outline mt-0.5">
                Enable if participants need to pay to register
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.isPaid}
              onClick={() => {
                set("isPaid", !form.isPaid);
                if (form.isPaid) set("price", "");
              }}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                form.isPaid ? "bg-primary" : "bg-surface-container-high"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
                  form.isPaid ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {form.isPaid && (
            <Field label="Price (SGD)" required error={errors.price}>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="e.g. 25.00"
                className={inputClass}
              />
            </Field>
          )}
        </section>

        {/* ── API Error ── */}
        {apiError && (
          <div className="rounded-lg bg-error-container/30 border border-error/20 px-4 py-3 text-sm font-semibold text-error">
            {apiError}
          </div>
        )}

        {/* ── Submit ── */}
        <div className="flex justify-end gap-3 pt-2 pb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 rounded-md text-sm font-bold text-on-surface-variant hover:bg-surface-container-high/50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => createEvent(false)}
            className="px-6 py-3 rounded-md text-sm font-bold border border-primary text-primary hover:bg-primary-fixed/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving..." : "Save as Draft"}
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="px-8 py-3 rounded-md text-sm font-bold text-on-primary bg-gradient-to-r from-primary to-primary-container shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <SpinnerIcon className="w-4 h-4 animate-spin" />
                Publishing...
              </span>
            ) : (
              "Create & Publish"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Shared styles ──
const labelClass =
  "font-label text-sm font-semibold tracking-wide text-on-surface-variant uppercase block";
const inputClass =
  "w-full px-4 py-3 bg-white/70 border border-outline-variant/20 rounded focus:ring-2 focus:ring-primary-fixed font-medium text-sm text-on-surface placeholder:text-outline/60 transition-all";

// ── Sub-components ──

function SectionHeading({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5 pb-1 border-b border-outline-variant/15 mb-1">
      <span className="text-primary">{icon}</span>
      <h2 className="text-sm font-black font-headline text-on-surface uppercase tracking-wide">
        {label}
      </h2>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required: boolean;
  error: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {error && (
        <p className="text-xs font-semibold text-error mt-1 flex items-center gap-1">
          <WarningIcon className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}

// ── Inline SVG Icons ──

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
      />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
