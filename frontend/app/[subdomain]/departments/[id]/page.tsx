import React from 'react';
import { notFound } from 'next/navigation';
import { getHospitalDepartments, getHospitalDoctors } from '@/lib/hospitalApi';
import type { Department, Doctor } from '@/types/hospital';
import DepartmentDoctorsClient from '@/components/hospital/DepartmentDoctorsClient';

interface PageProps {
  params: Promise<{
    subdomain: string;
    id: string;
  }>;
}

export const dynamic = 'force-dynamic';

export default async function DepartmentDoctorsPage({ params }: PageProps) {
  const resolvedParams = await params;
  const subdomain = resolvedParams.subdomain;
  const id = resolvedParams.id;

  // 1. Fetch departments
  let departments: Department[] = [];
  try {
    departments = await getHospitalDepartments(subdomain);
  } catch {
    departments = [];
  }

  // 2. Find target department
  const department = departments.find(d => d.id === id);
  if (!department) {
    notFound();
  }

  // 3. Fetch doctors
  let allDoctors: Doctor[] = [];
  try {
    allDoctors = await getHospitalDoctors(subdomain);
  } catch {
    allDoctors = [];
  }

  // 4. Filter doctors by department ID
  const departmentDoctors = allDoctors.filter(doc => doc.department === id);

  return (
    <DepartmentDoctorsClient
      department={department}
      doctors={departmentDoctors}
    />
  );
}
