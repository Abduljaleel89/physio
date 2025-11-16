import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { dateFnsLocalizer, Calendar as RBCalendar } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';

const Calendar = dynamic(
  () => Promise.resolve(RBCalendar),
  { ssr: false }
) as typeof RBCalendar;

export interface AppointmentCalendarProps {
  events: any[];
  defaultView?: any;
  onView?: (v: any) => void;
  selectable?: boolean;
  onSelectSlot?: (info: any) => void;
  onEventDrop?: (args: { event: any; start: Date; end: Date; allDay?: boolean }) => void;
  onEventResize?: (args: { event: any; start: Date; end: Date }) => void;
  style?: React.CSSProperties;
}

export default function AppointmentCalendar(props: AppointmentCalendarProps) {
  const locales = useMemo(() => ({ 'en-US': enUS }), []);
  const localizer = useMemo(
    () => dateFnsLocalizer({ format, parse, startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), getDay, locales }),
    [locales]
  );

  const eventPropGetter = (event: any) => {
    const status = (event.resource?.status || '').toUpperCase();
    let className = '';
    let style: any = {};
    switch (status) {
      case 'SCHEDULED':
        style.backgroundColor = '#3b82f6'; // blue-500
        style.borderColor = '#2563eb';
        break;
      case 'COMPLETED':
        style.backgroundColor = '#10b981'; // green-500
        style.borderColor = '#059669';
        break;
      case 'CANCELLED':
      case 'CANCELED':
        style.backgroundColor = '#ef4444'; // red-500
        style.borderColor = '#dc2626';
        style.opacity = 0.8;
        break;
      case 'RESCHEDULED':
        style.backgroundColor = '#f59e0b'; // amber-500
        style.borderColor = '#d97706';
        break;
      default:
        style.backgroundColor = '#6b7280'; // gray-500
        style.borderColor = '#4b5563';
    }
    style.color = 'white';
    return { className, style };
  };

  return (
    <Calendar
      localizer={localizer}
      events={props.events}
      defaultView={props.defaultView}
      onView={props.onView}
      selectable={props.selectable}
      onSelectSlot={props.onSelectSlot}
      popup
      eventPropGetter={eventPropGetter as any}
      style={props.style || { height: 600 }}
    />
  );
}
