'use client';

import { useState } from 'react';
import {
  FiPhone,
  FiMail,
  FiMapPin,
  FiClock,
  FiSend,
  FiCheckCircle,
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

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
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

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1500);
  };

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

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          {/* ── Left Column: Contact Info ── */}
          <div className="flex flex-col gap-5">
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

          {/* ── Right Column: Contact Form ── */}
          <div
            className="p-6 md:p-8"
            style={{
              background: 'var(--hospital-surface)',
              border: '1px solid var(--hospital-border)',
              borderRadius: 'var(--hospital-radius)',
            }}
          >
            {isSubmitted ? (
              /* Success State */
              <div className="flex flex-col items-center justify-center text-center h-full py-12 gap-5">
                <div
                  className="flex items-center justify-center w-16 h-16 rounded-full"
                  style={{ background: '#d1fae5' }}
                >
                  <FiCheckCircle size={36} color="#059669" />
                </div>
                <div>
                  <h2
                    className="text-2xl font-bold mb-2"
                    style={{ color: 'var(--hospital-text)' }}
                  >
                    Message Sent!
                  </h2>
                  <p style={{ color: 'var(--hospital-text-muted)' }}>
                    We&apos;ll get back to you within 24 hours.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setFormData({ name: '', email: '', subject: '', message: '' });
                  }}
                  className="text-sm font-semibold underline"
                  style={{ color: 'var(--hospital-primary-strong)' }}
                >
                  Send another message
                </button>
              </div>
            ) : (
              /* Form */
              <>
                <h2
                  className="text-2xl font-bold mb-1"
                  style={{ color: 'var(--hospital-text)' }}
                >
                  Send us a Message
                </h2>
                <p
                  className="text-sm mb-6"
                  style={{ color: 'var(--hospital-text-muted)' }}
                >
                  Fill in the form below and our team will respond promptly.
                </p>

                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                  {/* Name */}
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="name"
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--hospital-text-muted)' }}
                    >
                      Full Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="John Doe"
                      className="w-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
                      style={{
                        background: 'var(--hospital-input-bg)',
                        border: '1px solid var(--hospital-input-border)',
                        color: 'var(--hospital-text)',
                        borderRadius: 'var(--hospital-radius)',
                      }}
                    />
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="email"
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--hospital-text-muted)' }}
                    >
                      Email Address <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="john@example.com"
                      className="w-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
                      style={{
                        background: 'var(--hospital-input-bg)',
                        border: '1px solid var(--hospital-input-border)',
                        color: 'var(--hospital-text)',
                        borderRadius: 'var(--hospital-radius)',
                      }}
                    />
                  </div>

                  {/* Subject */}
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="subject"
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--hospital-text-muted)' }}
                    >
                      Subject <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      id="subject"
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      placeholder="How can we help?"
                      className="w-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
                      style={{
                        background: 'var(--hospital-input-bg)',
                        border: '1px solid var(--hospital-input-border)',
                        color: 'var(--hospital-text)',
                        borderRadius: 'var(--hospital-radius)',
                      }}
                    />
                  </div>

                  {/* Message */}
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="message"
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--hospital-text-muted)' }}
                    >
                      Message <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      value={formData.message}
                      onChange={handleChange}
                      required
                      placeholder="Tell us more about your inquiry..."
                      className="w-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 transition-shadow resize-none"
                      style={{
                        background: 'var(--hospital-input-bg)',
                        border: '1px solid var(--hospital-input-border)',
                        color: 'var(--hospital-text)',
                        borderRadius: 'var(--hospital-radius)',
                      }}
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold transition-opacity disabled:opacity-70 mt-1"
                    style={{
                      background: 'var(--hospital-btn-primary)',
                      color: 'var(--hospital-btn-primary-text)',
                      borderRadius: 'var(--hospital-radius)',
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        {/* Spinner */}
                        <svg
                          className="animate-spin h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                          />
                        </svg>
                        Sending…
                      </>
                    ) : (
                      <>
                        <FiSend size={16} />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
