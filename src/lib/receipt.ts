type ReceiptData = {
  raffleName: string;
  logoUrl: string;
  reservationId: string;
  fullName: string;
  phone: string;
  numbers: number[];
  total: number;
  expiresAt: string;
  ticketPrice: number;
};

const W = 900;
const H = 1320;

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function pad(value: number) {
  return String(value).padStart(3, "0");
}

export async function downloadReceipt(data: ReceiptData) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo generar el comprobante.");

  // Fondo
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#0f0f0f";
  ctx.fillRect(0, 0, W, 260);

  // Logotipo
  const logo = await loadImage(data.logoUrl);
  if (logo) ctx.drawImage(logo, 60, 40, 180, 180);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 46px Georgia, serif";
  ctx.fillText(data.raffleName, 270, 110);
  ctx.font = "600 24px Helvetica, Arial, sans-serif";
  ctx.fillStyle = "#f4c542";
  ctx.fillText("COMPROBANTE DE APARTADO", 270, 155);
  ctx.fillStyle = "#cccccc";
  ctx.font = "20px Helvetica, Arial, sans-serif";
  ctx.fillText(`Emitido: ${new Date().toLocaleString("es-MX")}`, 270, 195);

  let y = 340;
  const row = (label: string, value: string) => {
    ctx.fillStyle = "#777777";
    ctx.font = "bold 18px Helvetica, Arial, sans-serif";
    ctx.fillText(label.toUpperCase(), 60, y);
    ctx.fillStyle = "#0f0f0f";
    ctx.font = "bold 30px Helvetica, Arial, sans-serif";
    ctx.fillText(value, 60, y + 38);
    y += 90;
  };

  row("Folio de apartado", data.reservationId.slice(0, 8).toUpperCase());
  row("Nombre completo", data.fullName);
  row("Celular registrado", data.phone);
  row("Boletos apartados", `${data.numbers.length} boleto(s)`);
  row("Precio por boleto", `$${data.ticketPrice.toLocaleString("es-MX")} MXN`);
  row("Total a pagar", `$${data.total.toLocaleString("es-MX")} MXN`);
  row("Vence el", new Date(data.expiresAt).toLocaleString("es-MX"));

  // Números
  ctx.fillStyle = "#777777";
  ctx.font = "bold 18px Helvetica, Arial, sans-serif";
  ctx.fillText("TUS NÚMEROS", 60, y);
  y += 30;

  const perRow = 8;
  const box = 92;
  const gap = 8;
  data.numbers.forEach((n, i) => {
    const cx = 60 + (i % perRow) * (box + gap);
    const cy = y + Math.floor(i / perRow) * (box + gap);
    ctx.fillStyle = "#0f0f0f";
    ctx.fillRect(cx, cy, box, box);
    ctx.fillStyle = "#f4c542";
    ctx.font = "bold 32px Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(pad(n), cx + box / 2, cy + box / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  });

  // Pie
  ctx.fillStyle = "#777777";
  ctx.font = "18px Helvetica, Arial, sans-serif";
  ctx.fillText("Este comprobante confirma tu apartado, no el pago.", 60, H - 90);
  ctx.fillText("Envía tu comprobante de pago por WhatsApp antes de que venza.", 60, H - 60);

  const url = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = url;
  link.download = `comprobante-${data.reservationId.slice(0, 8)}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
