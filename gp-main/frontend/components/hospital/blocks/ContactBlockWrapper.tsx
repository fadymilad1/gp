// Server Component — fetches real hospital business info and passes to ContactBlock
import { getHospitalBusinessInfo } from '@/lib/hospitalApi';
import ContactBlock from './ContactBlock';

interface ContactBlockWrapperProps {
  settings?: {
    phone?: string;
    email?: string;
    address?: string;
    hours?: string;
  };
  subdomain: string;
}

/** Formats working_hours JSON into a human-readable string, e.g. "Mon–Fri: 9:00 AM – 5:00 PM" */
function formatWorkingHours(
  wh: Record<string, { open: string; close: string; closed: boolean }>
): string {
  const DAY_LABELS: Record<string, string> = {
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
    sunday: 'Sun',
  };

  const openDays = Object.entries(wh)
    .filter(([, v]) => !v.closed && v.open && v.close)
    .map(([day, v]) => ({
      label: DAY_LABELS[day] ?? day,
      open: v.open,
      close: v.close,
    }));

  if (openDays.length === 0) return '';

  // Group consecutive days with same hours into ranges
  const groups: { days: string[]; open: string; close: string }[] = [];
  for (const d of openDays) {
    const last = groups[groups.length - 1];
    if (last && last.open === d.open && last.close === d.close) {
      last.days.push(d.label);
    } else {
      groups.push({ days: [d.label], open: d.open, close: d.close });
    }
  }

  return groups
    .map((g) => {
      const dayRange =
        g.days.length > 1 ? `${g.days[0]}–${g.days[g.days.length - 1]}` : g.days[0];
      const fmt = (t: string) => {
        const [hStr, mStr] = t.split(':');
        const h = parseInt(hStr, 10);
        const m = mStr || '00';
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${m} ${ampm}`;
      };
      return `${dayRange}: ${fmt(g.open)} – ${fmt(g.close)}`;
    })
    .join(' | ');
}

export default async function ContactBlockWrapper({
  settings = {},
  subdomain,
}: ContactBlockWrapperProps) {
  const bi = await getHospitalBusinessInfo(subdomain);

  const businessHours =
    bi?.working_hours && Object.keys(bi.working_hours).length > 0
      ? formatWorkingHours(bi.working_hours)
      : undefined;

  return (
    <ContactBlock
      settings={settings}
      subdomain={subdomain}
      businessPhone={bi?.contact_phone || undefined}
      businessEmail={bi?.contact_email || undefined}
      businessAddress={bi?.address || undefined}
      businessHours={businessHours}
    />
  );
}
