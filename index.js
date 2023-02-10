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
const axios = require("axios");
const { log } = require("console");

const logger = P();

const { state, saveState } = useSingleFileAuthState("sess.json");

async function runBot() {
  const sock = botSticker({
    auth: state,
    printQRInTerminal: true,
    logger: P({
      level: "debug",
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
        pesan = msg.message.conversation;
        if ((pesan = "wc2022")) {
          sock.sendMessage(msg.key.remoteJid, buttonMsg);
        }
      }
      //response button message
      if (msg.message.buttonsResponseMessage) {
        pesan = msg.message.buttonsResponseMessage.selectedDisplayText;
        wc2022[pesan](msg.key.remoteJid, sock.sendMessage);
      }
      //response listMessage
      if (msg.message.listResponseMessage) {
        id = msg.message.listResponseMessage.singleSelectReply.selectedRowId;
        pesan =
          msg.message.listResponseMessage.contextInfo.quotedMessage.listMessage
            .sections[0].title;
        wc2022[pesan](msg.key.remoteJid, sock.sendMessage, id);
      }
    }
  });

  sock.ev.on("presence.update", (json) => console.log(json));

  //sock.fetchStatus("+6285655291482@s.whatsapp.net");

  sock.ev.on("creds.update", saveState);

  //scheduledMsg.forEach(el=>{
  //  let date = new Date(el.date+"T"+el.time);
  //  if(date == "Invalid Date") date = el.cron;
  //  schedule.scheduleJob(date, ()=>{
  //    sock.sendMessage(config.idGroup, {text: el.msg});
  //  })
  //})
}

let wc2022 = {
  async teams(noTujuan, sendMessage, id) {
    try {
      if (!id) {
        let res = await axios({
          method: "get",
          url: "http://api.cup2022.ir/api/v1/team",
          headers: {
            Authorization: config.tokenWC22,
            "Content-Type": "application/json",
          },
        });
        let rows = res.data.data.map((country) => {
          return {
            title: country.name_en,
            rowId: country.id,
          };
        });
        let listMessage = {
          text: "daftar team piala dunia 2022",
          buttonText: "tampilkan",
          sections: [
            {
              title: "teams",
              rows,
            },
          ],
        };
        sendMessage(noTujuan, listMessage);
      } else {
        let res = await axios({
          method: "get",
          url: "http://api.cup2022.ir/api/v1/team/" + id,
          headers: {
            Authorization: config.tokenWC22,
            "Content-Type": "application/json",
          },
        });
        let data = res.data.data[0];
        let msg = {
          image: { url: data.flag },
          caption: `nama : ${data.name_en}\nFIFA CODE : ${data.fifa_code}\nGroup : ${data.groups}`,
        };
        sendMessage(noTujuan, msg);
      }
    } catch (err) {
      console.log(err.message);
    }
  },
  matchs() {},
  standings() {},
};

let i = 0;

let buttons = Object.getOwnPropertyNames(wc2022).map((but) => {
  i += 1;
  return {
    buttonId: i,
    buttonText: { displayText: but },
    type: 1,
  };
});

let buttonMsg = {
  text: "informasi piala dunia qatar 2022",
  buttons,
  headerType: 1,
};

runBot();
