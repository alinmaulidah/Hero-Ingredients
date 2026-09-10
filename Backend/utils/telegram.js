/**
 * ============================================================
 * NOTIFIKASI TELEGRAM
 * ============================================================
 * Kirim pesan via Telegram Bot API. Aktif bila env berikut diisi:
 *   TELEGRAM_BOT_TOKEN  — token bot dari @BotFather
 *   TELEGRAM_CHAT_ID    — chat id penerima (pribadi/group)
 * Kalau belum dikonfigurasi, fungsi tidak gagal — hanya mencatat
 * peringatan agar alur webhook pembayaran tetap jalan.
 */

const TELEGRAM_API = 'https://api.telegram.org';

const isConfigured = () =>
  Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);

/**
 * Kirim pesan teks biasa ke chat yang dikonfigurasi.
 * @param {string} text Pesan (mendukung emoji & baris baru; tanpa HTML).
 * @returns {Promise<boolean>} true bila terkirim.
 */
async function sendTelegramMessage(text) {
  if (!isConfigured()) {
    console.warn(
      '[telegram] Lewati kirim notifikasi: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID belum diisi di Backend/.env'
    );
    return false;
  }

  try {
    const res = await fetch(
      `${TELEGRAM_API}/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: String(text).substring(0, 3500),
          disable_web_page_preview: true
        })
      }
    );

    if (!res.ok) {
      const bodyText = await res.text();
      console.error(
        '[telegram] Gagal mengirim pesan:',
        res.status,
        bodyText.slice(0, 300)
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('[telegram] Error kirim pesan:', error.message);
    return false;
  }
}

module.exports = { sendTelegramMessage };
