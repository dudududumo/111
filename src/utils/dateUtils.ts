const TIMEZONE = 'Asia/Shanghai';

export function getBeijingTime(): Date {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
}

export function getBeijingTimeISO(): string {
  const now = new Date();
  const beijingTime = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
  return beijingTime.toISOString();
}

export function formatBeijingDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', { 
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatBeijingDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', { 
    timeZone: TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatBeijingTimeOnly(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('zh-CN', { 
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatBeijingShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', { 
    timeZone: TIMEZONE,
    month: 'short',
    day: 'numeric'
  });
}

export function formatBeijingDateTimeShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', { 
    timeZone: TIMEZONE,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
