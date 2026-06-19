'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { hospitalAdminApi } from '@/lib/hospitalAdminApi';
import type { Appointment, AppointmentStatus } from '@/types/hospital';

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
  CONFIRMED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border border-red-200',
};

export default function HospitalAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const response = await hospitalAdminApi.listAppointments();
      if (response.data) setAppointments(response.data);
      setLoading(false);
    };
    void load();
  }, []);

  const filteredAppointments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return appointments.filter((appointment) => {
      if (statusFilter !== 'ALL' && appointment.status !== statusFilter) return false;
      if (!query) return true;
      return (
        appointment.patient_name.toLowerCase().includes(query) ||
        appointment.doctor_name.toLowerCase().includes(query) ||
        appointment.patient_email.toLowerCase().includes(query)
      );
    });
  }, [appointments, search, statusFilter]);

  const updateStatus = async (appointmentId: string, status: AppointmentStatus) => {
    setUpdatingId(appointmentId);
    const response = await hospitalAdminApi.updateAppointmentStatus(appointmentId, status);
    if (response.data) {
      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === appointmentId ? response.data as Appointment : appointment,
        ),
      );
    }
    setUpdatingId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-dark">Appointments</h1>
        <p className="mt-1 text-neutral-gray">Manage patient bookings and status updates.</p>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search patient, doctor, or email..."
            className="input-field w-full md:max-w-md"
          />
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'PENDING', 'CONFIRMED', 'CANCELLED'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold border ${
                  statusFilter === status
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-neutral-gray border-neutral-border hover:border-primary hover:text-primary'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-neutral-gray">Loading appointments...</div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-6 text-sm text-neutral-gray">No appointments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-light">
                <tr className="text-left text-neutral-gray">
                  <th className="px-4 py-3 font-medium">Patient</th>
                  <th className="px-4 py-3 font-medium">Doctor</th>
                  <th className="px-4 py-3 font-medium">Date & Time</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appointment) => (
                  <tr key={appointment.id} className="border-t border-neutral-border">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-neutral-dark">{appointment.patient_name}</p>
                      <p className="text-xs text-neutral-gray">{appointment.patient_email}</p>
                      <p className="text-xs text-neutral-gray">{appointment.patient_phone}</p>
                    </td>
                    <td className="px-4 py-3 text-neutral-dark">{appointment.doctor_name}</td>
                    <td className="px-4 py-3 text-neutral-gray">
                      {new Date(appointment.start_datetime).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[appointment.status]}`}>
                        {appointment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          className="px-3 py-1.5 text-xs"
                          disabled={updatingId === appointment.id}
                          onClick={() => updateStatus(appointment.id, 'CONFIRMED')}
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="secondary"
                          className="px-3 py-1.5 text-xs"
                          disabled={updatingId === appointment.id}
                          onClick={() => updateStatus(appointment.id, 'CANCELLED')}
                        >
                          Cancel
                        </Button>
                      </div>
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
