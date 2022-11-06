const {writeExifImg}= require("./lib/exif.js");

const {
  default: botSticker,
    useSingleFileAuthState,
    downloadMediaMessage,
    DisconnectReason
  } = require("@adiwajshing/baileys");

  const {
    Boom
  } = require("@hapi/boom");
  const P = require("pino");
  

  const {
    state,
    saveState
  } = useSingleFileAuthState("botStickerSession.json");

  const logger = P();

  function runBot() {
    const sock = botSticker({
      auth: state,
      printQRInTerminal: true,
      logger: P({
        level: "silent"
      })
    });

    sock.ev.on("connection.update", ({
      connection, lastDisconnect
    })=> {
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

    sock.ev.on("messages.upsert",
      async ({
        messages, type
      })=> {
        const msg = messages[0];
        if (!msg.message || msg.key.remoteJid === "status@broadcast" || msg.key.fromMe||!msg.message.imageMessage)return;

        let caption = msg.message.imageMessage.caption;

        let buffer = await downloadMediaMessage(msg, "buffer", {}, {
          logger
        });
        
        buffer = await writeExifImg(buffer, {packname:"ngaji ngoding", author:"ngaji ngoding"});
        
        if (caption === 'buatkan sticker') {
          sock.sendMessage(msg.key.remoteJid, {sticker:{url: buffer}});
        }

      });

    sock.ev.on("creds.update",
      saveState);
  }


  runBot();