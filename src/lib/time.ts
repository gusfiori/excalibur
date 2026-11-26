const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });

/** "agora mesmo", "há 5 minutos", "ontem", "há 3 dias", "12 de nov."... */
export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "";
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "agora mesmo";
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 7 * 86400) return rtf.format(Math.round(seconds / 86400), "day");
  return dateFmt.format(new Date(iso));
}

/** "Bom dia" / "Boa tarde" / "Boa noite" pela hora do computador. */
export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}
