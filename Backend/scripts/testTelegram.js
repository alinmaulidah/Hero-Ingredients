// Tes kirim notifikasi Telegram.
// Jalankan: npm run test:telegram (di folder Backend).
// Bila TELEGRAM_CHAT_ID belum diisi, script mencari chat id secara otomatis
// dari pesan terakhir yang dikirim ke bot.
require('dotenv').config();

const TELEGRAM_API = 'https://api.telegram.org';

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.error(
      '\nTELEGRAM_BOT_TOKEN belum diisi di Backend/.env.\n' +
        'Cara membuat bot:\n' +
        '1. Buka Telegram, chat @BotFather\n' +
        '2. Kirim /newbot, ikuti petunjuk, lalu salin token yang diberikan\n' +
        '3. Isi TELEGRAM_BOT_TOKEN=<token> di Backend/.env lalu jalankan lagi.\n'
    );
    process.exit(1);
  }

  const api = `${TELEGRAM_API}/bot${token}`;

  let chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    console.log('TELEGRAM_CHAT_ID belum diisi — mencoba mendeteksi otomatis…\n');
    const res = await fetch(`${api}/getUpdates`);
    const json = await res.json();

    if (!json.ok) {
      console.error('Gagal memanggil getUpdates:', JSON.stringify(json).slice(0, 300));
      process.exit(1);
    }

    const updates = json.result || [];
    const candidates = updates
      .map((update) => {
        const chat =
          (update.message && update.message.chat) ||
          (update.channel_post && update.channel_post.chat) ||
          (update.my_chat_member && update.my_chat_member.chat);
        return chat ? chat : null;
      })
      .filter(Boolean);

    const lastChat = candidates[candidates.length - 1];
    if (!lastChat) {
      console.error(
        'Tidak ada chat ditemukan.\n' +
          'Langkah: chat dulu ke bot kamu (ketik pesan apa saja, mis. "halo"),\n' +
          'lalu jalankan script ini lagi.'
      );
      process.exit(1);
    }

    chatId = lastChat.id;
    console.log(`Chat id terdeteksi: ${chatId} (${lastChat.title || lastChat.first_name || 'chat'})\n`);
  }

  const sendRes = await fetch(`${api}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: '✅ Tes notifikasi Telegram berhasil!\nServer Hero Ingredients siap mengirim notifikasi pembayaran ke sini.'
    })
  });

  if (!sendRes.ok) {
    const text = await sendRes.text();
    console.error('Gagal mengirim pesan tes:', sendRes.status, text.slice(0, 300));
    process.exit(1);
  }

  console.log('Pesan tes terkirim ✓');
  if (!process.env.TELEGRAM_CHAT_ID) {
    console.log(`\nSupaya notifikasi otomatis, isi di Backend/.env:\nTELEGRAM_CHAT_ID=${chatId}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
