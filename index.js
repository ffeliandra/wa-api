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

// app.get('/qr', (req, res) => {
//   const qr = getQR();

//   if (qr === 'connected') {
//     return res.status(200).send('✅ Sudah terkoneksi ke WhatsApp');
//   }

//   if (!qr) {
//     return res.status(200).send('⏳ Belum tersedia. Tunggu socket siap...');
//   }

//   res.send(`
//     <html>
//       <body style="text-align:center; font-family:sans-serif">
//         <h2>Scan QR Code WhatsApp</h2>
//         <img src="${qr}" />
//       </body>
//     </html>
//   `);
// });

app.get('/qr', (req, res) => {
  const qr = getQR();

  if (qr === 'connected') {
    return res.send(`
      <html>
        <body style="text-align:center; font-family:sans-serif">
          <h2>✅ Sudah terkoneksi ke WhatsApp</h2>
          <form method="POST" action="/api-wa/logout">
            <button style="padding:10px 20px; font-size:16px;">Logout</button>
          </form>
        </body>
      </html>
    `);
  }

  if (!qr) {
    return res.status(200).send('⏳ Belum tersedia. Tunggu socket siap...');
  }

  res.send(`
    <html>
      <body style="text-align:center; font-family:sans-serif">
        <h2>📱 Scan QR Code WhatsApp</h2>
        <img src="${qr}" style="margin-bottom:20px;" />
        
      </body>
    </html>
  `);
});



// Endpoint untuk logout
app.get('/logout', async (req, res) => {
  try {
    await logout();
    res.send('✅ Berhasil logout dan hapus session');
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
