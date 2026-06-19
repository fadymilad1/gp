'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { getScopedItem } from '@/lib/storage';
import { hospitalAdminApi } from '@/lib/hospitalAdminApi';
import { SubscriptionProvider, useSubscription } from '@/contexts/SubscriptionContext';
import { PublishGate } from '@/components/subscription/PublishGate';
import { PLAN_LABELS, PLAN_BADGE_CLASSES } from '@/lib/subscriptionApi';
import type { Appointment, Department, Doctor, HospitalProfile } from '@/types/hospital';

// ── Inner component (uses context) ──────────────────────────────────────────

function HospitalDashboardContent() {
  const [profile, setProfile] = useState<HospitalProfile | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [localPublished, setLocalPublished] = useState(false);

  const { canPublish, planType, isActive, loading: subLoading } = useSubscription();
  const { showToast } = useToast();

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
  const upcomingAppointments = useMemo(
    () =>
      [...appointments]
        .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
        .slice(0, 6),
    [appointments],
  );

  if (loading) {
    return <div className="text-sm text-neutral-gray">Loading hospital dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-dark">Hospital Dashboard</h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-neutral-gray">{profile?.name || 'Your hospital'} operations overview.</p>
            {/* Plan badge */}
            {!subLoading && (
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PLAN_BADGE_CLASSES[planType]}`}>
                {PLAN_LABELS[planType]}
                {isActive ? ' · Active' : ' · Inactive'}
              </span>
            )}
          </div>
        </div>

        {/* Smart publish button */}
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
      </div>

      {/* Subscription warning banner */}
      {!subLoading && !isActive && (
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

      {/* Upcoming appointments table */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-neutral-dark">Upcoming Appointments</h2>
          <Link href="/dashboard/hospital/appointments" className="text-sm font-semibold text-primary">
            View all
          </Link>
        </div>
        {upcomingAppointments.length === 0 ? (
          <p className="text-sm text-neutral-gray">No upcoming appointments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-border text-left text-neutral-gray">
                  <th className="px-2 py-2 font-medium">Patient</th>
                  <th className="px-2 py-2 font-medium">Doctor</th>
                  <th className="px-2 py-2 font-medium">Date &amp; Time</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingAppointments.map((appointment) => (
                  <tr key={appointment.id} className="border-b border-neutral-border/70">
                    <td className="px-2 py-3 font-medium text-neutral-dark">{appointment.patient_name}</td>
                    <td className="px-2 py-3 text-neutral-gray">{appointment.doctor_name}</td>
                    <td className="px-2 py-3 text-neutral-gray">
                      {new Date(appointment.start_datetime).toLocaleString()}
                    </td>
                    <td className="px-2 py-3">
                      <span className="rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary">
                        {appointment.status}
                      </span>
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
