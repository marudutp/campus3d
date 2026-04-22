// 💰 FORMAT RUPIAH
export function formatRupiah(amount: number | undefined | null): string {
  if (!amount || isNaN(amount)) return "Rp0";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).format(amount);
}

// 📅 FORMAT TANGGAL (Indonesia)
export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return "";

  try {
    const d = new Date(date);

    if (isNaN(d.getTime())) return "";

    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  } catch {
    return "";
  }
}

// 🕒 FORMAT DATETIME (OPSIONAL)
export function formatDateTime(date: string | Date | undefined | null): string {
  if (!date) return "";

  try {
    const d = new Date(date);

    if (isNaN(d.getTime())) return "";

    return d.toLocaleString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
}