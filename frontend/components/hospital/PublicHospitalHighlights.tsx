import Link from 'next/link';
import { FiCheckCircle, FiHeart, FiShield, FiStar } from 'react-icons/fi';
import { getHospitalDepartments, getHospitalDoctors } from '@/lib/hospitalApi';
import TestimonialsCarousel from './TestimonialsCarousel';

interface PublicHospitalHighlightsProps {
  subdomain: string;
}

const testimonials = [
  {
    quote:
      'The appointment flow is simple, and the doctors are always on time and incredibly supportive. I felt genuinely cared for from the moment I walked in.',
    name: 'Elena Richards',
    role: 'Patient since 2021',
    rating: 5,
  },
  {
    quote:
      'From emergency care to follow-up consultations, the staff handled everything with exceptional professionalism and genuine compassion.',
    name: 'David Chen',
    role: 'Patient since 2022',
    rating: 5,
  },
  {
    quote:
      'Professional team, modern facilities, and a clear communication style. They explained every step of my treatment in simple terms.',
    name: 'Sarah Mitchell',
    role: 'Patient since 2020',
    rating: 4,
  },
  {
    quote:
      'The pediatric department is wonderful. They made my daughter feel extremely safe and comfortable during her minor surgery. Highly recommended!',
    name: 'Marcus Thompson',
    role: 'Parent of patient',
    rating: 5,
  },
  {
    quote:
      'Outstanding cardiovascular care. The rehabilitation program helped me regain my active lifestyle much faster than I ever anticipated.',
    name: 'Robert Vance',
    role: 'Patient since 2023',
    rating: 5,
  },
  {
    quote:
      'Extremely clean facility with a welcoming atmosphere. The online patient portal makes downloading records and messaging my physician so convenient.',
    name: 'Emily Watson',
    role: 'Patient since 2019',
    rating: 5,
  },
];

const carePillars = [
  {
    title: 'Safety-First Care',
    description:
      'Evidence-based protocols and continuous quality monitoring on every visit ensure you receive the highest standard of medical safety.',
    Icon: FiShield,
  },
  {
    title: 'Compassionate Teams',
    description:
      'Specialists trained to listen, guide, and stay with you through every stage of recovery — because healing is a human experience.',
    Icon: FiHeart,
  },
  {
    title: 'Transparent Guidance',
    description:
      'Clear next steps, follow-ups, and care plans shared in plain language, so you always understand your health journey.',
    Icon: FiCheckCircle,
  },
];

export default async function PublicHospitalHighlights({
  subdomain,
}: PublicHospitalHighlightsProps) {
  let doctorsCount = 0;
  let departmentsCount = 0;
  let yearsOfExcellence = '25';
  let patientsTreated = '50k+';

  try {
    const [doctors, departments] = await Promise.all([
      getHospitalDoctors(subdomain),
      getHospitalDepartments(subdomain),
    ]);
    doctorsCount = doctors.length;
    departmentsCount = departments.length;
    
    // Fetch hospital profile for statistics
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    const profileRes = await fetch(`${API_URL}/hospital/public/profile/?subdomain=${encodeURIComponent(subdomain)}`, {
      cache: 'no-store',
    });
    
    if (profileRes.ok) {
      const profile = await profileRes.json();
      yearsOfExcellence = profile.business_info?.years_of_experience !== undefined && profile.business_info?.years_of_experience !== null
        ? profile.business_info.years_of_experience.toString()
        : profile.years_of_excellence?.toString() || '25';
      patientsTreated = profile.patients_treated || '50k+';
    }
  } catch {
    doctorsCount = 0;
    departmentsCount = 0;
  }

  const metrics = [
    {
      label: 'Expert Doctors',
      value: doctorsCount > 0 ? `${doctorsCount}+` : '500+',
    },
    {
      label: 'Departments',
      value: departmentsCount > 0 ? `${departmentsCount}+` : '15+',
    },
    { label: 'Years of Excellence', value: yearsOfExcellence },
    { label: 'Patients Treated', value: patientsTreated },
  ];

  return (
    <>
      {/* ── Section 1: Metrics Bar ──────────────────────────────────────── */}
      <section
        style={{ backgroundColor: 'var(--hospital-btn-primary)' }}
        className="relative overflow-hidden py-14"
      >
        {/* subtle decorative overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-y-10 gap-x-6 md:grid-cols-4">
            {metrics.map((metric, idx) => (
              <div key={idx} className="flex flex-col items-center text-center">
                <span
                  className="text-4xl font-extrabold tracking-tight text-white drop-shadow-sm"
                >
                  {metric.value}
                </span>
                <span
                  className="mt-2 text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.75)' }}
                >
                  {metric.label}
                </span>
                {idx < metrics.length - 1 && (
                  <div
                    className="absolute hidden md:block"
                    style={{
                      width: '1px',
                      height: '40px',
                      backgroundColor: 'rgba(255,255,255,0.2)',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 2: Care Promise ─────────────────────────────────────── */}
      <section
        className="relative overflow-hidden py-20"
        style={{ backgroundColor: 'var(--hospital-surface)' }}
      >
        {/* Glow blobs */}
        <div
          className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full blur-3xl"
          style={{ backgroundColor: 'var(--hospital-primary-soft)', opacity: 0.6 }}
        />
        <div
          className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full blur-3xl"
          style={{ backgroundColor: 'var(--hospital-primary-soft)', opacity: 0.5 }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          {/* Header */}
          <div className="mx-auto max-w-2xl text-center">
            <p
              className="text-xs font-bold uppercase tracking-[0.25em]"
              style={{ color: 'var(--hospital-text-muted)' }}
            >
              Our Care Promise
            </p>
            <h2
              className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl"
              style={{ color: 'var(--hospital-text)' }}
            >
              A better care experience,{' '}
              <span style={{ color: 'var(--hospital-btn-primary)' }}>every time</span>
            </h2>
            <p
              className="mt-4 text-base leading-relaxed"
              style={{ color: 'var(--hospital-text-muted)' }}
            >
              Three pillars that guide every interaction — from your first appointment
              to long-term wellness support.
            </p>
          </div>

          {/* Pillar Cards */}
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {carePillars.map((pillar) => (
              <div
                key={pillar.title}
                className="group relative flex flex-col gap-4 p-7 shadow-sm transition-shadow duration-300 hover:shadow-md"
                style={{
                  backgroundColor: 'var(--hospital-surface)',
                  border: '1px solid var(--hospital-border)',
                  borderRadius: 'var(--hospital-radius)',
                }}
              >
                {/* Icon Badge */}
                <div
                  className="flex h-13 w-13 items-center justify-center rounded-2xl p-3 transition-transform duration-300 group-hover:-translate-y-0.5"
                  style={{
                    backgroundColor: 'var(--hospital-primary-soft)',
                    color: 'var(--hospital-primary-strong)',
                    width: '52px',
                    height: '52px',
                  }}
                >
                  <pillar.Icon size={22} />
                </div>

                {/* Content */}
                <div>
                  <h3
                    className="text-lg font-bold"
                    style={{ color: 'var(--hospital-text)' }}
                  >
                    {pillar.title}
                  </h3>
                  <p
                    className="mt-2 text-sm leading-relaxed"
                    style={{ color: 'var(--hospital-text-muted)' }}
                  >
                    {pillar.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 3: Testimonials ─────────────────────────────────────── */}
      <section
        className="py-20"
        style={{ backgroundColor: 'var(--hospital-surface-alt)' }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* Header */}
          <div className="mx-auto max-w-2xl text-center">
            <p
              className="text-xs font-bold uppercase tracking-[0.25em]"
              style={{ color: 'var(--hospital-text-muted)' }}
            >
              Patient Stories
            </p>
            <h2
              className="mt-3 text-3xl font-extrabold sm:text-4xl"
              style={{ color: 'var(--hospital-text)' }}
            >
              What our patients say
            </h2>
            <p
              className="mt-4 text-base leading-relaxed"
              style={{ color: 'var(--hospital-text-muted)' }}
            >
              Real experiences from real people who trusted us with their health.
            </p>
          </div>

          {/* Testimonial Cards */}
          <TestimonialsCarousel testimonials={testimonials} />
        </div>
      </section>

      {/* ── Section 4: CTA Banner ───────────────────────────────────────── */}
      <section
        className="relative overflow-hidden py-16"
        style={{
          background:
            'linear-gradient(135deg, var(--hospital-btn-primary), var(--hospital-btn-primary-hover, color-mix(in srgb, var(--hospital-btn-primary) 80%, black)))',
        }}
      >
        {/* Decorative circles */}
        <div
          className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full opacity-10"
          style={{ backgroundColor: 'white' }}
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full opacity-10"
          style={{ backgroundColor: 'white' }}
        />

        <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-4 text-center sm:px-6 lg:flex-row lg:text-left">
          {/* Left content */}
          <div className="flex-1">
            <div className="mb-4 flex items-center justify-center gap-3 lg:justify-start">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              >
                <FiHeart size={18} color="white" />
              </span>
              <span
                className="text-xs font-bold uppercase tracking-[0.2em]"
                style={{ color: 'rgba(255,255,255,0.75)' }}
              >
                Start Your Journey
              </span>
            </div>
            <h3 className="text-3xl font-extrabold leading-snug text-white sm:text-4xl">
              Ready to prioritize your health?
            </h3>
            <p
              className="mt-3 max-w-xl text-base leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              Book an appointment online in minutes and skip the long waiting room queues.
              Our team is ready to welcome you.
            </p>
          </div>

          {/* Right CTA */}
          <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row lg:flex-col lg:items-end">
            <Link
              href="/booking"
              className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-bold shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
              style={{
                backgroundColor: 'var(--hospital-surface)',
                color: 'var(--hospital-btn-primary)',
                borderRadius: 'var(--hospital-radius)',
              }}
            >
              <FiCheckCircle size={16} />
              Book Your Appointment
            </Link>
            <p
              className="text-xs"
              style={{ color: 'rgba(255,255,255,0.65)' }}
            >
              No account required &mdash; instant confirmation
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
