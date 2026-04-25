"use client";

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Map as MapIcon, Users, CarFront, FileText, Calendar as CalendarIcon, X } from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  eachDayOfInterval, isSameMonth, isSameDay, parseISO, 
  startOfWeek, endOfWeek, startOfDay
} from 'date-fns';
import { useRouter } from 'next/navigation';

interface CalendarProps {
  quotes: any[];
}

// ── Status Color Definitions ──────────────────────────
const GREEN_CONFIRMED = { bg: '#F0FDF4', text: '#166534', bar: '#4ADE80', dot: '#4ADE80' };
const GREEN_STARTED   = { bg: '#ECFDF5', text: '#065F46', bar: '#10B981', dot: '#10B981' };
const GREEN_COMPLETE  = { bg: '#DCFCE7', text: '#14532D', bar: '#059669', dot: '#059669' };
const COLOR_GRAY      = { bg: '#F1F5F9', text: '#64748B', bar: '#94A3B8', dot: '#CBD5E1' };

function getStatusConfig(status: string, parsedEta?: Date) {
  if (parsedEta && parsedEta < startOfDay(new Date())) return COLOR_GRAY;
  if (status === 'Confirmed') return GREEN_CONFIRMED;
  if (status === 'Payment Started') return GREEN_STARTED;
  if (status === 'Payment Complete') return GREEN_COMPLETE;
  return COLOR_GRAY;
}

export default function CalendarView({ quotes }: CalendarProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);

  const activeQuotes = useMemo(() => {
    const filtered = quotes.filter(q =>
      (q.status === 'Confirmed' || q.status === 'Payment Started' || q.status === 'Payment Complete') &&
      q.eta && q.etd
    ).map(q => ({
      ...q,
      parsedEta: startOfDay(parseISO(q.eta)),
      parsedEtd: startOfDay(parseISO(q.etd)),
    }));

    // Sort by start date, then by duration (longest first) for stable slot assignment
    filtered.sort((a, b) => {
      const diff = a.parsedEta.getTime() - b.parsedEta.getTime();
      if (diff !== 0) return diff;
      return (b.parsedEtd.getTime() - b.parsedEta.getTime()) - (a.parsedEtd.getTime() - a.parsedEta.getTime());
    });

    // Assign stable vertical slots (lanes)
    const slots: any[][] = [];
    filtered.forEach(q => {
      let placed = false;
      for (let i = 0; i < slots.length; i++) {
        const overlap = slots[i].some(e => q.parsedEta <= e.parsedEtd && q.parsedEtd >= e.parsedEta);
        if (!overlap) { slots[i].push(q); q.slot = i; placed = true; break; }
      }
      if (!placed) { slots.push([q]); q.slot = slots.length - 1; }
    });

    return filtered;
  }, [quotes]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const today = new Date();
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const BAR_HEIGHT = 26;
  const BAR_GAP = 4;
  const DATE_HEADER_HEIGHT = 36;

  return (
    <div
      className="overflow-hidden flex flex-col"
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border-default)',
        borderRadius: '20px',
        boxShadow: 'var(--shadow-md)',
        minHeight: '680px',
      }}
    >
      {/* ── Calendar Header ── */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--color-border-default)',
          background: 'var(--color-bg-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px', height: '44px', borderRadius: '14px',
              background: 'var(--color-brand-soft)',
              color: 'var(--color-brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <CalendarIcon size={22} strokeWidth={2} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>
              Operational Schedule
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '8px' }}>
            {[
              { label: 'Confirmed', color: GREEN_CONFIRMED },
              { label: 'Pay Started', color: GREEN_STARTED },
              { label: 'Pay Complete', color: GREEN_COMPLETE },
              { label: 'Past Trips', color: COLOR_GRAY }
            ].map(({ label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color.dot, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-faint)', whiteSpace: 'nowrap' }}>{label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={goToToday}
            style={{
              padding: '0 14px', height: '34px',
              fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
              color: 'var(--color-text-muted)', background: 'var(--color-bg-subtle)',
              border: '1px solid var(--color-border-default)', borderRadius: '10px', cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Today
          </button>
          <div style={{ display: 'flex', background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border-default)', borderRadius: '10px', overflow: 'hidden', padding: '3px', gap: '2px' }}>
            {[{ action: prevMonth, icon: <ChevronLeft size={16} /> }, { action: nextMonth, icon: <ChevronRight size={16} /> }].map(({ action, icon }, i) => (
              <button key={i} onClick={action}
                style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-faint)', transition: 'all 0.15s ease' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'white'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-brand)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-faint)'; }}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Weekday Labels ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--color-border-default)', background: 'var(--color-bg-subtle)' }}>
        {DAY_LABELS.map(d => (
          <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-faint)' }}>
            {d}
          </div>
        ))}
      </div>

      {/* ── Week Rows ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--color-border-default)' }}>
        {weeks.map((week, weekIdx) => {
          const weekQuotes = activeQuotes.filter(q => q.parsedEta <= week[6] && q.parsedEtd >= week[0]);
          const maxSlot = weekQuotes.length > 0 ? Math.max(...weekQuotes.map(q => q.slot)) : -1;
          const eventsHeight = (maxSlot + 1) * (BAR_HEIGHT + BAR_GAP);
          const rowMinHeight = Math.max(100, DATE_HEADER_HEIGHT + eventsHeight + 12);

          return (
            <div key={weekIdx} className="relative" style={{ minHeight: `${rowMinHeight}px`, background: 'var(--color-border-default)' }}>
              {/* Day columns background */}
              <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
                {week.map((day) => {
                  const isCurrentMonth = isSameMonth(day, monthStart);
                  const isToday = isSameDay(day, today);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                  return (
                    <div
                      key={day.toString()}
                      style={{
                        background: !isCurrentMonth
                          ? 'var(--color-bg-subtle)'
                          : isWeekend
                          ? '#FAFBFC'
                          : 'var(--color-bg-card)',
                        padding: '8px 10px',
                        opacity: !isCurrentMonth ? 0.5 : 1,
                      }}
                    >
                      <span
                        style={{
                          width: '28px', height: '28px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: '50%',
                          fontSize: '13px',
                          fontWeight: isToday ? 800 : 500,
                          background: isToday ? 'var(--color-brand)' : 'transparent',
                          color: isToday ? 'white' : isCurrentMonth ? 'var(--color-text-primary)' : 'var(--color-text-faint)',
                          boxShadow: isToday ? '0 2px 8px rgba(0,103,79,0.3)' : 'none',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {format(day, 'd')}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Event bars layer — absolutely positioned, per slot */}
              <div style={{ position: 'absolute', top: `${DATE_HEADER_HEIGHT}px`, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                {weekQuotes.map((q) => {
                  const startCol = week.findIndex(d => isSameDay(d, q.parsedEta));
                  const endCol = week.findIndex(d => isSameDay(d, q.parsedEtd));
                  const isActualStart = startCol !== -1;
                  const isActualEnd = endCol !== -1;
                  const sIdx = isActualStart ? startCol : 0;
                  const eIdx = isActualEnd ? endCol : 6;
                  const cfg = getStatusConfig(q.status, q.parsedEta);

                  const topPos = q.slot * (BAR_HEIGHT + BAR_GAP);
                  const leftPct = (sIdx / 7) * 100;
                  const widthPct = ((eIdx - sIdx + 1) / 7) * 100;
                  const marginLeft = isActualStart ? 6 : 0;
                  const marginRight = isActualEnd ? 6 : 0;

                  return (
                    <div
                      key={`${q.id}-wk${weekIdx}`}
                      onClick={(e) => { e.stopPropagation(); setSelectedQuote(q); }}
                      title={`${q.customer_name} — ${q.status}`}
                      style={{
                        position: 'absolute',
                        top: `${topPos}px`,
                        left: `calc(${leftPct}% + ${marginLeft}px)`,
                        width: `calc(${widthPct}% - ${marginLeft + marginRight}px)`,
                        height: `${BAR_HEIGHT}px`,
                        pointerEvents: 'auto',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: isActualStart ? '8px' : '6px',
                        paddingRight: '6px',
                        gap: '5px',
                        overflow: 'hidden',
                        background: cfg.bg,
                        color: cfg.text,
                        borderTop: `1px solid ${cfg.bg}`,
                        borderBottom: `1px solid ${cfg.bg}`,
                        borderLeft: isActualStart ? `3px solid ${cfg.bar}` : 'none',
                        borderRight: isActualEnd ? `1px solid ${cfg.bg}` : 'none',
                        borderRadius: `${isActualStart ? '8px' : '0'} ${isActualEnd ? '8px' : '0'} ${isActualEnd ? '8px' : '0'} ${isActualStart ? '8px' : '0'}`,
                        fontSize: '11px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        transition: 'filter 0.15s ease, box-shadow 0.15s ease',
                        boxShadow: isActualStart ? `0 1px 4px rgba(0,0,0,0.06)` : 'none',
                        zIndex: 1,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(0.96)'; e.currentTarget.style.zIndex = '10'; }}
                      onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.zIndex = '1'; }}
                    >
                      {isActualStart && (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                      )}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: isActualStart ? 700 : 500 }}>
                        {(isActualStart || sIdx === 0)
                          ? `${q.customer_name}${q.grand_total ? ` · ₱${q.grand_total.toLocaleString()}` : ''}`
                          : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Quick View Modal ── */}
      <AnimatePresence>
        {selectedQuote && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'var(--color-bg-overlay)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
            onClick={() => setSelectedQuote(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border-default)',
                borderRadius: '24px',
                padding: '28px',
                maxWidth: '380px',
                width: '100%',
                boxShadow: '0 32px 64px -12px rgba(15,23,42,0.18)',
                position: 'relative',
              }}
            >
              {/* Close */}
              <button
                onClick={() => setSelectedQuote(null)}
                style={{ position: 'absolute', top: '20px', right: '20px', width: '32px', height: '32px', borderRadius: '10px', border: '1px solid var(--color-border-default)', background: 'var(--color-bg-subtle)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-faint)' }}
              >
                <X size={14} />
              </button>

              {/* Status Badge */}
              {(() => {
                const cfg = getStatusConfig(selectedQuote.status, selectedQuote.parsedEta);
                return (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', background: cfg.bg, color: cfg.text, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                    {selectedQuote.status}
                  </div>
                );
              })()}

              <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', marginBottom: '2px' }}>
                {selectedQuote.customer_name}
              </h3>
              {selectedQuote.fb_name && (
                <p style={{ fontSize: '13px', color: 'var(--color-brand)', fontWeight: 500, marginBottom: '20px' }}>@{selectedQuote.fb_name}</p>
              )}

              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-brand)', letterSpacing: '-0.02em', marginBottom: '20px' }}>
                ₱{selectedQuote.grand_total?.toLocaleString() ?? 0}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', padding: '16px', background: 'var(--color-bg-subtle)', borderRadius: '14px' }}>
                {[
                  { icon: <CalendarIcon size={14} />, label: `${format(parseISO(selectedQuote.eta), 'MMM d')} – ${format(parseISO(selectedQuote.etd), 'MMM d, yyyy')}` },
                  { icon: <Users size={14} />, label: `${selectedQuote.pax_count ?? '—'} Pax` },
                  { icon: <CarFront size={14} />, label: selectedQuote.vehicle_model || 'Vehicle unassigned' },
                  { icon: <MapIcon size={14} />, label: `${selectedQuote.pickup_location ?? '—'} → ${selectedQuote.dropoff_location ?? '—'}` },
                ].map(({ icon, label }, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 500 }}>
                    <span style={{ color: 'var(--color-text-faint)', flexShrink: 0 }}>{icon}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => router.push(`/builder?id=${selectedQuote.id}`)}
                style={{
                  width: '100%', height: '44px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                  background: 'var(--color-brand)',
                  backgroundImage: 'linear-gradient(135deg, var(--color-brand) 0%, #064E3B 100%)',
                  color: 'white', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 4px 12px rgba(0,103,79,0.25)',
                  transition: 'all 0.2s ease',
                }}
              >
                <FileText size={15} /> Open Builder
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
