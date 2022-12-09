const fs = require("fs");
const { writeExifImg } = require("./lib/exif.js");
let config = require("./config/config.json");
//const scheduledMsg = require("./config/scheduledMsg.json");
//const schedule = require("node-schedule");

const {
  default: botSticker,
  useSingleFileAuthState,
  downloadMediaMessage,
  DisconnectReason,
} = require("@adiwajshing/baileys");

const { Boom } = require("@hapi/boom");
const P = require("pino");

const { state, saveState } = useSingleFileAuthState("botStickerSession.json");

const logger = P();

function runBot() {
  const sock = botSticker({
    auth: state,
    printQRInTerminal: true,
    logger: P({
      level: "silent",
    }),
  });

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      const error = new Boom(lastDisconnect.error);
      const alasanError = error?.output?.statusCode;

      if (alasanError === DisconnectReason.loggedOut) {
        sock.logout();
      } else {
        runBot();
      }
    } else {
      console.log("connection opened");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    const msg = messages[0];
    if (
      !msg.message ||
      msg.key.remoteJid === "status@broadcast" ||
      msg.key.fromMe
    )
      return;
    if (msg.key.remoteJid === config.idGroup) {
      let pesan;
      //fitur sticker
      if (msg.message.imageMessage) {
        pesan = msg.message.imageMessage.caption;
        if (pesan === "buatkan sticker") {
          let buffer = await downloadMediaMessage(
            msg,
            "buffer",
            {},
            { logger }
          );

          buffer = await writeExifImg(buffer, {
            packname: "ngaji ngoding",
            author: "ngaji ngoding",
          });

          sock.sendMessage(msg.key.remoteJid, { sticker: { url: buffer } });
          fs.unlinkSync(buffer);
        }
      }
      //pesan teks
      if (msg.message.conversation) {
        B;
        pesan = msg.message.conversation;
        if ((pesan = "wc2022")) {
          console.log(pesan);
        }
      }
    }
  });

  sock.ev.on("creds.update", saveState);

  //scheduledMsg.forEach(el=>{
  //  let date = new Date(el.date+"T"+el.time);
  //  if(date == "Invalid Date") date = el.cron;
  //  schedule.scheduleJob(date, ()=>{
  //    sock.sendMessage(config.idGroup, {text: el.msg});
  //  })
  //})
}

runBot();
