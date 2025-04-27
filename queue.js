const Queue = require('bull');
const { getSock, isSockAvailable } = require('./sock');

// Redis Queue untuk pengiriman pesan
const sendMessageQueue = new Queue('send-message', {
  redis: {
    host: 'localhost',
    port: 6379,
  }
});

sendMessageQueue.process(async (job) => {
  console.log('💬 Memproses pekerjaan:', job.id);

  const { number, message } = job.data;

  if (!isSockAvailable()) {
    console.error('❌ sock belum siap! Menunggu beberapa detik...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    return job.retry();
  }

  try {
    const sock = getSock();

    // Cek apakah sudah termasuk JID
    let jid = number.includes('@') ? number : `${number}@s.whatsapp.net`;

    // Validasi JID
    if (!jid.endsWith('@s.whatsapp.net') && !jid.endsWith('@g.us')) {
      throw new Error('Format nomor/JID tidak valid');
    }

    console.log(`💬 Mengirim pesan ke ${jid}`);
    await sock.sendMessage(jid, { text: message });
    console.log(`✅ Pesan berhasil dikirim ke ${number}`);
  } catch (err) {
    console.error(`❌ Gagal kirim pesan ke ${number}:`, err.message);
    throw err;
  }
});

module.exports = { sendMessageQueue };
