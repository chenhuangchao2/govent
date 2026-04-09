"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── Types ──

interface SerializedEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  venue: string;
  venueHidden: boolean;
  capacity: number;
  registrationDeadline: string;
  isPublished: boolean;
  isCancelled: boolean;
  isFeatured: boolean;
  imageUrl: string | null;
  tags: string[];
  allowedDomains: string[];
  allowedOrganisations: string[];
  cpdHours: number;
  isPaid: boolean;
  price: number | null;
  creatorId: string | null;
  creator: { name: string; email: string } | null;
  _count: { registrations: number };
  createdAt: string;
  updatedAt: string;
}

interface Registration {
  id: string;
  eventId: string;
  name: string;
  email: string;
  organisation: string;
  remarks: string | null;
  status: string;
  waitlistPosition: number | null;
  paymentStatus: string;
  paymentDeadline: string | null;
  checkedInAt: string | null;
  adminNotes: string | null;
  createdAt: string;
}

interface CheckinStats {
  approved: number;
  attended: number;
  total: number;
  remaining: number;
  lastFive: { name: string; checkedInAt: string }[];
}

type TabKey = "overview" | "registrations" | "checkin";

// ── Status badge colors ──

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  WAITLISTED: "bg-yellow-100 text-yellow-800",
  PENDING_PAYMENT: "bg-purple-100 text-purple-800",
  PAYMENT_FAILED: "bg-red-100 text-red-700",
  ATTENDED: "bg-blue-100 text-blue-800",
  NO_SHOW: "bg-gray-200 text-gray-600",
  CANCELLED: "bg-gray-100 text-gray-500",
};

// ── Main Component ──

export function EventTabs({ event: initialEvent }: { event: SerializedEvent }) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [event, setEvent] = useState(initialEvent);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    {
      key: "overview",
      label: "Overview",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      key: "registrations",
      label: "Registrations",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      key: "checkin",
      label: "Check-in",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-outline-variant/20 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-primary text-primary font-bold"
                : "border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/40"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <OverviewTab event={event} onEventUpdate={setEvent} />
      )}
      {activeTab === "registrations" && <RegistrationsTab event={event} />}
      {activeTab === "checkin" && <CheckinTab event={event} />}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 1: Overview
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function OverviewTab({
  event,
  onEventUpdate,
}: {
  event: SerializedEvent;
  onEventUpdate: (e: SerializedEvent) => void;
}) {
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [confirmAction, setConfirmAction] = useState<"publish" | "unpublish" | "cancel" | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const disabled = event.isCancelled;

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const patchEvent = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (json.error) {
      showToast(json.error, "error");
      return null;
    }
    // Merge updated fields back, keeping serialized dates
    const updated = {
      ...event,
      ...json.data,
      startTime: json.data.startTime ?? event.startTime,
      endTime: json.data.endTime ?? event.endTime,
      registrationDeadline: json.data.registrationDeadline ?? event.registrationDeadline,
      createdAt: json.data.createdAt ?? event.createdAt,
      updatedAt: json.data.updatedAt ?? event.updatedAt,
    };
    onEventUpdate(updated);
    showToast("Saved");
    return updated;
  };

  const handleAction = async (action: "publish" | "unpublish" | "cancel") => {
    setConfirmAction(null);
    await patchEvent({ action });
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg text-sm font-semibold shadow-lg transition-all ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-error text-on-error"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {!event.isCancelled && !event.isPublished && (
          <button
            onClick={() => setConfirmAction("publish")}
            className="rounded-full px-5 py-2 text-sm font-bold bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            Publish Event
          </button>
        )}
        {!event.isCancelled && event.isPublished && (
          <button
            onClick={() => setConfirmAction("unpublish")}
            className="rounded-full px-5 py-2 text-sm font-bold bg-yellow-500 text-white hover:bg-yellow-600 transition-colors"
          >
            Unpublish
          </button>
        )}
        {!event.isCancelled && (
          <button
            onClick={() => setConfirmAction("cancel")}
            className="rounded-full px-5 py-2 text-sm font-bold bg-error text-on-error hover:bg-error/90 transition-colors"
          >
            Cancel Event
          </button>
        )}
        {!event.isCancelled && (
          <button
            onClick={() => setBroadcastOpen(true)}
            className="rounded-full px-5 py-2 text-sm font-bold bg-primary text-on-primary hover:bg-primary-container transition-colors"
          >
            Broadcast Email
          </button>
        )}
        {!event.isCancelled && event.isPublished && (
          <button
            onClick={() => patchEvent({ isFeatured: !event.isFeatured })}
            className={`rounded-full px-5 py-2 text-sm font-bold transition-colors ${
              event.isFeatured
                ? "bg-yellow-400 text-yellow-900 hover:bg-yellow-500"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
          >
            {event.isFeatured ? "★ Featured" : "☆ Set Featured"}
          </button>
        )}
      </div>

      {/* Editable fields — single card container */}
      <div className="bg-white rounded-md border border-outline-variant/10 px-6 py-2">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-0">
        <EditableTextField
          label="Title"
          value={event.title}
          disabled={disabled}
          onSave={(v) => patchEvent({ title: v })}
        />
        <EditableTextField
          label="Venue"
          value={event.venue}
          disabled={disabled}
          onSave={(v) => patchEvent({ venue: v })}
        />
        <div className="lg:col-span-2">
          <EditableTextField
            label="Description"
            value={event.description}
            disabled={disabled}
            multiline
            onSave={(v) => patchEvent({ description: v })}
          />
        </div>
        <EditableDateField
          label="Start Time"
          value={event.startTime}
          disabled={disabled}
          onSave={(v) => patchEvent({ startTime: v })}
        />
        <EditableDateField
          label="End Time"
          value={event.endTime}
          disabled={disabled}
          onSave={(v) => patchEvent({ endTime: v })}
        />
        <EditableDateField
          label="Registration Deadline"
          value={event.registrationDeadline}
          disabled={disabled}
          onSave={(v) => patchEvent({ registrationDeadline: v })}
        />
        <EditableNumberField
          label="Capacity"
          value={event.capacity}
          disabled={disabled}
          onSave={(v) => patchEvent({ capacity: v })}
        />
        <EditableNumberField
          label="CPD Hours"
          value={event.cpdHours}
          disabled={disabled}
          step={0.5}
          onSave={(v) => patchEvent({ cpdHours: v })}
        />
        <EditableTextField
          label="Image URL"
          value={event.imageUrl ?? ""}
          disabled={disabled}
          onSave={(v) => patchEvent({ imageUrl: v || null })}
        />
        <div className="py-3 border-b border-outline-variant/10 lg:col-span-2">
          <label className="block text-xs font-semibold font-label text-on-surface-variant uppercase tracking-wider mb-1.5">
            Pricing
          </label>
          <div className="text-sm text-on-surface">
            {event.isPaid ? `Paid — SGD ${(event.price ?? 0).toFixed(2)}` : "Free"}
          </div>
          <p className="text-xs text-outline mt-1">Pricing cannot be changed after event creation.</p>
        </div>
        <EditableTagsField
          label="Tags"
          value={event.tags}
          disabled={disabled}
          onSave={(v) => patchEvent({ tags: v })}
        />
        <EditableTagsField
          label="Allowed Domains"
          value={event.allowedDomains}
          disabled={disabled}
          placeholder="e.g. tech.gov.sg"
          onSave={(v) => patchEvent({ allowedDomains: v })}
        />
        <EditableTagsField
          label="Allowed Organisations"
          value={event.allowedOrganisations}
          disabled={disabled}
          placeholder="e.g. GovTech"
          onSave={(v) => patchEvent({ allowedOrganisations: v })}
        />
      </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <ConfirmDialog
          title={
            confirmAction === "publish"
              ? "Publish Event"
              : confirmAction === "unpublish"
                ? "Unpublish Event"
                : "Cancel Event"
          }
          message={
            confirmAction === "cancel"
              ? "This will cancel the event and notify all registrants. This action cannot be undone."
              : confirmAction === "publish"
                ? "This will make the event visible to the public."
                : "This will hide the event from the public listing."
          }
          confirmLabel={
            confirmAction === "cancel" ? "Cancel Event" : confirmAction === "publish" ? "Publish" : "Unpublish"
          }
          confirmColor={confirmAction === "cancel" ? "bg-error text-on-error" : "bg-green-600 text-white"}
          onConfirm={() => handleAction(confirmAction)}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Broadcast Modal */}
      {broadcastOpen && (
        <BroadcastModal
          eventId={event.id}
          onClose={() => setBroadcastOpen(false)}
          onSuccess={(sent, failed) => {
            setBroadcastOpen(false);
            showToast(`Broadcast sent to ${sent} recipients${failed > 0 ? `, ${failed} failed` : ""}`);
          }}
        />
      )}
    </div>
  );
}

// ── Editable field components ──

function EditableTextField({
  label,
  value,
  disabled,
  multiline,
  onSave,
}: {
  label: string;
  value: string;
  disabled: boolean;
  multiline?: boolean;
  onSave: (v: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const save = async () => {
    if (draft === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      save();
    }
    if (e.key === "Escape") cancel();
  };

  return (
    <div className="py-3 border-b border-outline-variant/10 last:border-b-0">
      <label className="block text-xs font-semibold font-label text-on-surface-variant uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {editing ? (
        <div>
          {multiline ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              rows={4}
              className="w-full px-3 py-2 rounded bg-surface-container text-on-surface text-sm border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary resize-y"
            />
          ) : (
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full px-3 py-2 rounded bg-surface-container text-on-surface text-sm border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary"
            />
          )}
          <div className="flex gap-2 mt-2">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-full px-3 py-1 text-xs font-bold bg-primary text-on-primary hover:bg-primary-container transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={cancel}
              className="rounded-full px-3 py-1 text-xs font-bold bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !disabled && setEditing(true)}
          className={`text-sm text-on-surface min-h-[1.5rem] whitespace-pre-wrap ${
            disabled ? "opacity-50" : "cursor-pointer hover:bg-surface-container-high/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
          }`}
        >
          {value || <span className="text-outline italic">Click to edit</span>}
        </div>
      )}
    </div>
  );
}

function EditableDateField({
  label,
  value,
  disabled,
  onSave,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onSave: (v: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => toLocalDatetimeString(value));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(toLocalDatetimeString(value));
  }, [value]);

  const save = async () => {
    setSaving(true);
    await onSave(new Date(draft).toISOString());
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="py-3 border-b border-outline-variant/10 last:border-b-0">
      <label className="block text-xs font-semibold font-label text-on-surface-variant uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {editing ? (
        <div>
          <input
            type="datetime-local"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                setDraft(toLocalDatetimeString(value));
                setEditing(false);
              }
            }}
            autoFocus
            className="w-full px-3 py-2 rounded bg-surface-container text-on-surface text-sm border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-full px-3 py-1 text-xs font-bold bg-primary text-on-primary hover:bg-primary-container transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setDraft(toLocalDatetimeString(value));
                setEditing(false);
              }}
              className="rounded-full px-3 py-1 text-xs font-bold bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !disabled && setEditing(true)}
          className={`text-sm text-on-surface ${
            disabled ? "opacity-50" : "cursor-pointer hover:bg-surface-container-high/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
          }`}
        >
          {formatDisplayDate(value)}
        </div>
      )}
    </div>
  );
}

function EditableNumberField({
  label,
  value,
  disabled,
  step,
  onSave,
}: {
  label: string;
  value: number;
  disabled: boolean;
  step?: number;
  onSave: (v: number) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const save = async () => {
    const num = parseFloat(draft);
    if (isNaN(num)) return;
    if (num === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    await onSave(num);
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="py-3 border-b border-outline-variant/10 last:border-b-0">
      <label className="block text-xs font-semibold font-label text-on-surface-variant uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {editing ? (
        <div>
          <input
            type="number"
            value={draft}
            step={step}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                setDraft(String(value));
                setEditing(false);
              }
            }}
            autoFocus
            className="w-full px-3 py-2 rounded bg-surface-container text-on-surface text-sm border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-full px-3 py-1 text-xs font-bold bg-primary text-on-primary hover:bg-primary-container transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setDraft(String(value));
                setEditing(false);
              }}
              className="rounded-full px-3 py-1 text-xs font-bold bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !disabled && setEditing(true)}
          className={`text-sm text-on-surface ${
            disabled ? "opacity-50" : "cursor-pointer hover:bg-surface-container-high/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
          }`}
        >
          {value}
        </div>
      )}
    </div>
  );
}

function EditableBooleanField({
  label,
  value,
  disabled,
  onSave,
}: {
  label: string;
  value: boolean;
  disabled: boolean;
  onSave: (v: boolean) => Promise<unknown>;
}) {
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    if (disabled || saving) return;
    setSaving(true);
    await onSave(!value);
    setSaving(false);
  };

  return (
    <div className="py-3 border-b border-outline-variant/10 last:border-b-0">
      <label className="block text-xs font-semibold font-label text-on-surface-variant uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <button
        onClick={toggle}
        disabled={disabled || saving}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
          value
            ? "bg-green-100 text-green-800"
            : "bg-gray-100 text-gray-600"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:opacity-80"}`}
      >
        <span
          className={`w-3 h-3 rounded-full transition-colors ${
            value ? "bg-green-500" : "bg-gray-400"
          }`}
        />
        {saving ? "Saving..." : value ? "Yes" : "No"}
      </button>
    </div>
  );
}

function EditablePriceField({
  isPaid,
  price,
  disabled,
  onSave,
}: {
  isPaid: boolean;
  price: number | null;
  disabled: boolean;
  onSave: (isPaid: boolean, price: number | null) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [draftPaid, setDraftPaid] = useState(isPaid);
  const [draftPrice, setDraftPrice] = useState(price ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraftPaid(isPaid);
    setDraftPrice(price ?? 0);
  }, [isPaid, price]);

  const save = async () => {
    setError("");
    if (draftPaid && draftPrice <= 0) {
      setError("Price must be greater than 0 for paid events");
      return;
    }
    setSaving(true);
    await onSave(draftPaid, draftPaid ? draftPrice : null);
    setSaving(false);
    setEditing(false);
  };

  const cancel = () => {
    setDraftPaid(isPaid);
    setDraftPrice(price ?? 0);
    setError("");
    setEditing(false);
  };

  return (
    <div className="py-3 border-b border-outline-variant/10 last:border-b-0 lg:col-span-2">
      <label className="block text-xs font-semibold font-label text-on-surface-variant uppercase tracking-wider mb-1.5">
        Pricing
      </label>
      {editing ? (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={draftPaid}
                onChange={(e) => setDraftPaid(e.target.checked)}
                className="w-4 h-4 rounded accent-primary"
              />
              <span className="text-sm font-medium">Paid event</span>
            </label>
            {draftPaid && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-on-surface-variant">SGD</span>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={draftPrice}
                  onChange={(e) => setDraftPrice(Number(e.target.value))}
                  className="w-28 px-3 py-1.5 rounded bg-surface-container text-on-surface text-sm border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
          </div>
          {error && <p className="text-xs text-error font-semibold">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-full px-3 py-1 text-xs font-bold bg-primary text-on-primary hover:bg-primary-container transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={cancel}
              className="rounded-full px-3 py-1 text-xs font-bold bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !disabled && setEditing(true)}
          className={`text-sm text-on-surface ${
            disabled ? "opacity-50" : "cursor-pointer hover:bg-surface-container-high/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
          }`}
        >
          {isPaid ? `Paid — SGD ${(price ?? 0).toFixed(2)}` : "Free"}
        </div>
      )}
    </div>
  );
}

function EditableTagsField({
  label,
  value,
  disabled,
  placeholder,
  onSave,
}: {
  label: string;
  value: string[];
  disabled: boolean;
  placeholder?: string;
  onSave: (v: string[]) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [tags, setTags] = useState(value);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTags(value);
  }, [value]);

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setInput("");
  };

  const removeTag = (t: string) => {
    setTags(tags.filter((x) => x !== t));
  };

  const save = async () => {
    setSaving(true);
    await onSave(tags);
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="py-3 border-b border-outline-variant/10 last:border-b-0">
      <label className="block text-xs font-semibold font-label text-on-surface-variant uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {editing ? (
        <div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary-fixed text-on-primary-fixed"
              >
                {t}
                <button
                  onClick={() => removeTag(t)}
                  className="ml-0.5 text-on-primary-fixed/60 hover:text-on-primary-fixed"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag();
              }
              if (e.key === "Escape") {
                setTags(value);
                setInput("");
                setEditing(false);
              }
            }}
            placeholder={placeholder || "Type and press Enter"}
            autoFocus
            className="w-full px-3 py-2 rounded bg-surface-container text-on-surface text-sm border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-full px-3 py-1 text-xs font-bold bg-primary text-on-primary hover:bg-primary-container transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setTags(value);
                setInput("");
                setEditing(false);
              }}
              className="rounded-full px-3 py-1 text-xs font-bold bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !disabled && setEditing(true)}
          className={`min-h-[1.5rem] ${
            disabled ? "opacity-50" : "cursor-pointer hover:bg-surface-container-high/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
          }`}
        >
          {value.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {value.map((t) => (
                <span
                  key={t}
                  className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-primary-fixed text-on-primary-fixed"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm text-outline italic">Click to edit</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Broadcast Modal ──

function BroadcastModal({
  eventId,
  onClose,
  onSuccess,
}: {
  eventId: string;
  onClose: () => void;
  onSuccess: (sent: number, failed: number) => void;
}) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    if (!subject.trim() || !message.trim()) {
      setError("Subject and message are required");
      return;
    }
    setSending(true);
    setError("");
    const res = await fetch(`/api/events/${eventId}/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message }),
    });
    const json = await res.json();
    setSending(false);
    if (json.error) {
      setError(json.error);
      return;
    }
    onSuccess(json.data.sent, json.data.failed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-card relative rounded-lg p-6 w-full max-w-lg shadow-2xl">
        <h3 className="text-lg font-bold font-headline text-on-surface mb-4">Broadcast Email</h3>
        <p className="text-sm text-on-surface-variant mb-4">
          Send an email to all APPROVED and WAITLISTED registrants.
        </p>
        {error && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-error/10 text-error text-sm font-semibold">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold font-label text-on-surface-variant uppercase tracking-wider mb-1">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 rounded bg-surface-container text-on-surface text-sm border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Email subject"
            />
          </div>
          <div>
            <label className="block text-xs font-bold font-label text-on-surface-variant uppercase tracking-wider mb-1">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 rounded bg-surface-container text-on-surface text-sm border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary resize-y"
              placeholder="Email body"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={onClose}
            className="rounded-full px-5 py-2 text-sm font-bold bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={send}
            disabled={sending}
            className="rounded-full px-5 py-2 text-sm font-bold bg-primary text-on-primary hover:bg-primary-container transition-colors disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send Broadcast"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Dialog ──

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmColor,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="glass-card relative rounded-lg p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-lg font-bold font-headline text-on-surface mb-2">{title}</h3>
        <p className="text-sm text-on-surface-variant mb-5">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-full px-5 py-2 text-sm font-bold bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-full px-5 py-2 text-sm font-bold transition-colors ${confirmColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 2: Registrations
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function RegistrationsTab({ event }: { event: SerializedEvent }) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchRegistrations = useCallback(async () => {
    const res = await fetch(`/api/registrations?eventId=${event.id}`);
    const json = await res.json();
    if (json.data) setRegistrations(json.data);
    setLoading(false);
  }, [event.id]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  // Status counts
  const counts: Record<string, number> = { ALL: registrations.length };
  for (const r of registrations) {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
  }

  // Filter
  const filtered = registrations.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
    }
    return true;
  });

  // Actions
  const doAction = async (id: string, action: string, extra?: Record<string, unknown>) => {
    setActionLoading(id);
    const res = await fetch(`/api/registrations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const json = await res.json();
    setActionLoading(null);
    if (json.error) {
      showToast(json.error, "error");
      return;
    }
    showToast(`Action "${action}" completed`);
    fetchRegistrations();
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    await doAction(rejectModal, "reject", { reason: rejectReason });
    setRejectModal(null);
    setRejectReason("");
  };

  const handleBulkApprove = async () => {
    if (selected.size === 0) return;
    setActionLoading("bulk");
    const res = await fetch("/api/registrations/bulk-approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationIds: Array.from(selected) }),
    });
    const json = await res.json();
    setActionLoading(null);
    if (json.error) {
      showToast(json.error, "error");
      return;
    }
    const d = json.data;
    showToast(
      `Approved: ${d.approved}${d.pendingPayment ? `, Pending Payment: ${d.pendingPayment}` : ""}${d.skipped ? `, Skipped: ${d.skipped}` : ""}${d.failed ? `, Failed: ${d.failed}` : ""}`,
      d.failed ? "error" : "success"
    );
    setSelected(new Set());
    fetchRegistrations();
  };

  const handleExport = () => {
    window.open(`/api/registrations/export?eventId=${event.id}`, "_blank");
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const pending = filtered.filter((r) => r.status === "PENDING");
    if (pending.every((r) => selected.has(r.id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pending.map((r) => r.id)));
    }
  };

  const statusTabs = ["ALL", "PENDING", "APPROVED", "WAITLISTED", "PENDING_PAYMENT", "REJECTED", "ATTENDED", "CANCELLED", "NO_SHOW"];

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card rounded-md p-4 animate-pulse">
            <div className="h-4 bg-surface-container-high rounded w-1/3 mb-2" />
            <div className="h-3 bg-surface-container-high rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg text-sm font-semibold shadow-lg ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-error text-on-error"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/70 backdrop-blur text-sm text-on-surface border border-outline-variant/20 focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          onClick={handleExport}
          className="rounded-full px-4 py-2.5 text-sm font-bold bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1">
        {statusTabs.map((s) => {
          const count = counts[s] ?? 0;
          if (s !== "ALL" && count === 0) return null;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                statusFilter === s
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {s === "ALL" ? "All" : s.replace(/_/g, " ")} ({count})
            </button>
          );
        })}
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="glass-card rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-on-surface">
            {selected.size} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-full px-3 py-1 text-xs font-bold bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleBulkApprove}
              disabled={actionLoading === "bulk"}
              className="rounded-full px-4 py-1 text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {actionLoading === "bulk" ? "Processing..." : "Approve Selected"}
            </button>
          </div>
        </div>
      )}

      {/* Select all for pending */}
      {filtered.some((r) => r.status === "PENDING") && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filtered.filter((r) => r.status === "PENDING").every((r) => selected.has(r.id))}
            onChange={toggleAll}
            className="w-4 h-4 rounded accent-primary"
          />
          <span className="text-xs font-semibold text-on-surface-variant">Select all pending</span>
        </div>
      )}

      {/* Registration cards */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-lg p-8 text-center">
          <p className="text-on-surface-variant text-sm">No registrations found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="glass-card rounded-md p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {r.status === "PENDING" && (
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      className="mt-1 w-4 h-4 rounded accent-primary flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-on-surface truncate">{r.name}</span>
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-600"}`}>
                        {r.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant truncate">{r.email}</p>
                    {r.organisation && (
                      <p className="text-xs text-outline mt-0.5">{r.organisation}</p>
                    )}
                    <p className="text-[10px] text-outline mt-1">
                      Registered {new Date(r.createdAt).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 flex-shrink-0">
                  {r.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => doAction(r.id, "approve")}
                        disabled={actionLoading === r.id}
                        className="rounded-full px-3 py-1 text-xs font-bold bg-green-100 text-green-800 hover:bg-green-200 transition-colors disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setRejectModal(r.id);
                          setRejectReason("");
                        }}
                        disabled={actionLoading === r.id}
                        className="rounded-full px-3 py-1 text-xs font-bold bg-red-100 text-red-800 hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {r.status === "APPROVED" && (
                    <button
                      onClick={() => doAction(r.id, "cancel")}
                      disabled={actionLoading === r.id}
                      className="rounded-full px-3 py-1 text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                  {r.status === "PENDING_PAYMENT" && (
                    <>
                      <button
                        onClick={() => doAction(r.id, "mark-paid")}
                        disabled={actionLoading === r.id}
                        className="rounded-full px-3 py-1 text-xs font-bold bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors disabled:opacity-50"
                      >
                        Mark Paid
                      </button>
                      <button
                        onClick={() => doAction(r.id, "cancel")}
                        disabled={actionLoading === r.id}
                        className="rounded-full px-3 py-1 text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {r.status === "WAITLISTED" && (
                    <button
                      onClick={() => doAction(r.id, "cancel")}
                      disabled={actionLoading === r.id}
                      className="rounded-full px-3 py-1 text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setRejectModal(null)} />
          <div className="glass-card relative rounded-lg p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold font-headline text-on-surface mb-2">Reject Registration</h3>
            <p className="text-sm text-on-surface-variant mb-4">
              Please provide a reason for rejection. The registrant will be notified.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Reason for rejection..."
              autoFocus
              className="w-full px-3 py-2 rounded bg-surface-container text-on-surface text-sm border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary resize-y"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setRejectModal(null)}
                className="rounded-full px-5 py-2 text-sm font-bold bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="rounded-full px-5 py-2 text-sm font-bold bg-error text-on-error transition-colors disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 3: Check-in
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function CheckinTab({ event }: { event: SerializedEvent }) {
  const [mode, setMode] = useState<"search" | "qr">("search");
  const [stats, setStats] = useState<CheckinStats | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Poll stats every 10s
  const fetchStats = useCallback(async () => {
    const res = await fetch(`/api/events/${event.id}/checkin-stats`);
    const json = await res.json();
    if (json.data) setStats(json.data);
  }, [event.id]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const doCheckin = async (registrationId: string) => {
    const res = await fetch(`/api/registrations/${registrationId}/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: event.id }),
    });
    const json = await res.json();
    if (json.error) {
      showToast(json.error, "error");
      return false;
    }
    showToast(`Checked in: ${json.data.name}`);
    fetchStats();
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg text-sm font-semibold shadow-lg ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-error text-on-error"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Stats panel */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="glass-card rounded-md p-4 text-center">
            <p className="text-2xl font-black font-headline text-primary">{stats.attended}</p>
            <p className="text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider">Checked In</p>
          </div>
          <div className="glass-card rounded-md p-4 text-center">
            <p className="text-2xl font-black font-headline text-on-surface">{stats.total}</p>
            <p className="text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider">Total Eligible</p>
          </div>
          <div className="glass-card rounded-md p-4 text-center">
            <p className="text-2xl font-black font-headline text-tertiary">{stats.remaining}</p>
            <p className="text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider">Remaining</p>
          </div>
          <div className="glass-card rounded-md p-4 text-center">
            <p className="text-2xl font-black font-headline text-secondary">
              {stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0}%
            </p>
            <p className="text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider">Attendance</p>
          </div>
        </div>
      )}

      {/* Recent check-ins */}
      {stats && stats.lastFive.length > 0 && (
        <div className="glass-card rounded-md p-4">
          <h4 className="text-xs font-bold font-label text-on-surface-variant uppercase tracking-wider mb-3">
            Recent Check-ins
          </h4>
          <div className="space-y-2">
            {stats.lastFive.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="font-semibold text-on-surface">{r.name}</span>
                <span className="text-xs text-outline">
                  {new Date(r.checkedInAt).toLocaleTimeString("en-SG", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-1 bg-surface-container rounded-lg p-1 w-fit">
        <button
          onClick={() => setMode("search")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            mode === "search"
              ? "bg-white shadow text-on-surface"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Search
        </button>
        <button
          onClick={() => setMode("qr")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            mode === "qr"
              ? "bg-white shadow text-on-surface"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          QR Scanner
        </button>
      </div>

      {/* Mode content */}
      {mode === "search" ? (
        <SearchCheckin eventId={event.id} onCheckin={doCheckin} />
      ) : (
        <QrCheckin eventId={event.id} onCheckin={doCheckin} />
      )}
    </div>
  );
}

// ── Search Check-in ──

function SearchCheckin({
  eventId,
  onCheckin,
}: {
  eventId: string;
  onCheckin: (id: string) => Promise<boolean>;
}) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkinLoading, setCheckinLoading] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/registrations?eventId=${eventId}`);
      const json = await res.json();
      if (json.data) {
        setRegistrations(
          json.data.filter((r: Registration) => r.status === "APPROVED" || r.status === "ATTENDED")
        );
      }
      setLoading(false);
    })();
  }, [eventId]);

  const filtered = registrations.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
  });

  const handleCheckin = async (id: string) => {
    setCheckinLoading(id);
    const success = await onCheckin(id);
    if (success) {
      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "ATTENDED", checkedInAt: new Date().toISOString() } : r
        )
      );
    }
    setCheckinLoading(null);
  };

  if (loading) {
    return (
      <div className="glass-card rounded-lg p-8 text-center">
        <p className="text-on-surface-variant text-sm">Loading registrations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/70 backdrop-blur text-sm text-on-surface border border-outline-variant/20 focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>
      {filtered.length === 0 ? (
        <div className="glass-card rounded-lg p-6 text-center">
          <p className="text-on-surface-variant text-sm">No approved registrations found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="glass-card rounded-md p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-on-surface truncate">{r.name}</span>
                  {r.status === "ATTENDED" && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                      CHECKED IN
                    </span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant truncate">{r.email}</p>
              </div>
              {r.status === "APPROVED" && (
                <button
                  onClick={() => handleCheckin(r.id)}
                  disabled={checkinLoading === r.id}
                  className="rounded-full px-4 py-1.5 text-xs font-bold bg-primary text-on-primary hover:bg-primary-container transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {checkinLoading === r.id ? "..." : "Check In"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── QR Scanner ──

function QrCheckin({
  eventId,
  onCheckin,
}: {
  eventId: string;
  onCheckin: (id: string) => Promise<boolean>;
}) {
  const [cameraActive, setCameraActive] = useState(false);
  const [manualId, setManualId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<unknown>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    readerRef.current = null;
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const startCamera = async () => {
    try {
      // Dynamic import of @zxing/browser
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      setCameraActive(true);

      // Wait for video element
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (!videoRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      reader.decodeFromVideoElement(videoRef.current, async (result) => {
        if (result && !processing) {
          const text = result.getText();
          // The QR code contains the registration ID
          const regId = text.trim();
          if (!regId) return;

          setProcessing(true);
          const success = await onCheckin(regId);
          setLastResult({
            msg: success ? "Check-in successful!" : "Check-in failed",
            type: success ? "success" : "error",
          });
          // Brief pause before next scan
          setTimeout(() => setProcessing(false), 2000);
        }
      });
    } catch (err) {
      console.error("Camera error:", err);
      setLastResult({
        msg: "Failed to access camera. Please use manual check-in.",
        type: "error",
      });
    }
  };

  const handleManualCheckin = async () => {
    if (!manualId.trim()) return;
    setProcessing(true);
    const success = await onCheckin(manualId.trim());
    setLastResult({
      msg: success ? "Check-in successful!" : "Check-in failed",
      type: success ? "success" : "error",
    });
    if (success) setManualId("");
    setProcessing(false);
  };

  return (
    <div className="space-y-4">
      {/* QR Camera */}
      <div className="glass-card rounded-md p-4">
        {!cameraActive ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto mb-4 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V5a2 2 0 012-2h4M3 15v4a2 2 0 002 2h4m8-18h4a2 2 0 012 2v4m0 6v4a2 2 0 01-2 2h-4" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h6v6H9z" />
            </svg>
            <p className="text-sm text-on-surface-variant mb-4">
              Point the camera at a registration QR code
            </p>
            <button
              onClick={startCamera}
              className="rounded-full px-6 py-2.5 text-sm font-bold bg-primary text-on-primary hover:bg-primary-container transition-colors"
            >
              Start Camera
            </button>
          </div>
        ) : (
          <div>
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video mb-3">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {processing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">Processing...</span>
                </div>
              )}
            </div>
            <button
              onClick={stopCamera}
              className="rounded-full px-4 py-2 text-sm font-bold bg-error/10 text-error hover:bg-error/20 transition-colors"
            >
              Stop Camera
            </button>
          </div>
        )}
      </div>

      {/* Last result */}
      {lastResult && (
        <div
          className={`glass-card rounded-md p-4 border-l-4 ${
            lastResult.type === "success"
              ? "border-green-500 bg-green-50/50"
              : "border-error bg-error/5"
          }`}
        >
          <p className={`text-sm font-semibold ${lastResult.type === "success" ? "text-green-800" : "text-error"}`}>
            {lastResult.msg}
          </p>
        </div>
      )}

      {/* Manual ID input removed — QR Scanner + Search covers all check-in scenarios */}
    </div>
  );
}

// ── Helpers ──

function toLocalDatetimeString(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDisplayDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
