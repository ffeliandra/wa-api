const express = require('express');
const { sendMessageQueue } = require('./queue');
const { startSock, listGroups } = require('./sock'); // Import fungsi listGroups
const { getQR, logout } = require('./sock');
// Memulai WhatsApp Bot
startSock();

// Express Web Server (API)
const app = express();
app.use(express.json());

// Endpoint kirim pesan WA (bisa ke nomor atau grup)
app.post('/send-message', async (req, res) => {
  const { number, message } = req.body;

  if (!number || !message) {
    return res.status(400).json({ error: 'Number dan message wajib diisi.' });
  }

  try {
    // Menambahkan pesan ke antrian
    await sendMessageQueue.add(
      {
        number,
        message
      },
      {
        delay: 5000,
        attempts: 3,
      }
    );
    res.json({ success: true, message: `Pesan berhasil ditambahkan ke antrian untuk ${number}` });
  } catch (err) {
    console.error('❌ Kirim pesan gagal:', err.message);
    res.status(500).json({ error: 'Gagal kirim pesan', detail: err.message });
  }
});

// Endpoint untuk QR Code
app.get('/qr', (req, res) => {
  const qr = getQR();

  if (qr === 'connected') {
    return res.send(`
      <html>
        <head>
          <title>Sudah Terkoneksi</title>
        </head>
        <body style="text-align:center; font-family:sans-serif">
          <h2>✅ Sudah terkoneksi ke WhatsApp</h2>
          <form method="GET" action="/logout">
            <button style="padding:10px 20px; font-size:16px;">Logout</button>
          </form>
        </body>
      </html>
    `);
  }

  if (!qr) {
    return res.send(`
      <html>
        <head>
          <title>Menunggu QR</title>
          <meta http-equiv="refresh" content="5"> <!-- Refresh otomatis tiap 5 detik -->
        </head>
        <body style="text-align:center; font-family:sans-serif">
          <h2>⏳ Belum tersedia. Tunggu socket siap...</h2>
          <p>Halaman akan refresh otomatis.</p>
        </body>
      </html>
    `);
  }

  res.send(`
    <html>
      <head>
        <title>Scan QR WhatsApp</title>
        <meta http-equiv="refresh" content="10"> <!-- Cek ulang tiap 10 detik -->
      </head>
      <body style="text-align:center; font-family:sans-serif">
        <h2>📱 Scan QR Code WhatsApp</h2>
        <img src="${qr}" style="margin-bottom:20px;" />
        <p>Halaman akan refresh otomatis setelah 10 detik.</p>
      </body>
    </html>
  `);
});

// Ini untuk GET /logout (buka halaman konfirmasi logout)
app.get('/logout', (req, res) => {
  res.send(`
    <html>
      <body style="text-align:center; font-family:sans-serif">
        <h2>🔌 Anda yakin ingin logout?</h2>
        <form method="POST" action="/logout">
          <button style="padding:10px 20px; font-size:16px;">Logout</button>
        </form>
      </body>
    </html>
  `);
});

// Ini untuk POST /logout (aksi benar-benar logout)
app.post('/logout', async (req, res) => {
  try {
    await logout();
    res.redirect('/qr'); // setelah logout balik ke halaman QR
  } catch (err) {
    res.status(500).json({ error: 'Gagal logout', detail: err.message });
  }
});

// Endpoint untuk mengambil daftar grup
app.get('/groups', async (req, res) => {
  try {
    const groups = await listGroups();
    res.json({ success: true, groups });
  } catch (err) {
    console.error('❌ Gagal mengambil grup:', err.message);
    res.status(500).json({ error: 'Gagal mengambil grup', detail: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API berjalan di http://localhost:${PORT}`);
});
