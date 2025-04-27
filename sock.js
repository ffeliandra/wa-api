// sock.js
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const qrcode = require('qrcode');

let sock = null;
let qrData = null;
let isConnecting = false;

// Fungsi utama untuk memulai koneksi WA
async function startSock() {
  if (isConnecting) return;
  isConnecting = true;

  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth');

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrData = await qrcode.toDataURL(qr);
      }

      if (connection === 'open') {
        console.log('✅ Bot terkoneksi ke WhatsApp');
        qrData = null;
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = code !== DisconnectReason.loggedOut;

        console.log('❌ Koneksi tertutup. Alasan:', code);

        if (shouldReconnect) {
          console.log('🔁 Mencoba koneksi ulang...');
          await startSock();
        } else {
          console.log('🔒 Logout dari WhatsApp');
          sock = null;
        }
      }
    });

    isConnecting = false;
  } catch (err) {
    console.error('❌ Gagal inisialisasi socket:', err.message);
    isConnecting = false;
  }
}

// Untuk akses socket dari file lain
function getSock() {
  return sock;
}

// Cek apakah sock siap digunakan
function isSockAvailable() {
  return !!sock && !!sock.user;
}

// Ambil QR code base64 atau status
function getQR() {
  if (qrData) return qrData;
  if (sock?.user) return 'connected';
  return null;
}

// Logout dan reset session
async function logout() {
  if (sock) {
    await sock.logout();
    console.log('🧹 Session telah dihapus');
    sock = null;
    qrData = null;

    // Hapus folder auth (session)
    fs.rmSync('./auth', { recursive: true, force: true });

    // Restart untuk QR baru
    await startSock();
  }
}

// Ambil daftar grup
async function listGroups() {
  if (!sock) throw new Error('Sock belum siap');
  const chats = await sock.groupFetchAllParticipating();
  return Object.values(chats).map(group => ({
    id: group.id,
    subject: group.subject,
  }));
}

module.exports = {
  startSock,
  getSock,
  isSockAvailable,
  getQR,
  logout,
  listGroups,
};
