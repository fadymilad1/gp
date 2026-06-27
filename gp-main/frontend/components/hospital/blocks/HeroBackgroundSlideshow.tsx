'use client';

import { useState, useEffect } from 'react';

interface PhotoItem {
  id: string;
  image_url?: string | null;
  alt_text?: string;
}

interface HeroBackgroundSlideshowProps {
  photos: PhotoItem[];
  fallbackImage?: string;
}

export default function HeroBackgroundSlideshow({ photos, fallbackImage }: HeroBackgroundSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Extract valid image URLs from photos
  const images = (photos || [])
    .map((p) => p.image_url)
    .filter((url): url is string => typeof url === 'string' && url.length > 0);

  // If no business info photos, fall back to setting's background image or standard premium placeholder
  const slideshowImages =
    images.length > 0
      ? images
      : [
          fallbackImage ||
            'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=2000',
        ];

  useEffect(() => {
    if (slideshowImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slideshowImages.length);
    }, 6000); // Cycle every 6 seconds

    return () => clearInterval(interval);
  }, [slideshowImages]);

  return (
    <div className="absolute inset-0 z-0 select-none pointer-events-none">
      {slideshowImages.map((src, index) => (
        <div
          key={src + index}
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `url(${src})`,
          }}
        />
      ))}

      {/* Gradient overlay to ensure high readability of light text */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background:
            'linear-gradient(to right, color-mix(in srgb, var(--hospital-btn-primary) 92%, transparent), color-mix(in srgb, var(--hospital-btn-primary) 65%, transparent), color-mix(in srgb, var(--hospital-btn-primary) 35%, transparent))',
        }}
      />
    </div>
  );
}
