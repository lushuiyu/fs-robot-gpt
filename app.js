process.env.PORT = 9001; // 最大 token 的值
process.env.FEISHU_APP_ID = "cli_a2cc20fc66b8100d"; // 飞书的应用 ID
process.env.FEISHU_APP_SECRET = "ra7evgThdioWsIjlFKM09bezNPblRjXu"; // 飞书的应用的 Secret
process.env.FEISHU_BOTNAME = "热汗通知"; // 飞书机器人的名字
process.env.OPENAI_KEY = "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"; // OpenAI 的 Key
process.env.OPENAI_MODEL = "gpt-3.5-turbo"; // 使用的模型
process.env.OPENAI_MAX_TOKEN = 2048; // 最大 token 的值

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var log4js = require('log4js');
var indexRouter = require('./routes/index');
var gptFn = require('./public/javascripts/gpt');
var log4js_cfg = require("./log4js_cfg.json");
var testgpt = require("./public/javascripts/testGPT");

log4js.configure(log4js_cfg);

var app = express();

app.all('*', function (req, res, next) {
  // 设置请求头为允许跨域
  res.header('Access-Control-Allow-Origin', '*');
  // 设置服务器支持的所有头信息字段
  res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild, sessionToken');
  // 设置服务器支持的所有跨域请求的方法
  res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
  if (req.method.toLowerCase() == 'options') {
      res.send(200);  // 让options尝试请求快速结束
  } else {
      next();
  }
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(log4js.connectLogger(log4js.getLogger("http"), { level: 'auto' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.post('/gpt', async (req, res, next) => {
  const data = await gptFn(req.body, { trigger: "" });
  res.send(data);
});
app.post('/test', async (req, res, next) => {
  res.send({code: 0, msg: req.body});
});
app.post('/testgpt', async (req, res) => { 
  const data = await testgpt(req.body);
  res.send(data);
});
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
