'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { hospitalAdminApi } from '@/lib/hospitalAdminApi';
import type { Appointment } from '@/types/hospital';

export default function HospitalQueuePage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const response = await hospitalAdminApi.listAppointments('CONFIRMED');
      if (response.data) setAppointments(response.data);
      setLoading(false);
    };
    void load();
  }, []);

  const todaysQueue = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return appointments
      .filter((appointment) => appointment.start_datetime.slice(0, 10) === today)
      .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
  }, [appointments]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-dark">Queue Management</h1>
        <p className="mt-1 text-neutral-gray">Track today's confirmed appointments in order.</p>
      </div>

      <Card className="p-6">
        {loading ? (
          <p className="text-sm text-neutral-gray">Loading queue...</p>
        ) : todaysQueue.length === 0 ? (
          <p className="text-sm text-neutral-gray">No confirmed appointments in queue today.</p>
        ) : (
          <div className="space-y-3">
            {todaysQueue.map((appointment, index) => (
              <div
                key={appointment.id}
                className="flex flex-col gap-2 rounded-xl border border-neutral-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-gray">Queue #{index + 1}</p>
                  <p className="text-lg font-semibold text-neutral-dark">{appointment.patient_name}</p>
                  <p className="text-sm text-neutral-gray">Doctor: {appointment.doctor_name}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm font-semibold text-primary">
                    {new Date(appointment.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-neutral-gray">{appointment.patient_phone}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
