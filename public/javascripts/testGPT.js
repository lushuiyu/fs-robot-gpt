const { Configuration, OpenAIApi } = require("openai");

const OPENAI_KEY = process.env.OPENAI_KEY; // OpenAI 的 Key
const configuration = new Configuration({
  apiKey: OPENAI_KEY,
});

const openai = new OpenAIApi(configuration);

// 通过 OpenAI API 获取回复
async function getOpenAIReply(content) {
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{role: "user", content: content}],
  });
  // 去除多余的换行
  return completion.data.choices[0].message.content;
}

module.exports = async function(params, context) {
  console.log('Received params:', params);
  const res = await getOpenAIReply(params.t)
  return {
    message: res,
  };
}
