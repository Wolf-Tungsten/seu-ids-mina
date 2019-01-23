// 配置Axios
const axios = require('axios').default
const axiosCookieJarSupport = require('axios-cookiejar-support').default
const tough = require('tough-cookie')
const cookieJar = new tough.CookieJar();
axiosCookieJarSupport(axios)

// 依赖
const cheerio = require('cheerio')
const moment = require('moment')
const qs = require('querystring')
// 工具函数
const encryptPassword = require('./encypt')
// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { cardnum, password } = event
  // 检查是否需要验证码
  let url = `https://newids.seu.edu.cn/authserver/needCaptcha.html?username=${cardnum}&pwdEncrypt2=pwdEncryptSalt&_=${moment()}`
  let res = await axios.get(url)
  if(res.data){
    return {
      success:false,
      reason:'出于安全性考虑，本次登录被临时限制。请使用浏览器访问并重新登录校园信息门户（my.seu.edu.cn），消除验证码后再进行尝试。'
    }
  }
  // 执行到此处说明不需要验证码
  // 开始身份认证登录
  url = 'https://newids.seu.edu.cn/authserver/login?goto=http://my.seu.edu.cn/index.portal'
  res = await axios.get(url, {
    jar: cookieJar,
    withCredentials: true
  })
  let passwordDefaultEncryptSalt = /var pwdDefaultEncryptSalt = "([A-Za-z0-9]+)";/.exec(res.data)[1]
  let $ = cheerio.load(res.data)
  let form = { username: cardnum , password: encryptPassword(password, passwordDefaultEncryptSalt)}
  $('[tabid="01"] input[type="hidden"]').toArray().map(k => form[$(k).attr('name')] = $(k).attr('value'))
  res = await axios.post(url, qs.stringify(form), {
    jar: cookieJar,
    withCredentials: true,
    maxRedirects: 0,
    validateStatus: s => s < 400
  })
  if (/您提供的用户名或者密码有误/.test(res.data) || res.status === 500) {
    return {
      success: false,
      reason: '您提供的用户名或者密码有误'
    }
  }
  // 执行到此处说明身份认证成功， 开始抓取信息
  res = await axios.get('http://my.seu.edu.cn/index.portal?.pn=p1681',{
    jar: cookieJar,
    withCredentials: true
  })
  // 解析姓名
  let name = /欢迎您：([^<]*)/.exec(res.data) || []
  name = name[1] || ''
  if(!name){
    // 没有获取到姓名，要求重试
    return {
      success: false,
      reason: '信息获取失败，请重试'
    }
  }
  // 从一卡通号解析身份
  let identity = ''
  if(cardnum.startsWith('21'))
    identity = '本科生';
  else if (cardnum.startsWith('22'))
    identity = '研究生';
  else if (cardnum.startsWith('1'))
    identity = '教职员工';

  return {
    success: true,
    identity,
    name,
    cardnum,
    openid: wxContext.OPENID
  }
}