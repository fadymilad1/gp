'use client';

import { FiTrash2, FiPhone, FiMail, FiSearch, FiFilter } from 'react-icons/fi';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/hospital/ConfirmModal';
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [doctorFilter, setDoctorFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'CONFIRMED' | 'CANCELLED' | 'DELETED' | null>(null);
  const [modalAppointment, setModalAppointment] = useState<Appointment | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const response = await hospitalAdminApi.listAppointments();
      if (response.data) setAppointments(response.data);
      setLoading(false);
    };
    void load();
  }, []);

  const uniqueDoctors = useMemo(() => {
    const docs = new Set<string>();
    appointments.forEach(a => { if (a.doctor_name) docs.add(a.doctor_name); });
    return Array.from(docs).sort();
  }, [appointments]);

  const uniqueDepartments = useMemo(() => {
    const depts = new Set<string>();
    appointments.forEach(a => { if (a.department_name) depts.add(a.department_name); });
    return Array.from(depts).sort();
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return appointments.filter((appointment) => {
      if (statusFilter !== 'ALL' && appointment.status !== statusFilter) return false;
      if (departmentFilter !== 'ALL' && appointment.department_name !== departmentFilter) return false;
      if (doctorFilter !== 'ALL' && appointment.doctor_name !== doctorFilter) return false;

      if (startDate) {
        if (new Date(appointment.start_datetime) < new Date(startDate)) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(appointment.start_datetime) > end) return false;
      }

      if (!query) return true;
      return (
        appointment.patient_name.toLowerCase().includes(query) ||
        appointment.doctor_name.toLowerCase().includes(query) ||
        appointment.patient_email.toLowerCase().includes(query)
      );
    });
  }, [appointments, search, statusFilter, departmentFilter, doctorFilter, startDate, endDate]);

  const displayedAppointments = useMemo(() => {
    return showAll ? filteredAppointments : filteredAppointments.slice(0, 10);
  }, [filteredAppointments, showAll]);

  // Reset showAll when filters change
  useEffect(() => {
    setShowAll(false);
  }, [search, statusFilter, departmentFilter, doctorFilter, startDate, endDate]);

  const openModal = (appointment: Appointment, action: 'CONFIRMED' | 'CANCELLED' | 'DELETED') => {
    setModalAppointment(appointment);
    setModalAction(action);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (actionLoading) return;
    setModalOpen(false);
    setModalAppointment(null);
    setModalAction(null);
  };

  const handleConfirmAction = async () => {
    if (!modalAppointment || !modalAction) return;
    setActionLoading(true);
    
    if (modalAction === 'DELETED') {
      const response = await hospitalAdminApi.deleteAppointment(modalAppointment.id);
      setActionLoading(false);
      if (!response.error) {
        setAppointments((current) => current.filter((a) => a.id !== modalAppointment.id));
      }
    } else {
      const response = await hospitalAdminApi.updateAppointmentStatus(modalAppointment.id, modalAction);
      setActionLoading(false);
      if (response.data) {
        setAppointments((current) =>
          current.map((appointment) =>
            appointment.id === modalAppointment.id ? response.data as Appointment : appointment,
          ),
        );
      }
    }
    closeModal();
  };

  return (
    <div className="space-y-6">
      <ConfirmModal
        open={modalOpen}
        action={modalAction}
        appointment={modalAppointment}
        loading={actionLoading}
        onConfirm={handleConfirmAction}
        onClose={closeModal}
      />
      
      <div>
        <h1 className="text-3xl font-bold text-neutral-dark">Appointments</h1>
        <p className="mt-1 text-neutral-gray">Manage patient bookings and status updates.</p>
      </div>

      <Card className="p-5 flex flex-col gap-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search patient, doctor, or email..."
              className="input-field pl-10 w-full"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FiFilter className="text-neutral-gray mr-1 hidden sm:block" />
            {(['ALL', 'PENDING', 'CONFIRMED', 'CANCELLED'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
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

        {/* Advanced Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-neutral-border">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-gray mb-1.5">From Date</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              className="input-field w-full text-sm" 
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-gray mb-1.5">To Date</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              className="input-field w-full text-sm" 
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-gray mb-1.5">Department</label>
            <select 
              value={departmentFilter} 
              onChange={e => setDepartmentFilter(e.target.value)} 
              className="input-field w-full text-sm bg-white"
            >
              <option value="ALL">All Departments</option>
              {uniqueDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-gray mb-1.5">Doctor</label>
            <select 
              value={doctorFilter} 
              onChange={e => setDoctorFilter(e.target.value)} 
              className="input-field w-full text-sm bg-white"
            >
              <option value="ALL">All Doctors</option>
              {uniqueDoctors.map(doc => <option key={doc} value={doc}>{doc}</option>)}
            </select>
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
                  <th className="px-4 py-3 font-medium">Age</th>
                  <th className="px-4 py-3 font-medium">Gender</th>
                  <th className="px-4 py-3 font-medium">Doctor</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Date & Time</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedAppointments.map((appointment) => (
                  <tr key={appointment.id} className="border-t border-neutral-border">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-neutral-dark text-sm">{appointment.patient_name}</span>
                        <div className="flex items-center gap-1.5 text-neutral-gray">
                          <FiMail size={12} className="shrink-0" />
                          <span className="text-xs truncate max-w-[150px]" title={appointment.patient_email}>
                            {appointment.patient_email}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-neutral-gray">
                          <FiPhone size={12} className="shrink-0" />
                          <span className="text-xs font-medium">{appointment.patient_phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-dark font-medium text-sm">{appointment.patient_age || '-'}</td>
                    <td className="px-4 py-3 text-neutral-dark font-medium text-sm">{appointment.patient_gender || '-'}</td>
                    <td className="px-4 py-3 text-neutral-dark font-medium">{appointment.doctor_name}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-primary px-2.5 py-1 bg-primary/10 rounded-full inline-block">
                        {appointment.department_name || 'General'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-gray">
                      {new Date(appointment.start_datetime).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[appointment.status]}`}>
                        {appointment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {appointment.status === 'PENDING' ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            className="px-3 py-1.5 text-xs"
                            onClick={() => openModal(appointment, 'CONFIRMED')}
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="secondary"
                            className="px-3 py-1.5 text-xs"
                            onClick={() => openModal(appointment, 'CANCELLED')}
                          >
                            Cancel
                          </Button>
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
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
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
            {!showAll && filteredAppointments.length > 10 && (
              <div className="p-4 flex justify-center border-t border-neutral-border bg-neutral-50/50">
                <Button 
                  variant="secondary" 
                  onClick={() => setShowAll(true)} 
                  className="text-xs px-6 py-2 shadow-sm font-semibold text-neutral-dark hover:bg-neutral-100"
                >
                  View All {filteredAppointments.length} Appointments
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
