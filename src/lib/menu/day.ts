export function todayKeyEuropeHelsinki(date?: Date): string {
  const d = date ? new Date(date) : new Date();
  // convert to Europe/Helsinki by formatting parts
  const y = Number(new Intl.DateTimeFormat('fi-FI', { timeZone: 'Europe/Helsinki', year: 'numeric' }).format(d));
  const m = Number(new Intl.DateTimeFormat('fi-FI', { timeZone: 'Europe/Helsinki', month: '2-digit' }).format(d));
  const da = Number(new Intl.DateTimeFormat('fi-FI', { timeZone: 'Europe/Helsinki', day: '2-digit' }).format(d));
  return `${y}-${String(m).padStart(2,'0')}-${String(da).padStart(2,'0')}`;
}

export function weekdayLabels(date?: Date) {
  const d = date ? new Date(date) : new Date();
  const en = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Helsinki', weekday: 'long' }).format(d);
  const fi = new Intl.DateTimeFormat('fi-FI', { timeZone: 'Europe/Helsinki', weekday: 'long' }).format(d);
  // Capitalize Finnish like “Tiistai”
  const fiCap = fi.charAt(0).toUpperCase() + fi.slice(1);
  const enCap = en.charAt(0).toUpperCase() + en.slice(1);
  return { fi: fiCap, en: enCap };
}

export function weekdayLabelFi(date = new Date()) {
  const w = new Intl.DateTimeFormat('fi-FI', { timeZone: 'Europe/Helsinki', weekday: 'long' }).format(date)
  return w.charAt(0).toUpperCase() + w.slice(1) // e.g., "Tiistai"
}

export function dayOverrideToFiEn(input: string): { fi: string; en: string } | null {
  const s = input.trim().toLowerCase();
  const map: Record<string, {fi:string,en:string}> = {
    mon: { fi:'Maanantai', en:'Monday' }, monday:{ fi:'Maanantai', en:'Monday' },
    tue: { fi:'Tiistai',   en:'Tuesday' }, tuesday:{ fi:'Tiistai',   en:'Tuesday' },
    wed: { fi:'Keskiviikko', en:'Wednesday' }, wednesday:{ fi:'Keskiviikko', en:'Wednesday' },
    thu: { fi:'Torstai',   en:'Thursday' }, thursday:{ fi:'Torstai',   en:'Thursday' },
    fri: { fi:'Perjantai', en:'Friday' }, friday:{ fi:'Perjantai', en:'Friday' },
  };
  return map[s] || null;
}

// Return the YYYY-MM-DD (Europe/Helsinki) for the NEXT occurrence of a Finnish weekday label
// e.g. dateForNextWeekdayFi('Maanantai') → next Monday (tomorrow if today is Sunday)
export function dateForNextWeekdayFi(targetDayFi: string, fromDate: Date = new Date()): string {
  const map: Record<string, number> = {
    'Maanantai': 1, 'Tiistai': 2, 'Keskiviikko': 3, 'Torstai': 4, 'Perjantai': 5,
    // (optional) add weekend if you ever need them:
    'Lauantai': 6, 'Sunnuntai': 0,
  };

  const tz = 'Europe/Helsinki';
  if (!(targetDayFi in map)) throw new Error(`Unknown Finnish weekday: ${targetDayFi}`);

  // Get local Helsinki Y-M-D for the "fromDate"
  const y = Number(new Intl.DateTimeFormat('fi-FI', { timeZone: tz, year: 'numeric' }).format(fromDate));
  const m = Number(new Intl.DateTimeFormat('fi-FI', { timeZone: tz, month: '2-digit' }).format(fromDate));
  const d = Number(new Intl.DateTimeFormat('fi-FI', { timeZone: tz, day: '2-digit' }).format(fromDate));

  // Create a UTC date corresponding to that local Helsinki date (so adding days is stable)
  const localMidnightUTC = new Date(Date.UTC(y, m - 1, d));

  // Compute current local weekday (0=Sun..6=Sat) for Helsinki-local date
  // Since localMidnightUTC is already “that local date at UTC midnight”, getUTCDay matches local weekday.
  const currentDow = localMidnightUTC.getUTCDay(); // 0..6
  const targetDow = map[targetDayFi] === 0 ? 0 : map[targetDayFi]; // 0..6

  // Days ahead (next occurrence, including “tomorrow” if needed; if same day, advance 7 to avoid rewriting today’s cache)
  let daysAhead = (targetDow - currentDow + 7) % 7;
  if (daysAhead === 0) daysAhead = 7;

  const next = new Date(localMidnightUTC);
  next.setUTCDate(next.getUTCDate() + daysAhead);

  // Format back as Helsinki-local YYYY-MM-DD
  return todayKeyEuropeHelsinki(next);
}



export function dateKeyForNextFiWeekday(targetFi: string, now = new Date()): string {
  const order = ['Maanantai','Tiistai','Keskiviikko','Torstai','Perjantai','Lauantai','Sunnuntai'];
  const idx = order.indexOf(targetFi);
  if (idx === -1) return todayKeyEuropeHelsinki(now);
  // find next date (including today if matches)
  const helsinki = new Intl.DateTimeFormat('fi-FI', { timeZone: 'Europe/Helsinki', weekday: 'long' }).format(now);
  const todayFi = helsinki.charAt(0).toUpperCase() + helsinki.slice(1);
  let d = new Date(now);
  for (let i=0;i<7;i++){
    const fi = new Intl.DateTimeFormat('fi-FI', { timeZone: 'Europe/Helsinki', weekday: 'long' }).format(d);
    const cap = fi.charAt(0).toUpperCase() + fi.slice(1);
    if (cap === targetFi) break;
    d.setDate(d.getDate()+1);
  }
  return todayKeyEuropeHelsinki(d);
}
