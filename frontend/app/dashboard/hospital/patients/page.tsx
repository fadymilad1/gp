'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { hospitalAdminApi } from '@/lib/hospitalAdminApi';
import { businessInfoApi } from '@/lib/api';
import { normalizeLogoUrl, getScopedItem } from '@/lib/storage';
import type { Appointment } from '@/types/hospital';
import { FiPrinter, FiChevronDown, FiChevronRight, FiUser, FiCalendar, FiFileText } from 'react-icons/fi';

type PatientWithAppointments = {
  name: string;
  email: string;
  phone: string;
  gender?: string;
  age?: number;
  appointments: Appointment[];
};

type DoctorGroup = {
  doctorId: string;
  doctorName: string;
  departmentName: string;
  dateStr: string;
  patients: PatientWithAppointments[];
  totalAppointments: number;
};

export default function HospitalPatientsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDoctors, setExpandedDoctors] = useState<Set<string>>(new Set());
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [hospitalInfo, setHospitalInfo] = useState<{name: string, logoUrl: string | null}>({ name: 'Medify', logoUrl: null });

  const getLocalDateString = (isoString: string) => {
    const d = new Date(isoString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDoctorAppointmentDates = (patients: PatientWithAppointments[]) => {
    const dates = new Set<string>();
    for (const patient of patients) {
      for (const appt of patient.appointments) {
        if (appt.status === 'CONFIRMED') {
          dates.add(getLocalDateString(appt.start_datetime));
        }
      }
    }
    return Array.from(dates).sort();
  };

  const formatDateLabel = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${Number(month)}/${Number(day)}/${year}`;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [apptsRes, infoRes] = await Promise.all([
          hospitalAdminApi.listAppointments(),
          businessInfoApi.get().catch(() => null)
        ]);

        if (apptsRes.data) setAppointments(apptsRes.data);
        
        let loadedName = 'Medify';
        let loadedLogo = null;

        if (infoRes && infoRes.data) {
          const infoData = infoRes.data as any;
          if (infoData) {
            if (infoData.name) loadedName = infoData.name;
            loadedLogo = normalizeLogoUrl(infoData.logo_url) || normalizeLogoUrl(infoData.logo);
          }
        }
        
        // Fallback to local storage (important if logo is too large for backend or hasn't synced)
        if (!loadedLogo || loadedName === 'Medify') {
          const snapshot = getScopedItem('businessInfo');
          if (snapshot) {
            try {
              const parsed = JSON.parse(snapshot);
              if (parsed.name && loadedName === 'Medify') loadedName = parsed.name;
              if (!loadedLogo) loadedLogo = normalizeLogoUrl(parsed.logo) || normalizeLogoUrl(parsed.logo_url);
            } catch (e) {}
          }
        }

        // Clean up redundant "Hospital's Hospital" if accidentally saved that way
        const cleanedName = loadedName
          .replace(/ Hospital's Hospital/gi, ' Hospital')
          .replace(/ Hospital Hospital/gi, ' Hospital');

        setHospitalInfo({
          name: cleanedName,
          logoUrl: loadedLogo
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filteredAppointments = useMemo(() => {
    if (!selectedDate) return appointments;
    return appointments.filter(appt => {
      const apptDateStr = getLocalDateString(appt.start_datetime);
      return apptDateStr === selectedDate;
    });
  }, [appointments, selectedDate]);

  const doctorGroups = useMemo<DoctorGroup[]>(() => {
    const doctorDateMap = new Map<string, {
      doctorId: string;
      doctorName: string;
      departmentName: string;
      dateStr: string;
      patientsMap: Map<string, PatientWithAppointments>;
    }>();

    for (const appointment of filteredAppointments) {
      const doctorId = appointment.doctor;
      const dateStr = getLocalDateString(appointment.start_datetime);
      const key = `${doctorId}|${dateStr}`;
      
      if (!doctorDateMap.has(key)) {
        doctorDateMap.set(key, {
          doctorId,
          doctorName: appointment.doctor_name || 'Unknown Doctor',
          departmentName: appointment.department_name || 'General',
          dateStr,
          patientsMap: new Map(),
        });
      }

      const entry = doctorDateMap.get(key)!;
      const patientKey = `${appointment.patient_name}|${appointment.patient_email}|${appointment.patient_phone}`;

      if (!entry.patientsMap.has(patientKey)) {
        entry.patientsMap.set(patientKey, {
          name: appointment.patient_name,
          email: appointment.patient_email,
          phone: appointment.patient_phone,
          gender: appointment.patient_gender,
          age: appointment.patient_age,
          appointments: [],
        });
      }

      entry.patientsMap.get(patientKey)!.appointments.push(appointment);
    }

    const groups: DoctorGroup[] = [];
    for (const entry of doctorDateMap.values()) {
      const patients = [...entry.patientsMap.values()];
      groups.push({
        doctorId: entry.doctorId,
        doctorName: entry.doctorName,
        departmentName: entry.departmentName,
        dateStr: entry.dateStr,
        patients: patients.sort((a, b) => a.name.localeCompare(b.name)),
        totalAppointments: patients.reduce((sum, p) => sum + p.appointments.length, 0),
      });
    }

    // Sort by date first, then by doctor name
    return groups.sort((a, b) => {
      const dateCompare = a.dateStr.localeCompare(b.dateStr);
      if (dateCompare !== 0) return dateCompare;
      return a.doctorName.localeCompare(b.doctorName);
    });
  }, [filteredAppointments]);

  const uniqueDepartments = useMemo(() => {
    const depts = new Set<string>();
    doctorGroups.forEach(g => depts.add(g.departmentName));
    return Array.from(depts).sort();
  }, [doctorGroups]);

  const filteredDoctorsByDept = useMemo(() => {
    if (selectedDepartment === 'all') return doctorGroups;
    return doctorGroups.filter(g => g.departmentName === selectedDepartment);
  }, [doctorGroups, selectedDepartment]);

  const uniqueDoctorsForFilter = useMemo(() => {
    const seen = new Set<string>();
    const result: { doctorId: string; doctorName: string }[] = [];
    for (const group of filteredDoctorsByDept) {
      if (!seen.has(group.doctorId)) {
        seen.add(group.doctorId);
        result.push({
          doctorId: group.doctorId,
          doctorName: group.doctorName,
        });
      }
    }
    return result.sort((a, b) => a.doctorName.localeCompare(b.doctorName));
  }, [filteredDoctorsByDept]);

  const filteredGroups = selectedDoctor === 'all' 
    ? filteredDoctorsByDept 
    : filteredDoctorsByDept.filter(g => g.doctorId === selectedDoctor);

  const toggleDoctor = (key: string) => {
    setExpandedDoctors(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handlePrint = (doctorId?: string, targetDate?: string) => {
    let apptsToPrint = appointments.filter(appt => appt.status === 'CONFIRMED');

    if (doctorId) {
      apptsToPrint = apptsToPrint.filter(appt => appt.doctor === doctorId);
    } else {
      if (selectedDoctor !== 'all') {
        apptsToPrint = apptsToPrint.filter(appt => appt.doctor === selectedDoctor);
      }
      if (selectedDepartment !== 'all') {
        apptsToPrint = apptsToPrint.filter(appt => appt.department_name === selectedDepartment);
      }
    }
    
    const activeDateFilter = targetDate || selectedDate;
    if (activeDateFilter) {
      apptsToPrint = apptsToPrint.filter(appt => getLocalDateString(appt.start_datetime) === activeDateFilter);
    }

    const printMap = new Map<string, {
      doctorId: string;
      doctorName: string;
      departmentName: string;
      dateStr: string;
      appointments: Appointment[];
    }>();

    for (const appt of apptsToPrint) {
      const dateStr = getLocalDateString(appt.start_datetime);
      const key = `${appt.doctor}|${dateStr}`;
      if (!printMap.has(key)) {
        printMap.set(key, {
          doctorId: appt.doctor,
          doctorName: appt.doctor_name || 'Unknown Doctor',
          departmentName: appt.department_name || 'General',
          dateStr,
          appointments: [],
        });
      }
      printMap.get(key)!.appointments.push(appt);
    }

    const printGroups = Array.from(printMap.values()).map(group => {
      const patientMap = new Map<string, PatientWithAppointments>();
      for (const appt of group.appointments) {
        const patientKey = `${appt.patient_name}|${appt.patient_email}|${appt.patient_phone}`;
        if (!patientMap.has(patientKey)) {
          patientMap.set(patientKey, {
            name: appt.patient_name,
            email: appt.patient_email,
            phone: appt.patient_phone,
            gender: appt.patient_gender,
            age: appt.patient_age,
            appointments: [],
          });
        }
        patientMap.get(patientKey)!.appointments.push(appt);
      }

      const patients = Array.from(patientMap.values()).sort((a, b) => a.name.localeCompare(b.name));

      return {
        doctorId: group.doctorId,
        doctorName: group.doctorName,
        departmentName: group.departmentName,
        dateStr: group.dateStr,
        patients,
        totalAppointments: group.appointments.length,
      };
    });

    printGroups.sort((a, b) => {
      const dateCompare = a.dateStr.localeCompare(b.dateStr);
      if (dateCompare !== 0) return dateCompare;
      return a.doctorName.localeCompare(b.doctorName);
    });

    if (printGroups.length === 0) {
      alert("No confirmed appointments found.");
      return;
    }

    const uniqueDoctorsCount = new Set(printGroups.map(g => g.doctorId)).size;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Patient List - ${doctorId ? printGroups[0]?.doctorName : 'All Doctors'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            .brand-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 25px; }
            .brand-logo { display: flex; align-items: center; gap: 12px; }
            .brand-text { font-size: 26px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.5px; }
            h1 { color: #4b5563; font-size: 18px; font-weight: 600; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
            .doctor-header { display: flex; flex-direction: column; margin-top: 35px; margin-bottom: 15px; }
            h2 { color: #2563eb; margin: 0; font-size: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; background: white; }
            th { background-color: #f3f4f6; padding: 12px 8px; text-align: left; border: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 13px; }
            td { padding: 10px 8px; border: 1px solid #e5e7eb; font-size: 13px; vertical-align: top; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .header-info { display: flex; justify-content: space-between; margin-bottom: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px; }
            .summary { margin-bottom: 20px; padding: 15px; background: #eff6ff; border-left: 4px solid #2563eb; }
            .appointment-list { margin: 0; padding: 0; list-style: none; }
            .appointment-item { padding: 4px 0; font-size: 12px; }
            .appointment-time { color: #6b7280; font-weight: 600; }
            .checkbox-box { display: inline-block; width: 16px; height: 16px; border: 1.5px solid #6b7280; border-radius: 3px; vertical-align: text-bottom; }
            @media print { .no-print { display: none; } body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="brand-header">
            <div class="brand-logo">
              ${hospitalInfo.logoUrl ? `<img src="${hospitalInfo.logoUrl}" alt="Hospital Logo" style="max-height: 40px; max-width: 120px; object-fit: contain;" />` : `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`}
              <div class="brand-text">${hospitalInfo.name}</div>
            </div>
            <h1>Patient Schedule</h1>
          </div>
          <div class="header-info">
            <div>
              <strong>Generated:</strong> ${new Date().toLocaleString()}
              ${selectedDate ? `<br/><strong>Schedule Date:</strong> ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : ''}
            </div>
            <div><strong>Total Doctors:</strong> ${uniqueDoctorsCount}</div>
          </div>
          
          ${printGroups.map(group => {
            const formattedDate = new Date(group.dateStr + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });

            return `
            <div style="page-break-inside: avoid; page-break-after: always; margin-bottom: 40px;">
              <div class="doctor-header" style="border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px;">
                <h2 style="font-size: 22px; color: #1e3a8a;">${group.doctorName}</h2>
                <div style="font-size: 14px; color: #4b5563; font-weight: 600; margin-top: 4px;">
                  ${group.departmentName} Department &bull; ${formattedDate}
                </div>
              </div>
              <div class="summary">
                <strong>Total Patients:</strong> ${group.patients.length} | 
                <strong>Total Appointments:</strong> ${group.totalAppointments}
              </div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 5%;">#</th>
                    <th style="width: 25%;">Patient Name</th>
                    <th style="width: 20%;">Phone</th>
                    <th style="width: 15%;">Age/Gender</th>
                    <th style="width: 25%;">Appointment Time</th>
                    <th style="width: 10%; text-align: center;">Arrived</th>
                  </tr>
                </thead>
                <tbody>
                  ${group.patients.map((patient, idx) => {
                    const sortedAppts = patient.appointments.sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
                    return `
                    <tr>
                      <td>${idx + 1}</td>
                      <td><strong>${patient.name}</strong></td>
                      <td>${patient.phone}</td>
                      <td>${patient.age || '-'} / ${patient.gender || '-'}</td>
                      <td>
                        <ul class="appointment-list">
                          ${sortedAppts.map(a => `<li class="appointment-item"><span class="appointment-time">${new Date(a.start_datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span></li>`).join('')}
                        </ul>
                      </td>
                      <td style="text-align: center; vertical-align: middle;"><span class="checkbox-box"></span></td>
                    </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
            `;
          }).join('')}
          
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-dark">Patients by Doctor</h1>
          <p className="mt-1 text-neutral-gray">Patient records grouped by their treating physician.</p>
        </div>
        <Button
          variant="primary"
          onClick={() => handlePrint()}
          disabled={loading || doctorGroups.length === 0}
        >
          <FiPrinter className="mr-2" />
          Print All
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-neutral-dark">Filter by Department:</label>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSelectedDoctor('all'); // Reset doctor when department changes
              }}
              className="rounded-lg border border-neutral-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
            >
              <option value="all">All Departments</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-neutral-dark">Filter by Doctor:</label>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="rounded-lg border border-neutral-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
            >
              <option value="all">All Doctors ({uniqueDoctorsForFilter.length})</option>
              {uniqueDoctorsForFilter.map(doc => (
                <option key={doc.doctorId} value={doc.doctorId}>
                  {doc.doctorName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-neutral-dark">Filter by Date:</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-lg border border-neutral-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
              />
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate('')}
                  className="text-xs text-primary hover:text-primary-dark font-semibold transition"
                >
                  Clear Date
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Doctor Groups */}
      {loading ? (
        <Card className="p-6">
          <div className="text-sm text-neutral-gray">Loading patients...</div>
        </Card>
      ) : filteredGroups.length === 0 ? (
        <Card className="p-6">
          <div className="text-sm text-neutral-gray">No patients yet.</div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => {
            const compositeKey = `${group.doctorId}|${group.dateStr}`;
            const isExpanded = expandedDoctors.has(compositeKey);
            
            return (
              <Card key={compositeKey} className="overflow-hidden">
                {/* Doctor Header */}
                <div
                  className="flex items-center justify-between bg-neutral-light p-4 cursor-pointer hover:bg-neutral-light/80 transition"
                  onClick={() => toggleDoctor(compositeKey)}
                >
                  <div className="flex items-center gap-3">
                    <button className="text-neutral-gray">
                      {isExpanded ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}
                    </button>
                    <div>
                      <h3 className="font-bold text-neutral-dark flex items-center gap-2">
                        <FiUser size={18} />
                        {group.doctorName} <span className="text-sm font-normal text-neutral-gray">— {formatDateLabel(group.dateStr)}</span>
                      </h3>
                      <p className="text-sm text-neutral-gray mt-0.5">
                        {group.patients.length} patient{group.patients.length !== 1 ? 's' : ''} • {group.totalAppointments} appointment{group.totalAppointments !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrint(group.doctorId, group.dateStr);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
                  >
                    <FiFileText size={12} className="mr-1" />
                    Sheet {formatDateLabel(group.dateStr)}
                  </Button>
                </div>

                {/* Patient List */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-neutral-light/50">
                        <tr className="text-left text-neutral-gray">
                          <th className="px-4 py-3 font-medium">#</th>
                          <th className="px-4 py-3 font-medium">Patient Name</th>
                          <th className="px-4 py-3 font-medium">Phone</th>
                          <th className="px-4 py-3 font-medium">Email</th>
                          <th className="px-4 py-3 font-medium">Department</th>
                          <th className="px-4 py-3 font-medium text-center">Appointments</th>
                          <th className="px-4 py-3 font-medium">Last Visit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.patients.map((patient, idx) => {
                          const lastAppointment = patient.appointments.sort((a, b) => 
                            new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime()
                          )[0];
                          
                          return (
                            <tr key={idx} className="border-t border-neutral-border hover:bg-neutral-light/30">
                              <td className="px-4 py-3 text-sm text-neutral-gray font-medium">{idx + 1}</td>
                              <td className="px-4 py-3 font-semibold text-neutral-dark">{patient.name}</td>
                              <td className="px-4 py-3 text-neutral-gray">{patient.phone}</td>
                              <td className="px-4 py-3 text-neutral-gray">{patient.email}</td>
                              <td className="px-4 py-3">
                                <span className="text-xs font-medium text-primary px-2.5 py-1 bg-primary/10 rounded-full inline-block">
                                  {group.departmentName}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                  <FiCalendar size={12} />
                                  {patient.appointments.length}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-neutral-gray">
                                {new Date(lastAppointment.start_datetime).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
