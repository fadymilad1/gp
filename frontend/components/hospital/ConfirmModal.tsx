import React from 'react';
import { FiCheckCircle, FiXCircle, FiTrash2 } from 'react-icons/fi';
import type { Appointment } from '@/types/hospital';

interface ConfirmModalProps {
  open: boolean;
  action: 'CONFIRMED' | 'CANCELLED' | 'DELETED' | null;
  appointment: Appointment | null;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const COLOR_MAP = {
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-500',
    btnBg: 'bg-emerald-500',
    btnHover: 'hover:bg-emerald-600',
  },
  rose: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-500',
    btnBg: 'bg-rose-500',
    btnHover: 'hover:bg-rose-600',
  },
};

export function ConfirmModal({ open, action, appointment, loading, onConfirm, onClose }: ConfirmModalProps) {
  if (!open || !appointment || !action) return null;

  const isConfirm = action === 'CONFIRMED';
  const isDelete = action === 'DELETED';

  let Icon = isConfirm ? FiCheckCircle : (isDelete ? FiTrash2 : FiXCircle);
  let colors = isConfirm ? COLOR_MAP.emerald : COLOR_MAP.rose;
  let actionText = isConfirm ? 'Confirm' : (isDelete ? 'Delete' : 'Cancel');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Icon */}
        <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border ${colors.bg} ${colors.border}`}>
          <Icon className={colors.text} size={30} />
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-neutral-dark mb-2">
          {actionText} Appointment?
        </h2>

        {/* Detail card */}
        <div className="mb-6 rounded-xl border border-neutral-border bg-neutral-50 px-4 py-3 text-left space-y-1.5">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-neutral-gray w-20 shrink-0">Patient</span>
            <span className="font-semibold text-neutral-dark">{appointment.patient_name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-neutral-gray w-20 shrink-0">Doctor</span>
            <span className="font-semibold text-neutral-dark">{appointment.doctor_name}</span>
          </div>
          {appointment.department_name && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-neutral-gray w-20 shrink-0">Dept.</span>
              <span className="font-semibold text-neutral-dark">{appointment.department_name}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-neutral-gray w-20 shrink-0">Time</span>
            <span className="font-semibold text-neutral-dark">
              {new Date(appointment.start_datetime).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-neutral-border px-4 py-2.5 text-sm font-semibold text-neutral-dark hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${colors.btnBg} ${colors.btnHover}`}
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <><Icon size={14} /> Yes, {actionText}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
