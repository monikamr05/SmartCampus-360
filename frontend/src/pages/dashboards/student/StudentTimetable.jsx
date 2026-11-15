import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import './StudentTimetable.css';

const setTitle = (t) => { const el = document.getElementById('st-page-title'); if (el) el.textContent = t; };

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* colour slots by type */
const TYPE_STYLE = {
  lecture:  { bg: '#eff6ff', border: '#93c5fd', color: '#1d4ed8', label: 'Lecture'  },
  lab:      { bg: '#f0fdf4', border: '#86efac', color: '#15803d', label: 'Lab'      },
  tutorial: { bg: '#fef9c3', border: '#fde047', color: '#854d0e', label: 'Tutorial' },
  seminar:  { bg: '#fdf4ff', border: '#d8b4fe', color: '#7e22ce', label: 'Seminar'  },
};

const fmt12 = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
};

const TODAY = DAYS[Math.min(new Date().getDay() - 1, 5)] || 'Monday';

const SlotCard = ({ slot }) => {
  const s = TYPE_STYLE[slot.type] || TYPE_STYLE.lecture;
  return (
    <div className="tt-slot" style={{ background: s.bg, borderLeft: `3px solid ${s.border}` }}>
      <div className="tt-slot__time">{fmt12(slot.startTime)} – {fmt12(slot.endTime)}</div>
      <div className="tt-slot__name">{slot.courseName}</div>
      <div className="tt-slot__meta">
        <span className="tt-slot__code">{slot.courseCode}</span>
        {slot.room && <span className="tt-slot__room">📍 {slot.room}</span>}
      </div>
      {slot.instructor && <div className="tt-slot__inst">👤 {slot.instructor}</div>}
      <span className="tt-slot__type" style={{ color: s.color }}>{s.label}</span>
    </div>
  );
};

const StudentTimetable = () => {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [activeDay, setActiveDay] = useState(TODAY);

  useEffect(() => {
    setTitle('Timetable');
    api.get('/student/timetable')
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="st-loading"><div className="st-loading__spinner"/><span>Loading timetable…</span></div>;
  if (error)   return <div className="st-error"><span>⚠️</span><div><strong>Error</strong><p>{error}</p></div></div>;

  const { byDay = {}, message } = data;
  const activeDaySlots = byDay[activeDay] || [];
  const totalSlots = DAYS.reduce((s, d) => s + (byDay[d]?.length || 0), 0);

  return (
    <div className="st-page tt-page">

      <div className="st-page-header">
        <div className="st-page-header__left">
          <h1 className="st-page-title">Class Timetable</h1>
          <p className="st-page-sub">
            {data.semester ? `Semester ${data.semester}` : ''}{data.academic ? ` · ${data.academic}` : ''}
            {totalSlots ? ` · ${totalSlots} classes/week` : ''}
          </p>
        </div>
      </div>

      {!totalSlots ? (
        <div className="st-panel">
          <p className="st-empty">📅 {message || 'No timetable published for your class yet.'}</p>
        </div>
      ) : (
        <>
          {/* Day tabs */}
          <div className="tt-day-tabs" role="tablist">
            {DAYS.map(day => {
              const count = byDay[day]?.length || 0;
              const isToday = day === TODAY;
              return (
                <button
                  key={day}
                  role="tab"
                  aria-selected={activeDay === day}
                  className={`tt-day-tab ${activeDay === day ? 'tt-day-tab--active' : ''} ${isToday ? 'tt-day-tab--today' : ''}`}
                  onClick={() => setActiveDay(day)}
                >
                  <span className="tt-day-tab__name">{day.slice(0, 3)}</span>
                  {count > 0 && <span className="tt-day-tab__count">{count}</span>}
                  {isToday && <span className="tt-day-tab__dot"/>}
                </button>
              );
            })}
          </div>

          {/* Active day grid */}
          <div className="tt-day-view">
            <div className="tt-day-header">
              <span className="tt-day-header__name">{activeDay}</span>
              {activeDay === TODAY && <span className="tt-day-header__today-badge">Today</span>}
              <span className="tt-day-header__count">{activeDaySlots.length} class{activeDaySlots.length !== 1 ? 'es' : ''}</span>
            </div>

            {activeDaySlots.length === 0 ? (
              <div className="tt-free-day">
                <span>🎉</span>
                <span>No classes on {activeDay}</span>
              </div>
            ) : (
              <div className="tt-slots-col">
                {activeDaySlots.map((slot, i) => <SlotCard key={i} slot={slot}/>)}
              </div>
            )}
          </div>

          {/* Weekly overview grid (compact) */}
          <div className="st-panel tt-weekly-panel">
            <div className="st-panel__header">
              <div className="st-panel__title">Weekly Overview</div>
            </div>
            <div className="tt-weekly-grid">
              {DAYS.map(day => (
                <div key={day} className={`tt-week-col ${day === TODAY ? 'tt-week-col--today' : ''}`}>
                  <div className="tt-week-col__header">{day.slice(0,3)}</div>
                  <div className="tt-week-col__slots">
                    {(byDay[day] || []).length === 0
                      ? <div className="tt-week-col__free">Free</div>
                      : (byDay[day] || []).map((slot, i) => {
                          const s = TYPE_STYLE[slot.type] || TYPE_STYLE.lecture;
                          return (
                            <div key={i} className="tt-week-slot" style={{ background: s.bg, borderLeft: `2px solid ${s.border}` }}>
                              <div className="tt-week-slot__time">{fmt12(slot.startTime)}</div>
                              <div className="tt-week-slot__code">{slot.courseCode}</div>
                            </div>
                          );
                        })
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="tt-legend">
            {Object.entries(TYPE_STYLE).map(([type, s]) => (
              <span key={type} className="tt-legend-item">
                <span className="tt-legend-dot" style={{ background: s.border }}/>
                {s.label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default StudentTimetable;
