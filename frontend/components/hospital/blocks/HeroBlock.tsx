import Link from "next/link";
import { FiChevronDown } from "react-icons/fi";
import { getHospitalDoctors, getHospitalDepartments } from "@/lib/hospitalApi";

interface HeroBlockSettings {
  headline?: string;
  subheadline?: string;
  button_text?: string;
  button_link?: string;
  secondary_button_text?: string;
  secondary_button_link?: string;
  background_image_url?: string;
  badge_text?: string;
}

interface HeroBlockProps {
  settings: HeroBlockSettings;
  subdomain: string;
}

export default async function HeroBlock({ settings, subdomain }: HeroBlockProps) {
  const {
    headline = "Compassionate Care,\nExceptional Medicine",
    subheadline = "We combine world-class medical expertise with heartfelt compassion to deliver the best possible outcomes for every patient.",
    button_text = "Book an Appointment",
    button_link = "/appointments",
    secondary_button_text = "Explore Our Services",
    secondary_button_link = "/services",
    background_image_url = "",
    badge_text = "Trusted Healthcare Provider",
  } = settings;

  let doctorsCount = 0;
  let departmentsCount = 0;

  try {
    const [doctors, departments] = await Promise.all([
      getHospitalDoctors(subdomain),
      getHospitalDepartments(subdomain),
    ]);
    doctorsCount = Array.isArray(doctors) ? doctors.length : 0;
    departmentsCount = Array.isArray(departments) ? departments.length : 0;
  } catch {
    // Silently fall back to 0 counts
  }

  const hasStats = doctorsCount > 0 || departmentsCount > 0;

  return (
    <section
      className="relative w-full min-h-[92vh] flex flex-col justify-center overflow-hidden"
      style={{ background: "var(--hospital-bg)" }}
    >
      {/* Background Image */}
      {background_image_url && (
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${background_image_url})` }}
          aria-hidden="true"
        />
      )}

      {/* Gradient Overlay */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background:
            "linear-gradient(to right, color-mix(in srgb, var(--hospital-btn-primary) 90%, transparent), color-mix(in srgb, var(--hospital-btn-primary) 60%, transparent), color-mix(in srgb, var(--hospital-btn-primary) 30%, transparent))",
        }}
        aria-hidden="true"
      />

      {/* Fallback solid overlay when no image */}
      {!background_image_url && (
        <div
          className="absolute inset-0 z-0"
          style={{ background: "var(--hospital-btn-primary)" }}
          aria-hidden="true"
        />
      )}

      {/* Animated Floating Shapes */}
      <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Shape 1 */}
        <div
          className="animate-float absolute rounded-full"
          style={{
            width: "420px",
            height: "420px",
            top: "-100px",
            right: "5%",
            background: "var(--hospital-btn-primary-text)",
            opacity: 0.05,
            animationDelay: "0s",
            animationDuration: "7s",
          }}
        />
        {/* Shape 2 */}
        <div
          className="animate-float absolute rounded-full"
          style={{
            width: "280px",
            height: "280px",
            bottom: "60px",
            right: "20%",
            background: "var(--hospital-btn-primary-text)",
            opacity: 0.05,
            animationDelay: "2s",
            animationDuration: "9s",
          }}
        />
        {/* Shape 3 */}
        <div
          className="animate-float absolute rounded-full"
          style={{
            width: "180px",
            height: "180px",
            top: "30%",
            left: "3%",
            background: "var(--hospital-btn-primary-text)",
            opacity: 0.05,
            animationDelay: "1s",
            animationDuration: "11s",
          }}
        />
        {/* Shape 4 */}
        <div
          className="animate-float absolute"
          style={{
            width: "340px",
            height: "340px",
            bottom: "-80px",
            left: "-60px",
            borderRadius: "60% 40% 70% 30% / 50% 60% 40% 50%",
            background: "var(--hospital-btn-primary-text)",
            opacity: 0.05,
            animationDelay: "3.5s",
            animationDuration: "8s",
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-30 container mx-auto px-6 sm:px-10 lg:px-16 py-24 sm:py-32 flex flex-col items-start max-w-5xl">
        {/* Badge */}
        {badge_text && (
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-6 tracking-wide"
            style={{
              background: "var(--hospital-primary-soft)",
              color: "var(--hospital-primary-strong)",
            }}
          >
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: "var(--hospital-primary-strong)" }}
            />
            {badge_text}
          </span>
        )}

        {/* Headline */}
        <h1
          className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-6 max-w-3xl"
          style={{ textShadow: "0 2px 24px rgba(0,0,0,0.18)" }}
        >
          {headline.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              {i < headline.split("\n").length - 1 && <br />}
            </span>
          ))}
        </h1>

        {/* Subheadline */}
        <p
          className="text-lg sm:text-xl max-w-2xl mb-10 leading-relaxed"
          style={{ color: "rgba(255,255,255,0.80)" }}
        >
          {subheadline}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-4 items-center">
          {button_text && button_link && (
            <Link
              href={button_link}
              className="inline-flex items-center gap-2 px-7 py-3.5 font-bold text-base transition-all duration-200 hover:scale-105 active:scale-100"
              style={{
                background: "#ffffff",
                color: "var(--hospital-btn-primary)",
                borderRadius: "var(--hospital-radius)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.22)",
              }}
            >
              {button_text}
            </Link>
          )}

          {secondary_button_text && secondary_button_link && (
            <Link
              href={secondary_button_link}
              className="inline-flex items-center gap-2 px-7 py-3.5 font-bold text-base text-white transition-all duration-200 hover:scale-105 active:scale-100 hover:bg-white/20"
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "2px solid rgba(255,255,255,0.85)",
                borderRadius: "9999px",
                backdropFilter: "blur(6px)",
              }}
            >
              {secondary_button_text}
            </Link>
          )}
        </div>

        {/* Stats Bar */}
        {hasStats && (
          <div className="flex flex-wrap gap-3 mt-14">
            {doctorsCount > 0 && (
              <span
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  color: "#ffffff",
                  border: "1px solid rgba(255,255,255,0.25)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span className="text-base">🩺</span>
                {doctorsCount}+ Doctors
              </span>
            )}
            {departmentsCount > 0 && (
              <span
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  color: "#ffffff",
                  border: "1px solid rgba(255,255,255,0.25)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span className="text-base">🏥</span>
                {departmentsCount} Departments
              </span>
            )}
            <span
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold"
              style={{
                background: "rgba(255,255,255,0.15)",
                color: "#ffffff",
                border: "1px solid rgba(255,255,255,0.25)",
                backdropFilter: "blur(8px)",
              }}
            >
              <span className="text-base">📅</span>
              Since 2000
            </span>
            <span
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold"
              style={{
                background: "rgba(255,255,255,0.15)",
                color: "#ffffff",
                border: "1px solid rgba(255,255,255,0.25)",
                backdropFilter: "blur(8px)",
              }}
            >
              <span className="text-base">⏰</span>
              24/7 Care
            </span>
          </div>
        )}
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 animate-bounce">
        <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.60)" }}>
          Scroll
        </span>
        <FiChevronDown size={22} color="rgba(255,255,255,0.70)" strokeWidth={2.5} />
      </div>
    </section>
  );
}
