import Binance from "binance-api-node";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import { formatMoney } from "./utils/money.js";
import fs from "fs";

// required to running in cloud
import http from "http";
import { DH_NOT_SUITABLE_GENERATOR } from "constants";
import { time } from "console";
http.createServer().listen(process.env.PORT);

dotenv.config();

const writeJSON = (filename, data) => {
  const json = JSON.stringify(data, null, 2);
  fs.writeFileSync(filename, json);
};

const readJSON = (filename, data) => {
  const json = JSON.parse(fs.readFileSync(filename));
  return json;
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// API keys can be generated here https://www.binance.com/en/my/settings/api-management
const binanceClient = Binance.default({
  apiKey: process.env.BINANCE_API_KEY,
  apiSecret: process.env.BINANCE_API_SECRET,
});

// The bot token can be obtained from BotFather https://core.telegram.org/bots#3-how-do-i-create-a-bot
const bot = new TelegramBot(process.env.TELEGRAMM_BOT_TOKEN, { polling: true });

bot.on("polling_error", console.log);

// const calls = {};

// Matches "/price [symbol]"
bot.onText(/\/price (.+)/, (msg, data) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "Wait...");

  // data[1] can be single token (i.e. "BTC") or pair ("ETH BTC")
  const [cryptoToken1, cryptoToken2 = "USDT"] = data[1].split(" ");

  binanceClient
    .avgPrice({ symbol: `${cryptoToken1}${cryptoToken2}`.toUpperCase() }) // example, { symbol: "BTCUSTD" }
    .then((avgPrice) => {
      bot.sendMessage(chatId, formatMoney(avgPrice["price"]));
    })
    .catch((error) =>
      bot.sendMessage(
        chatId,
        `Error retrieving the price for ${cryptoToken1}${cryptoToken2}: ${error}`
      )
    );
});

bot.on("message", (msg) => {
  console.log("got message...");
  const calls = readJSON("calls.json");
  console.log("read json...");
  const chatId = msg.chat.id;
  const user = msg.from.username;
  const text = msg.text;
  const date = new Date();
  const date_name =
    "" +
    date.getFullYear() +
    "/" +
    (date.getMonth() + 1) +
    "/" +
    date.getDate();

  const t_date_name =
    "" +
    date.getFullYear() +
    "/" +
    (date.getMonth() + 1) +
    "/" +
    (date.getDate() + 1);

  switch (text) {
    case "/start":
      bot.sendMessage(
        chatId,
        "Hi there! I am 🤖 Adam's Crypto Bot.To get the price of any token just send me the message `/price <TOKEN>`. For example to get the price of **BTC**: `/price BTC`",
        { parse_mode: "Markdown" }
      );
      break;

    default:
      break;
  }

  if (calls["userCalls"] === undefined) {
    calls["userCalls"] = {};
  }
  if (calls["userCalls"][date_name] === undefined) {
    calls["userCalls"][date_name] = {};
  }

  if (calls["userCalls"][t_date_name] === undefined) {
    calls["userCalls"][t_date_name] = {};
  }

  // calls["price"][date_name] = ;

  if (text.toLowerCase() === "up") {
    calls["userCalls"][t_date_name][user] = "up";
    bot.sendMessage(
      chatId,
      "Sounds good, tomorrow @" + user + " says it'll go up"
    );
  } else if (text.toLowerCase() === "down") {
    calls["userCalls"][t_date_name][user] = "down";
    bot.sendMessage(
      chatId,
      "Sounds good, tomorrow @" + user + " says it'll go down"
    );
  }
  writeJSON("calls.json", calls);
  console.log("wrote json...");
});

const gatherBadCalls = (date_name, call) => {
  const calls = readJSON("calls.json");
  const calls_for_date = calls["userCalls"][date_name];
  const bad_calls = [];
  for (let user in calls_for_date) {
    if (calls_for_date[user] != call) {
      bad_calls.push(user);
    }
  }
  return bad_calls;
};

const gatherGoodCalls = (date_name, call) => {
  const calls = readJSON("calls.json");
  const calls_for_date = calls["userCalls"][date_name];
  const good_calls = [];
  for (let user in calls_for_date) {
    if (calls_for_date[user] == call) {
      good_calls.push(user);
    }
  }
  return good_calls;
};

async function thinkAboutPrices() {
  console.log("checking date...");
  const calls = readJSON("calls.json");
  console.log("read json...");
  const date = new Date();
  const date_name =
    "" +
    date.getFullYear() +
    "/" +
    (date.getMonth() + 1) +
    "/" +
    date.getDate();

  const chatId = 29614735;

  if (calls["price"] === undefined) {
    calls["price"] = {};
  }
  // this isn't going to work at the beginning of the month but whatever
  const y_date_name =
    "" +
    date.getFullYear() +
    "/" +
    (date.getMonth() + 1) +
    "/" +
    (date.getDate() - 1);

  const timetime = date.toTimeString().substring(0, 2);

  if (calls["price"] === undefined) {
    calls["price"] = {};
  }

  if (calls["messaged"] === undefined) {
    calls["messaged"] = {};
  }

  if (calls["messaged_reminder"] === undefined) {
    calls["messaged_reminder"] = {};
  }

  if (!calls["messaged_reminder"][date_name] && timetime === "09") {
    calls["messaged_reminder"][date_name] = true;
    bot.sendMessage(chatId, "Yo yo it's that time of day, what's your call?");
  }

  if (calls["price"][date_name] === undefined) {
    const cryptoToken1 = "BTC";
    const cryptoToken2 = "USDT";
    console.log("getting price...");
    binanceClient
      .avgPrice({ symbol: `${cryptoToken1}${cryptoToken2}`.toUpperCase() }) // example, { symbol: "BTCUSTD" }
      .then((avgPrice) => {
        calls["price"][date_name] = avgPrice["price"];
        writeJSON("calls.json", calls);
        console.log("wrote json...");
        console.log("price was " + avgPrice["price"]);
        console.log("wrote json...");
      })
      .catch((error) => console.log("aahhhh"));
  }

  console.log("checking if we should send a message...");
  if (
    calls["price"][y_date_name] !== undefined &&
    calls["price"][date_name] !== undefined &&
    !calls["messaged"][date_name]
  ) {
    console.log("we should send a message...");
    if (
      parseFloat(calls["price"][y_date_name]) <
      parseFloat(calls["price"][date_name])
    ) {
      console.log("price went up");
      bot.sendMessage(
        chatId,
        "👆📈🎉 It went up! Today's price is: " +
          formatMoney(calls["price"][date_name])
      );
      const badCalls = gatherBadCalls(date_name, "up");
      const goodCalls = gatherGoodCalls(date_name, "up");
      await sleep(500);
      for (let bad_call in badCalls) {
        bot.sendMessage(
          chatId,
          "@" + badCalls[bad_call] + " called it wrong, what an idiot"
        );
      }
      for (let good_call in goodCalls) {
        bot.sendMessage(
          chatId,
          "@" + goodCalls[good_call] + " called it wrong, what a genius"
        );
      }
    } else if (
      parseFloat(calls["price"][y_date_name]) >
      parseFloat(calls["price"][date_name])
    ) {
      console.log("price went down");
      bot.sendMessage(
        chatId,
        "👇📉🙈 It went down! Today's price is " +
          formatMoney(calls["price"][date_name])
      );
      const badCalls = gatherBadCalls(date_name, "down");
      const goodCalls = gatherGoodCalls(date_name, "down");
      await sleep(500);
      for (let bad_call in badCalls) {
        bot.sendMessage(
          chatId,
          "@" + badCalls[bad_call] + " called it wrong, what an idiot"
        );
      }
      for (let good_call in goodCalls) {
        bot.sendMessage(
          chatId,
          "@" + goodCalls[good_call] + " called it wrong, what a genius"
        );
      }
    }
    calls["messaged"][date_name] = true;
    writeJSON("calls.json", calls);
  } else {
    console.log("we shouldn't send a message...");
  }
}

thinkAboutPrices();
const interval = setInterval(thinkAboutPrices, 60000 * 45); // check every 45 mins

console.log("Bot started");
