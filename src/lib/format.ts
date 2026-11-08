/**
 * Dates and numbers for the interface. One locale for all of them: Arabic words, Western digits (1, 2, 3),
 * so a number never switches between two scripts from one screen to the next.
 */
const LOCALE = "ar-u-nu-latn";

type DateOpts = Pick<Intl.DateTimeFormatOptions, "weekday" | "day" | "month" | "year" | "hour" | "minute">;

export const fmtDate = (ms: number, opts: DateOpts) => new Date(ms).toLocaleDateString(LOCALE, opts);
export const fmtTime = (ms: number, opts: DateOpts = { hour: "numeric", minute: "2-digit" }) => new Date(ms).toLocaleTimeString(LOCALE, opts);
export const fmtNumber = (n: number) => n.toLocaleString(LOCALE);

/** a reusable formatter, for places that format many dates */
export const dateFormat = (opts: DateOpts) => new Intl.DateTimeFormat(LOCALE, opts);
