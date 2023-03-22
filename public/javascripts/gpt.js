// 如果你不想配置环境变量，或环境变量不生效，则可以把结果填写在每一行最后的 "" 内部
const FEISHU_APP_ID = process.env.FEISHU_APP_ID // 飞书的应用 ID
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET; // 飞书的应用的 Secret
const FEISHU_BOTNAME = process.env.FEISHU_BOTNAME; // 飞书机器人的名字
const OPENAI_KEY = process.env.OPENAI_KEY; // OpenAI 的 Key
const OPENAI_MODEL = process.env.OPENAI_MODEL; // 使用的模型
const OPENAI_MAX_TOKEN = process.env.OPENAI_MAX_TOKEN; // 最大 token 的值
// @version 0.0.6 新增 429 限频场景下的兼容
const log4js = require('log4js');
const lark = require("@larksuiteoapi/node-sdk");
const { Configuration, OpenAIApi } = require("openai");
const { createClient } = require('redis');

const Redisclient = createClient({
	socket: {
		host: "pro-rehan.gudufr.ng.0001.usw2.cache.amazonaws.com",
		port: 6379,
		database: 1,
	}
});
Redisclient.on('error', err => console.log('Redis Client Error', err));

// 日志辅助函数，请贡献者使用此函数打印关键日志
const logger = log4js.getLogger();
// 飞书
const client = new lark.Client({
  appId: FEISHU_APP_ID,
  appSecret: FEISHU_APP_SECRET,
  disableTokenCache: false,
});
// OpenAI-config
const configuration = new Configuration({
  apiKey: OPENAI_KEY,
});
// OpenAI
const openai = new OpenAIApi(configuration);

// 回复消息
async function reply(messageId, content) {
  try{
    return await client.im.message.reply({
    path: {
      message_id: messageId,
    },
    data: {
      content: JSON.stringify({
        text: content,
      }),
      msg_type: "text",
    },
  });
  } catch(e){
    logger("send message to feishu error",e,messageId,content);
  }
}

// 根据中英文设置不同的 prompt
function getPrompt(content) {
  if (content.length === 0) {
    return "";
  }
  if (
    (content[0] >= "a" && content[0] <= "z") ||
    (content[0] >= "A" && content[0] <= "Z")
  ) {
    return (
      "You are ChatGPT, a LLM model trained by OpenAI. \nplease answer my following question\nQ: " +
      content +
      "\nA: "
    );
  }

  return (
    "你是 ChatGPT, 一个由 OpenAI 训练的大型语言模型, 你旨在回答并解决人们的任何问题，并且可以使用多种语言与人交流。\n请回答我下面的问题\nQ: " +
    content +
    "\nA: "
  );
}

// 通过 OpenAI API 获取回复
async function getOpenAIReply(content) {

  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{role: "user", content: content}],
  });
  // 去除多余的换行
  return completion.data.choices[0].message.content;


}

// 自检函数
async function doctor() {
  if (FEISHU_APP_ID === "") {
    return {
      code: 1,
      message: {
        zh_CN: "你没有配置飞书应用的 AppID，请检查 & 部署后重试",
        en_US:
          "Here is no FeiSHu APP id, please check & re-Deploy & call again",
      },
    };
  }
  if (!FEISHU_APP_ID.startsWith("cli_")) {
    return {
      code: 1,
      message: {
        zh_CN:
          "你配置的飞书应用的 AppID 是错误的，请检查后重试。飞书应用的 APPID 以 cli_ 开头。",
        en_US:
          "Your FeiShu App ID is Wrong, Please Check and call again. FeiShu APPID must Start with cli",
      },
    };
  }
  if (FEISHU_APP_SECRET === "") {
    return {
      code: 1,
      message: {
        zh_CN: "你没有配置飞书应用的 Secret，请检查 & 部署后重试",
        en_US:
          "Here is no FeiSHu APP Secret, please check & re-Deploy & call again",
      },
    };
  }

  if (FEISHU_BOTNAME === "") {
    return {
      code: 1,
      message: {
        zh_CN: "你没有配置飞书应用的名称，请检查 & 部署后重试",
        en_US:
          "Here is no FeiSHu APP Name, please check & re-Deploy & call again",
      },
    };
  }

  if (OPENAI_KEY === "") {
    return {
      code: 1,
      message: {
        zh_CN: "你没有配置 OpenAI 的 Key，请检查 & 部署后重试",
        en_US: "Here is no OpenAI Key, please check & re-Deploy & call again",
      },
    };
  }

  if (!OPENAI_KEY.startsWith("sk-")) {
    return {
      code: 1,
      message: {
        zh_CN:
          "你配置的 OpenAI Key 是错误的，请检查后重试。飞书应用的 APPID 以 cli_ 开头。",
        en_US:
          "Your OpenAI Key is Wrong, Please Check and call again. FeiShu APPID must Start with cli",
      },
    };
  }
  return {
    code: 0,
    message: {
      zh_CN:
      "✅ 配置成功，接下来你可以在飞书应用当中使用机器人来完成你的工作。",
      en_US:
      "✅ Configuration is correct, you can use this bot in your FeiShu App",

    },
    meta: {
      FEISHU_APP_ID,
      OPENAI_MODEL,
      OPENAI_MAX_TOKEN,
      FEISHU_BOTNAME,
    },
  };
}

module.exports = async function (params, context) {
  // logger(params)
  // 如果存在 encrypt 则说明配置了 encrypt key
  if (params.encrypt) {
    logger("user enable encrypt key");
    return {
      code: 1,
      message: {
        zh_CN: "你配置了 Encrypt Key，请关闭该功能。",
        en_US: "You have open Encrypt Key Feature, please close it.",
      },
    };
  }
  // 处理飞书开放平台的服务端校验
  if (params.type === "url_verification") {
    logger("deal url_verification");
    return {
      challenge: params.challenge,
    };
  }
  // 自检查逻辑
  if (!params.hasOwnProperty("header") || context.trigger === "DEBUG") {
    logger("enter doctor");
    return await doctor();
  }
  // 处理飞书开放平台的事件回调
  if ((params.header.event_type === "im.message.receive_v1")) {
    let eventId = params.header.event_id;
    let messageId = params.event.message.message_id;
    // 链接数据库
    await Redisclient.connect();
    // 对于同一个事件，只处理一次
	const hasEvent = await Redisclient.get(eventId);
    if (hasEvent) {
      logger("deal repeat event");
      return { code: 1 };
    }
    await Redisclient.set(eventId, 1);
    // 结束链接
    await Redisclient.disconnect();
    // 私聊直接回复
    if (params.event.message.chat_type === "p2p") {
      // 不是文本消息，不处理
      if (params.event.message.message_type != "text") {
        await reply(messageId, "暂不支持其他类型的提问");
        logger("skip and reply not support");
        return { code: 0 };
      }

      // 是文本消息，直接回复
      const userInput = JSON.parse(params.event.message.content);
      // logger(userInput);
      const question = userInput.text.replace("@_user_1", "");
      const openaiResponse = await getOpenAIReply(question);
      // logger(openaiResponse);
      await reply(messageId, openaiResponse);

      return { code: 0 };
    }

    // 群聊，需要 @ 机器人
    if (params.event.message.chat_type === "group") {
      // 这是日常群沟通，不用管
      if (
        !params.event.message.mentions ||
        params.event.message.mentions.length === 0
      ) {
        logger("not process message without mention");
        return { code: 0 };
      }
      // 没有 mention 机器人，则退出。
      if (params.event.message.mentions[0].name != FEISHU_BOTNAME) {
        logger("bot name not equal first mention name ");
        return { code: 0 };
      }
      const userInput = JSON.parse(params.event.message.content);
      logger(userInput);
      const question = userInput.text.replace("@_user_1", "");
      const openaiResponse = await getOpenAIReply(question);
      // logger(openaiResponse);
      await reply(messageId, openaiResponse);
      return { code: 0,message: openaiResponse};
    }
  }

  logger("return without other log");
  return {
    code: 2,
  };
};