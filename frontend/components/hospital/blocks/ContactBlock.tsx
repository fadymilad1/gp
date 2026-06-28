'use client';

import {
  FiPhone,
  FiMail,
  FiMapPin,
  FiClock,
} from 'react-icons/fi';

interface ContactBlockProps {
  settings?: {
    phone?: string;
    email?: string;
    address?: string;
    hours?: string;
  };
  subdomain?: string;
  // Pre-fetched business info (injected by ContactBlockWrapper server component)
  businessPhone?: string;
  businessEmail?: string;
  businessAddress?: string;
  businessHours?: string;
}

export default function ContactBlock({
  settings = {},
  businessPhone,
  businessEmail,
  businessAddress,
  businessHours,
}: ContactBlockProps) {
  const phone = businessPhone || settings.phone || '+1 (800) 123-4567';
  const email = businessEmail || settings.email || 'contact@hospital.com';
  const address = businessAddress || settings.address || '123 Medical Center Drive, Health City, HC 00000';
  const hours = businessHours || settings.hours || 'Mon–Fri: 9:00 AM – 5:00 PM';

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  const infoCards = [
    {
      icon: <FiPhone size={20} />,
      label: 'Phone',
      value: phone,
      href: `tel:${phone.replace(/\s/g, '')}`,
    },
    {
      icon: <FiMail size={20} />,
      label: 'Email',
      value: email,
      href: `mailto:${email}`,
    },
    {
      icon: <FiMapPin size={20} />,
      label: 'Address',
      value: address,
      href: mapsUrl,
    },
    {
      icon: <FiClock size={20} />,
      label: 'Hours',
      value: hours,
      href: null,
    },
  ];

  return (
    <section
      id="contact"
      className="w-full py-16 px-4"
      style={{ background: 'var(--hospital-surface-alt)' }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h1
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{ color: 'var(--hospital-text)' }}
          >
            Contact Us
          </h1>
          <p
            className="text-base md:text-lg max-w-xl mx-auto"
            style={{ color: 'var(--hospital-text-muted)' }}
          >
            We're here to help. Reach out to our team for appointments,
            inquiries, or emergencies.
          </p>
        </div>

        {/* Centered Layout */}
        <div className="max-w-2xl mx-auto flex flex-col gap-5">
          {/* Emergency Hotline Banner */}
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-3 p-5"
            style={{
              background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
              color: '#ffffff',
              borderRadius: 'var(--hospital-radius)',
              boxShadow: '0 4px 20px rgba(220,38,38,0.35)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 rounded-xl flex items-center justify-center"
                style={{ background: '#ffffff', color: '#dc2626' }}
              >
                <FiPhone size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
                  24/7 Emergency
                </p>
                <p className="text-2xl font-bold leading-tight">{phone}</p>
              </div>
            </div>
            <a
              href={`tel:${phone.replace(/\s/g, '')}`}
              className="text-sm font-bold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap hover:opacity-90"
              style={{ background: '#ffffff', color: '#dc2626' }}
            >
              Call 911
            </a>
          </div>

          {/* Info Cards */}
          <div className="flex flex-col gap-4">
            {infoCards.map((card) => (
              <div
                key={card.label}
                className="flex items-start gap-4 p-4"
                style={{
                  background: 'var(--hospital-surface)',
                  border: '1px solid var(--hospital-border)',
                  borderRadius: 'var(--hospital-radius)',
                }}
              >
                {/* Icon Circle */}
                <div
                  className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full"
                  style={{
                    background: 'var(--hospital-primary-soft)',
                    color: 'var(--hospital-primary-strong)',
                  }}
                >
                  {card.icon}
                </div>
                <div className="min-w-0">
                  <p
                    className="text-xs font-semibold uppercase tracking-wider mb-0.5"
                    style={{ color: 'var(--hospital-text-muted)' }}
                  >
                    {card.label}
                  </p>
                  {card.href ? (
                    <a
                      href={card.href}
                      target={card.href.startsWith('http') ? '_blank' : undefined}
                      rel={card.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="text-sm font-medium leading-snug break-words hover:underline"
                      style={{ color: 'var(--hospital-text)' }}
                    >
                      {card.value}
                    </a>
                  ) : (
                    <p
                      className="text-sm font-medium leading-snug break-words"
                      style={{ color: 'var(--hospital-text)' }}
                    >
                      {card.value}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Map Placeholder */}
          <div
            className="relative flex flex-col items-center justify-center gap-2 overflow-hidden"
            style={{
              height: '200px',
              background: 'var(--hospital-surface-alt)',
              border: '1px solid var(--hospital-border)',
              borderRadius: 'var(--hospital-radius)',
            }}
          >
            {/* Grid overlay for map feel */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  'linear-gradient(var(--hospital-border) 1px, transparent 1px), linear-gradient(90deg, var(--hospital-border) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />
            <span className="relative text-4xl select-none">📍</span>
            <p
              className="relative text-sm font-medium"
              style={{ color: 'var(--hospital-text-muted)' }}
            >
              Find us on the map
            </p>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative text-xs font-semibold px-4 py-1.5 rounded-full transition-colors"
              style={{
                background: 'var(--hospital-btn-primary)',
                color: 'var(--hospital-btn-primary-text)',
              }}
            >
              Open in Maps
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
