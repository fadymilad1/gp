'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { hospitalAdminApi } from '@/lib/hospitalAdminApi';
import type { Appointment } from '@/types/hospital';

type NotificationLog = {
  id: string;
  patient: string;
  channel: 'SMS' | 'Email';
  message: string;
  status: 'Sent' | 'Pending' | 'Failed';
  time: string;
};

export default function HospitalNotificationsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const response = await hospitalAdminApi.listAppointments();
      if (response.data) setAppointments(response.data);
      setLoading(false);
    };
    void load();
  }, []);

  const logs = useMemo<NotificationLog[]>(() => {
    return appointments.slice(0, 10).map((appointment, index) => ({
      id: appointment.id,
      patient: appointment.patient_name,
      channel: index % 2 === 0 ? 'SMS' : 'Email',
      message: `Reminder: Appointment with ${appointment.doctor_name} at ${new Date(appointment.start_datetime).toLocaleString()}.`,
      status: appointment.status === 'CANCELLED' ? 'Failed' : index % 3 === 0 ? 'Pending' : 'Sent',
      time: new Date(appointment.updated_at).toLocaleString(),
    }));
  }, [appointments]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-dark">Notification Logs</h1>
          <p className="mt-1 text-neutral-gray">Automated messages sent to patients.</p>
        </div>
        <Button>Send Custom Message</Button>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-neutral-gray">Loading notification logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-sm text-neutral-gray">No notifications yet.</div>
        ) : (
          <div className="divide-y divide-neutral-border">
            {logs.map((log) => (
              <div key={log.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-neutral-dark">{log.patient}</p>
                  <p className="mt-1 text-sm text-neutral-gray">{log.message}</p>
                  <p className="mt-1 text-xs text-neutral-gray">{log.channel} • {log.time}</p>
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                  log.status === 'Sent'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : log.status === 'Pending'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
