'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { getScopedItem } from '@/lib/storage';
import { hospitalAdminApi } from '@/lib/hospitalAdminApi';
import { SubscriptionProvider, useSubscription } from '@/contexts/SubscriptionContext';
import { PublishGate } from '@/components/subscription/PublishGate';
import { PLAN_LABELS, PLAN_BADGE_CLASSES } from '@/lib/subscriptionApi';
import type { Appointment, AppointmentStatus, Department, Doctor, HospitalProfile } from '@/types/hospital';
import { FiCheckCircle, FiXCircle, FiSearch, FiTrash2 } from 'react-icons/fi';
import { ConfirmModal } from '@/components/hospital/ConfirmModal';

// ── Confirmation Modal ────────────────────────────────────────────────────────

// Removed ConfirmModal (extracted)

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  PENDING:   'bg-amber-50 text-amber-700 border border-amber-200',
  CONFIRMED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-500 border border-rose-200',
};

// ── Inner component (uses context) ──────────────────────────────────────────

function HospitalDashboardContent() {
  const [profile, setProfile] = useState<HospitalProfile | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [localPublished, setLocalPublished] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isStaff, setIsStaff] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'CONFIRMED' | 'CANCELLED' | 'DELETED' | null>(null);
  const [modalAppointment, setModalAppointment] = useState<Appointment | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { canPublish, planType, isActive, loading: subLoading } = useSubscription();
  const { showToast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          setIsStaff(!!(user.is_staff || user.is_staff === 'true'));
        } catch (e) {}
      }
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const [profileRes, doctorRes, departmentRes, appointmentRes] = await Promise.all([
        hospitalAdminApi.getProfile(),
        hospitalAdminApi.listDoctors(),
        hospitalAdminApi.listDepartments(),
        hospitalAdminApi.listAppointments(),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (doctorRes.data) setDoctors(doctorRes.data);
      if (departmentRes.data) setDepartments(departmentRes.data);
      if (appointmentRes.data) setAppointments(appointmentRes.data);
      setLoading(false);
    };
    void load();
  }, []);

  useEffect(() => {
    const stored = getScopedItem('isPublished');
    setLocalPublished(stored === 'true');
  }, []);

  const pendingCount = useMemo(
    () => appointments.filter((a) => a.status === 'PENDING').length,
    [appointments],
  );
  const confirmedCount = useMemo(
    () => appointments.filter((a) => a.status === 'CONFIRMED').length,
    [appointments],
  );
  const publishedWebsiteUrl = useMemo(() => {
    if (!profile?.subdomain) return null;
    if (!profile?.is_published && !localPublished) return null;
    if (typeof window === 'undefined') return null;
    return `${window.location.protocol}//${profile.subdomain}.${window.location.host}`;
  }, [profile?.subdomain, profile?.is_published, localPublished]);

  const upcomingAppointments = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const query = searchQuery.toLowerCase();
    
    return [...appointments]
      .filter((a) => {
        const apptDate = new Date(a.start_datetime);
        const apptStr = `${apptDate.getFullYear()}-${String(apptDate.getMonth() + 1).padStart(2, '0')}-${String(apptDate.getDate()).padStart(2, '0')}`;
        
        const isToday = apptStr === todayStr;
        const matchesSearch = !query || 
          a.patient_name.toLowerCase().includes(query) || 
          a.doctor_name.toLowerCase().includes(query) || 
          (a.department_name && a.department_name.toLowerCase().includes(query));
          
        return isToday && matchesSearch;
      })
      .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
  }, [appointments, searchQuery]);

  // Open confirmation modal
  const openModal = useCallback((appointment: Appointment, action: 'CONFIRMED' | 'CANCELLED' | 'DELETED') => {
    setModalAppointment(appointment);
    setModalAction(action);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (actionLoading) return;
    setModalOpen(false);
    setModalAppointment(null);
    setModalAction(null);
  }, [actionLoading]);

  // Execute the status change
  const handleConfirmAction = useCallback(async () => {
    if (!modalAppointment || !modalAction) return;
    setActionLoading(true);

    if (modalAction === 'DELETED') {
      const res = await hospitalAdminApi.deleteAppointment(modalAppointment.id);
      setActionLoading(false);
      if (res.error) {
        showToast({ type: 'error', title: 'Action failed', message: res.error });
      } else {
        setAppointments((prev) => prev.filter((a) => a.id !== modalAppointment.id));
        showToast({
          type: 'success',
          title: 'Appointment Deleted',
          message: `${modalAppointment.patient_name}'s appointment has been deleted.`,
        });
        closeModal();
      }
    } else {
      const res = await hospitalAdminApi.updateAppointmentStatus(modalAppointment.id, modalAction);
      setActionLoading(false);
      if (res.error) {
        showToast({ type: 'error', title: 'Action failed', message: res.error });
      } else {
        setAppointments((prev) =>
          prev.map((a) => (a.id === modalAppointment.id ? { ...a, status: modalAction } : a)),
        );
        showToast({
          type: 'success',
          title: modalAction === 'CONFIRMED' ? 'Appointment Confirmed' : 'Appointment Cancelled',
          message: `${modalAppointment.patient_name}'s appointment has been ${modalAction.toLowerCase()}.`,
        });
        closeModal();
      }
    }
  }, [modalAppointment, modalAction, showToast, closeModal]);

  if (loading) {
    return <div className="text-sm text-neutral-gray">Loading hospital dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Confirmation Modal */}
      <ConfirmModal
        open={modalOpen}
        action={modalAction}
        appointment={modalAppointment}
        loading={actionLoading}
        onConfirm={handleConfirmAction}
        onClose={closeModal}
      />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-dark">Hospital Dashboard</h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-neutral-gray">{profile?.name || 'Your hospital'} operations overview.</p>
            {/* Plan badge */}
            {!isStaff && !subLoading && (
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PLAN_BADGE_CLASSES[planType]}`}>
                {PLAN_LABELS[planType]}
                {isActive ? ' · Active' : ' · Inactive'}
              </span>
            )}
          </div>
        </div>

        {/* Smart publish button */}
        {!isStaff && (
          <div className="flex flex-wrap items-center gap-3">
            <PublishGate
              canPublish={canPublish}
              label="Update Website Info"
              onPublish={() => {
                window.location.href = '/dashboard/business-info';
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (publishedWebsiteUrl) {
                  window.open(publishedWebsiteUrl, '_blank', 'noopener,noreferrer');
                } else {
                  showToast({
                    type: 'info',
                    title: 'Publish first',
                    message: 'Publish your website to view the live site.',
                  });
                }
              }}
            >
              See My Website
            </Button>
          </div>
        )}
      </div>

      {/* Subscription warning banner */}
      {!isStaff && !subLoading && !isActive && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
          <span className="text-amber-500 text-lg mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">No active subscription</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Some features are locked.{' '}
              <Link href="/dashboard/hospital/setup" className="underline font-semibold hover:text-amber-900">
                Upgrade your plan →
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm text-neutral-gray">Total Appointments</p>
          <p className="mt-2 text-3xl font-bold text-neutral-dark">{appointments.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-neutral-gray">Pending</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{pendingCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-neutral-gray">Confirmed</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{confirmedCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-neutral-gray">Doctors / Departments</p>
          <p className="mt-2 text-3xl font-bold text-neutral-dark">
            {doctors.length} / {departments.length}
          </p>
        </Card>
      </div>

      {/* Today's appointments table */}
      <Card className="p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-neutral-dark">Today's Appointments</h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" size={15} />
              <input
                type="text"
                placeholder="Search appointments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 rounded-xl border border-neutral-border bg-neutral-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <Link href="/dashboard/hospital/appointments" className="text-sm font-semibold text-primary whitespace-nowrap">
              View all
            </Link>
          </div>
        </div>
        {upcomingAppointments.length === 0 ? (
          <p className="text-sm text-neutral-gray">No appointments scheduled for today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-border text-left text-neutral-gray">
                  <th className="px-2 py-2 font-medium">Patient</th>
                  <th className="px-2 py-2 font-medium">Doctor</th>
                  <th className="px-2 py-2 font-medium">Department</th>
                  <th className="px-2 py-2 font-medium">Date & Time</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcomingAppointments.map((appointment) => (
                  <tr key={appointment.id} className="border-b border-neutral-border/70">
                    <td className="px-2 py-3 font-medium text-neutral-dark">{appointment.patient_name}</td>
                    <td className="px-2 py-3 text-neutral-gray">{appointment.doctor_name}</td>
                    <td className="px-2 py-3 text-neutral-gray">{appointment.department_name ?? '—'}</td>
                    <td className="px-2 py-3 text-neutral-gray">
                      {new Date(appointment.start_datetime).toLocaleString()}
                    </td>
                    <td className="px-2 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[appointment.status]}`}>
                        {appointment.status}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      {appointment.status === 'PENDING' ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openModal(appointment, 'CONFIRMED')}
                            className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors"
                          >
                            <FiCheckCircle size={12} />
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => openModal(appointment, 'CANCELLED')}
                            className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
                          >
                            <FiXCircle size={12} />
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => openModal(appointment, 'DELETED')}
                            className="p-1.5 ml-1 rounded-md text-neutral-gray hover:text-rose-500 hover:bg-rose-50 transition-colors flex items-center"
                            title="Delete appointment"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium border ${
                            appointment.status === 'CONFIRMED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {appointment.status === 'CONFIRMED' ? (
                              <FiCheckCircle size={12} />
                            ) : (
                              <FiXCircle size={12} />
                            )}
                            Status Locked
                          </div>
                          <button
                            type="button"
                            onClick={() => openModal(appointment, 'DELETED')}
                            className="p-1.5 rounded-md text-neutral-gray hover:text-rose-500 hover:bg-rose-50 transition-colors"
                            title="Delete appointment"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Page (wraps content in SubscriptionProvider) ─────────────────────────────

export default function HospitalDashboardHomePage() {
  return (
    <SubscriptionProvider>
      <HospitalDashboardContent />
    </SubscriptionProvider>
  );
}



