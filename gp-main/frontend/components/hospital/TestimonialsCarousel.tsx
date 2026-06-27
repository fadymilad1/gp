'use client';

import { useRef, useState, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight, FiStar } from 'react-icons/fi';

interface TestimonialItem {
  quote: string;
  name: string;
  role: string;
  rating: number;
}

interface TestimonialsCarouselProps {
  testimonials: TestimonialItem[];
}

export default function TestimonialsCarousel({ testimonials }: TestimonialsCarouselProps) {
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
  }, [testimonials]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const { clientWidth } = scrollRef.current;
    // Scroll by 85% of viewport width for responsive sizing
    const scrollAmount = direction === 'left' ? -clientWidth * 0.85 : clientWidth * 0.85;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <div className="relative group/carousel w-full mt-12">
      {/* Webkit Scrollbar Hider */}
      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
      `}} />

      {/* Left Arrow Button */}
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

      {/* Right Arrow Button */}
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
        {testimonials.map((item) => (
          <div
            key={item.name}
            className="flex-shrink-0 w-[290px] sm:w-[350px] snap-start flex flex-col gap-4 p-7 shadow-sm transition-shadow duration-300 hover:shadow-md"
            style={{
              backgroundColor: 'var(--hospital-surface)',
              border: '1px solid var(--hospital-border)',
              borderRadius: 'var(--hospital-radius)',
            }}
          >
            {/* Star Rating */}
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <FiStar
                  key={i}
                  size={15}
                  className={i < item.rating ? 'fill-amber-400 text-amber-400' : ''}
                  style={
                    i >= item.rating
                      ? { color: 'var(--hospital-border)', fill: 'var(--hospital-border)' }
                      : undefined
                  }
                />
              ))}
            </div>

            {/* Quote */}
            <p
              className="flex-1 text-sm leading-relaxed"
              style={{ color: 'var(--hospital-text-muted)' }}
            >
              &ldquo;{item.quote}&rdquo;
            </p>

            {/* Author */}
            <div
              className="flex items-center gap-3 pt-2"
              style={{ borderTop: '1px solid var(--hospital-border)' }}
            >
              {/* Avatar placeholder */}
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: 'var(--hospital-btn-primary)' }}
              >
                {item.name.charAt(0)}
              </div>
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: 'var(--hospital-text)' }}
                >
                  {item.name}
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'var(--hospital-text-muted)' }}
                >
                  {item.role}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
