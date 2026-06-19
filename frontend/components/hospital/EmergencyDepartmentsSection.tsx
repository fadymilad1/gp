import React from 'react';
import { getHospitalProfile, getHospitalDepartments } from '@/lib/hospitalApi';

export default async function EmergencyDepartmentsSection({ subdomain }: { subdomain: string }) {
    const profile = await getHospitalProfile(subdomain);
    const emergencyIds = (profile as any)?.theme_settings?.emergencyDepartmentIds;

    if (!emergencyIds || !Array.isArray(emergencyIds) || emergencyIds.length === 0) {
        return null;
    }

    const allDepartments = await getHospitalDepartments(subdomain);
    const emergencyDepartments = allDepartments.filter(d => emergencyIds.includes(d.id));

    if (emergencyDepartments.length === 0) return null;

    return (
        <section className="py-16 px-4 bg-red-50 border-y border-red-100">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-red-700 mb-3">Emergency Available Departments</h2>
                    <p className="text-red-700/80 max-w-2xl mx-auto">
                        These departments are equipped to handle critical emergencies 24/7. Immediate care is available.
                    </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {emergencyDepartments.map(dept => (
                        <div key={dept.id} className="bg-white p-5 rounded-xl border border-red-200 shadow-sm flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
                                ⚡
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                                {dept.description && <p className="text-sm text-gray-500 line-clamp-1">{dept.description}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
