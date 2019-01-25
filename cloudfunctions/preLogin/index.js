// 配置Axios
const axios = require('axios').default
const axiosCookieJarSupport = require('axios-cookiejar-support').default
const tough = require('tough-cookie')
axiosCookieJarSupport(axios)
const cookieJar = new tough.CookieJar();
// 依赖
const moment = require('moment')
const cheerio = require('cheerio')
// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { cardnum } = event
  let url = 'https://newids.seu.edu.cn/authserver/login?goto=http://my.seu.edu.cn/index.portal'
  let res = await axios.get(url, {
    jar: cookieJar,
    withCredentials: true
  })
  let passwordDefaultEncryptSalt = /var pwdDefaultEncryptSalt = "([A-Za-z0-9]+)";/.exec(res.data)[1]
  let $ = cheerio.load(res.data)
  let form = { username: cardnum }
  $('[tabid="01"] input[type="hidden"]').toArray().map(k => form[$(k).attr('name')] = $(k).attr('value'))
  url = `https://newids.seu.edu.cn/authserver/needCaptcha.html?username=${cardnum}&pwdEncrypt2=pwdEncryptSalt&_=${moment()}`
  res = await axios.get(url, {
    jar: cookieJar,
    withCredentials: true
  })
  let needCaptcha = res.data
  let captchaBase64 = '', cookie
  if (needCaptcha) {
    // 需要验证码就抓取验证码
    while (!captchaBase64.startsWith('/9j')) {
      let captchaUrl = `https://newids.seu.edu.cn/authserver/captcha.html?ts=${new Date().getMilliseconds()}`
      let captchaRes = await axios.get(captchaUrl, {
        jar: cookieJar,
        withCredentials: true,
        responseType: 'arraybuffer'
      })
      captchaBase64 = Buffer.from(captchaRes.data).toString('base64')
    }
  }
  cookie = JSON.stringify(cookieJar.toJSON())
  return {
    cookie,
    passwordDefaultEncryptSalt,
    form,
    needCaptcha,
    captchaBase64,
    openid: wxContext.OPENID
  }
}
