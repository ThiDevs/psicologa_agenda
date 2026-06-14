export function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatDuration(minutes: number) {
  if (minutes <= 0) {
    return '0min';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}min`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}min`;
}

export function formatRating(value: number) {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function formatDateLabel(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  const weekday = parsed.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  const dayMonth = parsed.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  }).replace('.', '');

  return {
    weekday: capitalize(weekday),
    label: dayMonth,
    full: `${capitalize(weekday)}, ${dayMonth}`,
  };
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function buildDateOptions(daysAhead = 5) {
  const today = new Date();

  return Array.from({ length: daysAhead }, (_, index) => {
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + index);
    const id = getIsoDate(nextDate);
    const labels = formatDateLabel(id);

    return {
      id,
      ...labels,
    };
  });
}

export function combineDateAndTime(date: string, time: string) {
  return `${date}T${time}:00`;
}

export function addMinutesToTime(time: string, minutes: number) {
  const [hoursString, minutesString] = time.split(':');
  const date = new Date(2026, 0, 1, Number(hoursString), Number(minutesString) + minutes);

  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function minutesFromTime(time: string) {
  const [hoursString, minutesString] = time.split(':');

  return Number(hoursString) * 60 + Number(minutesString);
}

export function timeFromMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
