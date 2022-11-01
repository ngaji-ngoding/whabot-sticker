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
  const fs = require("fs");
  const {
    tmpdir
  } = require("os");
  const Crypto = require("crypto");
  const ff = require('fluent-ffmpeg');
  const webp = require("node-webpmux");
  const path = require("path");

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

  async function imageToWebp (media) {

    const tmpFileOut = path.join(tmpdir(),
      `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    const tmpFileIn = path.join(tmpdir(),
      `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.jpg`)

    fs.writeFileSync(tmpFileIn,
      media)

    await new Promise((resolve, reject) => {
      ff(tmpFileIn)
      .on("error", reject)
      .on("end", () => resolve(true))
      .addOutputOptions([
        "-vcodec",
        "libwebp",
        "-vf",
        "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse"
      ])
      .toFormat("webp")
      .save(tmpFileOut)
    })

    const buff = fs.readFileSync(tmpFileOut)
    fs.unlinkSync(tmpFileOut)
    fs.unlinkSync(tmpFileIn)
    return buff
  }

  async function writeExifImg (media, metadata) {
    let wMedia = await imageToWebp(media)
    const tmpFileIn = path.join("./",
      `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    const tmpFileOut = path.join("./",
      `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`)
    fs.writeFileSync(tmpFileIn,
      wMedia)

    if (metadata.packname || metadata.author) {
      const img = new webp.Image()
      const json = {
        "sticker-pack-id": `https://github.com/DikaArdnt/Hisoka-Morou`,
        "sticker-pack-name": metadata.packname,
        "sticker-pack-publisher": metadata.author,
        "emojis": metadata.categories ? metadata.categories: [""]
      }
      const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
      const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8")
      const exif = Buffer.concat([exifAttr, jsonBuff])
      exif.writeUIntLE(jsonBuff.length, 14, 4)
      await img.load(tmpFileIn)
      fs.unlinkSync(tmpFileIn)
      img.exif = exif
      await img.save(tmpFileOut)
      return tmpFileOut
    }
  }


  runBot();