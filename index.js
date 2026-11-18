import 'dotenv/config';
import http from 'node:http';
import { Client, GatewayIntentBits, ActivityType, Events } from 'discord.js';

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('HATA: DISCORD_TOKEN tanimli degil. .env dosyasini kontrol et.');
  process.exit(1);
}

// Botun gorunecegi durum: online | idle | dnd | invisible
const STATUS = process.env.BOT_STATUS ?? 'online';
const ACTIVITY_TEXT = process.env.BOT_ACTIVITY ?? 'panda_v2.0 | 7/24 aktif';
const ACTIVITY_TYPE = ActivityType.Custom; // Ozel durum metni olarak gorunur

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (c) => {
  console.log(`[OK] ${c.user.tag} olarak giris yapildi. Sunucu sayisi: ${c.guilds.cache.size}`);

  c.user.setPresence({
    status: STATUS,
    activities: [{ name: ACTIVITY_TEXT, type: ACTIVITY_TYPE }],
  });

  // Durumu her 10 dakikada bir tazele (bazi durumlarda presence dusebiliyor)
  setInterval(() => {
    c.user.setPresence({
      status: STATUS,
      activities: [{ name: ACTIVITY_TEXT, type: ACTIVITY_TYPE }],
    });
  }, 10 * 60 * 1000);
});

client.on(Events.Error, (err) => console.error('[DISCORD ERROR]', err.message));
client.on(Events.Warn, (msg) => console.warn('[DISCORD WARN]', msg));

client.on(Events.Disconnect, () => {
  console.warn('[!] Baglanti koptu, yeniden baglaniliyor...');
});

client.on(Events.Resume, (replayed) => {
  console.log(`[OK] Baglanti yeniden kuruldu (${replayed} olay tekrar islendi).`);
});

// ------------------------------------------------------------------
// Ucretsiz bulut saglayicilari (Render/Railway vb.) bos servisi
// uyutmasin diye basit bir HTTP saglik ucu tutuyoruz.
// UptimeRobot / cron-job.org ile bu adrese 5 dakikada bir ping at.
// ------------------------------------------------------------------
const PORT = process.env.PORT ?? 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        ok: true,
        bot: client.user?.tag ?? 'baglaniyor',
        ping: client.ws.ping,
        uptime: Math.floor(process.uptime()),
        guilds: client.guilds.cache.size,
      })
    );
    return;
  }
  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, () => console.log(`[OK] Saglik ucu http://localhost:${PORT}/health`));

// Kapanma sinyallerinde temiz cikis
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`\n[!] ${sig} alindi, kapatiliyor...`);
    client.destroy();
    server.close(() => process.exit(0));
  });
}

process.on('unhandledRejection', (err) => console.error('[UNHANDLED]', err));

client.login(token);
