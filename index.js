const express = require("express");
const path = require("path");
const PORT = process.env.PORT || 5000;
const line = require("@line/bot-sdk");
const config = {
  channelAccessToken: process.env.ACCESS_TOKEN,
  channelSecret: process.env.SECRET_KEY
};
const client = new line.Client(config); // 追加

const Discord = require('discord.js')
const discordClient = new Discord.Client()

const gid = process.env.GROUP_ID;

const uid = process.env.USER_ID;

const lineChannel = process.env.LINE_CHANNEL;

const guildId = process.env.GUILD_ID;

express()
  .use(express.static(path.join(__dirname, "public")))
  .set("views", path.join(__dirname, "views"))
  .set("view engine", "ejs")
  .get("/", (req, res) => res.render("pages/index"))
  .get("/g/", (req, res) => res.json({ method: "こんにちは、getさん" }))
  .post("/p/", (req, res) => res.json({ method: "こんにちは、postさん" }))
  .post("/hook/", line.middleware(config), (req, res) => lineBot(req, res))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

function lineBot(req, res) {
  res.status(200).end();
  // ここから追加
  const events = req.body.events;
  const promises = [];
  for (let i = 0, l = events.length; i < l; i++) {
    const ev = events[i];
    promises.push(
      echoman(ev)
    );
  }
  Promise.all(promises).then(console.log("pass"));
}

// 追加
async function echoman(ev) {
  console.log(ev);

  if (ev.source.userId === uid || ev.source.groupId === gid){

    const pro =  await client.getGroupMemberProfile(gid, ev.source.userId);

    var message = ev.message.text

    const name = pro.displayName

    const type = ev.message.type

    if (message === "/neko"){
      client.replyMessage(ev.replyToken,{
        type: "text",
        text: "にゃーん(=ΦωΦ=)"
      });
    } else if (type === "sticker"){
      console.log("スタンプ");

      const text = name + "＜ [スタンプ]"

      const stickerUrl = "https://stickershop.line-scdn.net/stickershop/v1/sticker/" + ev.message.stickerId + "/android/sticker.png"

      console.log(stickerUrl);

      discordClient.channels.cache.get(lineChannel).send(text, {
        files: [stickerUrl]// Or replace with FileOptions object
      });

    //   embed: {
    //    image: {
    //      url: file.url
    //    }
    //  }

    }else if (type === "image"){

      const text = name + "が画像を送信"

      client.getMessageContent(ev.message.id)
      .then((stream) => {
        stream.on('data', (chunk) => {

          console.log(chunk);

          discordClient.channels.cache.get(lineChannel).send(text)

          discordClient.send_file(lineChannel, chunk)
      
        });

        stream.on('error', (err) => {

          console.log(err);
        // error handling
        });
      });

      discordClient.channels.cache.get(lineChannel).send(text)
    }else if (message.startsWith("/")){

      const text = name + "＜ " + "||" + message.replace("/", "") + "||"

      discordClient.channels.cache.get(lineChannel).send(text)

    } else {

      const atAt = message.indexOf("@");

      var text = ""

      if (atAt !== -1){
        console.log("メンション");

        for (let i = 0; i < message.length; i++){

          if(message.charAt(i) === " " && i > atAt){

            const userName = message.slice(atAt, i);
            console.log(userName);

            const targetUid = discordClient.users.cache.find(u => u.tag === userName.replace("@", "")).id;

            console.log(targetUid);

            const channel = discordClient.guilds.cache.get(guildId);

            var mention = ""

            if (channel.member(targetUid).nickname !== null){

              mention = `<@!${targetUid}>`;

            }else{

              mention = `<@${targetUid}>`;

            }

            console.log(mention);

            text = `<@${targetUid}> ${name} ＜ ${message.replace(userName, "")}`;

            console.log(message);

            break;

          }
        }
      }else{

        text = name + "＜ " + message

      }

      discordClient.channels.cache.get(lineChannel).send(text);

    }



  }

}

discordClient.on('ready', () => {
  console.log(`${discordClient.user.username} でログインしています。`)
})

discordClient.on('message', async msg => {
  const pushStarts = [">", "＞", "$", "#"]

  if (msg.content.startsWith('/neko')) {
      msg.channel.send('にゃーん(=ΦωΦ=)')

  }else if (msg.content.startsWith('/help')) {
    msg.channel.send('help?そんなものはない!')

  }else if (msg.content === 'sudo rm -rf /') {
    msg.channel.send('疲れてる?休んだ方がいいよ?')

  }else if (msg.content.startsWith('/mkdir')) {
    const path = msg.content.replace("/mkdir ", "")

    msg.channel.send(`mkdir: ディレクトリ \`${path}\` を作成できません: 許可がありません`)

  }else if (msg.content.startsWith('/ls')) {

    msg.channel.send(`etc		sbin		xarts
    Library		bin		home		tmp
    System		cores		opt		usr
    Users		dev		private		var`)

  }else if (msg.content.startsWith('/clear')) {

    msg.channel.send("何様のつもり?")

  }else if (msg.content === '/sudo clear') {

    // コマンドが送信されたチャンネルから直近100件(上限)メッセージを取得する
    const messages = await message.channel.messages.fetch({ limit: 100 })
    // ボット以外が送信したメッセージを抽出
    const filtered = messages.filter(message => message.author.bot)
    // それらのメッセージを一括削除
    message.channel.bulkDelete(filtered)

    msg.channel.send("ここのチャンネルのBOTのメッセージを全てクリアしました")

  } else if (pushStarts.includes(msg.content.charAt(0)) && msg.channel.id == lineChat && msg.content.charAt != " ") {

    console.log("ディスコードからラインにプッシュメッセージを送る")

    if (msg.member.nickname !== null){

      const sendMessage = msg.member.nickname + " " + msg.content.replace(">", "＜ ").replace("$", "＜ ").replace("#", "＜ ").replace("＞", "＜ ")

      try {
        await client.pushMessage(gid,{
          type: "text",
          text: sendMessage
        })
      }catch{

        msg.channel.send(`送信できませんでした
月の送信制限に達した可能性があります`);

      }
      

    }else{

      const sendMessage = msg.author.username + " " + msg.content.replace(">", "＜ ").replace("$", "＜ ").replace("#", "＜ ").replace("＞", "＜ ")

      try{
        await client.pushMessage(gid,{
          type: "text",
          text: sendMessage
        })
      }catch{

        msg.channel.send(`送信できませんでした
月の送信制限に達した可能性があります`);

      }


    }

  }else{
    console.log("例外");
  }
})


//トークン
const discordToken = process.env.DISCORD_TOKEN;

discordClient.login(discordToken)