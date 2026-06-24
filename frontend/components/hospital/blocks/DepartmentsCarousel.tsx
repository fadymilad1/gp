'use client';

import { useRef, useState, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface DepartmentsCarouselProps {
  departments: any[];
}

export default function DepartmentsCarousel({ departments }: DepartmentsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeft(scrollLeft > 5);
    setShowRight(scrollLeft + clientWidth < scrollWidth - 5);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      checkScroll();
      
      // Delay check slightly in case cards take a moment to render
      const timer = setTimeout(checkScroll, 500);
      window.addEventListener('resize', checkScroll);
      
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
        clearTimeout(timer);
      };
    }
  }, [departments]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const { clientWidth } = scrollRef.current;
    // Scroll by 85% of viewport width for responsive sizing
    const scrollAmount = direction === 'left' ? -clientWidth * 0.85 : clientWidth * 0.85;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <div className="relative group/carousel w-full">
      {/* Webkit Scrollbar Hider */}
      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
      `}} />

      {/* Left Overlay/Arrow Button */}
      {showLeft && (
        <button
          onClick={() => handleScroll('left')}
          className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 rounded-full border shadow-lg backdrop-blur-md transition-all duration-300 opacity-0 group-hover/carousel:opacity-100 scale-90 group-hover/carousel:scale-100 hover:scale-105"
          style={{
            background: 'var(--hospital-surface)',
            borderColor: 'var(--hospital-border)',
            color: 'var(--hospital-primary-strong)',
          }}
          aria-label="Scroll left"
        >
          <FiChevronLeft size={24} />
        </button>
      )}

      {/* Right Overlay/Arrow Button */}
      {showRight && (
        <button
          onClick={() => handleScroll('right')}
          className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 rounded-full border shadow-lg backdrop-blur-md transition-all duration-300 opacity-0 group-hover/carousel:opacity-100 scale-90 group-hover/carousel:scale-100 hover:scale-105"
          style={{
            background: 'var(--hospital-surface)',
            borderColor: 'var(--hospital-border)',
            color: 'var(--hospital-primary-strong)',
          }}
          aria-label="Scroll right"
        >
          <FiChevronRight size={24} />
        </button>
      )}

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none px-1 py-4"
        style={{
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
      >
        {departments.map((dept: any, index: number) => {
          const firstLetter = (dept.name ?? 'D').charAt(0).toUpperCase();
          const description =
            dept.description ||
            dept.short_description ||
            'No description provided.';
          const doctorCount = dept.doctors_count ?? dept.doctor_count ?? 0;

          return (
            <div
              key={dept.id ?? index}
              className="flex-shrink-0 w-[290px] sm:w-[330px] snap-start group/card relative flex flex-col overflow-hidden border transition-shadow duration-300 hover:shadow-xl"
              style={{
                background: 'var(--hospital-surface)',
                borderColor: 'var(--hospital-border)',
                borderRadius: 'var(--hospital-radius)',
              }}
            >
              {/* Card Top Accent */}
              <div
                className="absolute inset-x-0 top-0 h-1 opacity-60 group-hover/card:opacity-100 transition-opacity"
                style={{
                  background: 'var(--hospital-btn-primary)',
                }}
              />

              <div className="flex flex-col flex-1 p-6 pt-7">
                {/* First Letter Badge */}
                <div
                  className="flex items-center justify-center w-14 h-14 mb-5 text-2xl font-bold select-none"
                  style={{
                    background: 'var(--hospital-primary-soft)',
                    color: 'var(--hospital-primary-strong)',
                    borderRadius: 'var(--hospital-radius)',
                  }}
                >
                  {firstLetter}
                </div>

                {/* Department Name */}
                <h3
                  className="text-base font-bold leading-snug mb-2"
                  style={{ color: 'var(--hospital-text)' }}
                >
                  {dept.name ?? 'Department'}
                </h3>

                {/* Description */}
                <p
                  className={`text-sm leading-relaxed line-clamp-3 flex-1 mb-5 ${(!dept.description && !dept.short_description) ? 'italic' : ''}`}
                  style={{ color: 'var(--hospital-text-muted)' }}
                >
                  {description}
                </p>

                {/* Meta Row */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {/* Doctor Count */}
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                    style={{
                      background: 'var(--hospital-surface-alt, var(--hospital-surface))',
                      borderColor: 'var(--hospital-border)',
                      color: 'var(--hospital-text-muted)',
                    }}
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 20h5v-2a4 4 0 00-5-4M9 20H4v-2a4 4 0 015-4m8-4a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                    {doctorCount} {doctorCount === 1 ? 'Doctor' : 'Doctors'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
