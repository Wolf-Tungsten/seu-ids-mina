const qs = require('querystring')
const axios = require('axios')
// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  let {cardnum, password} = event
  let res = await axios.post('https://auth.myseu.cn/newids', qs.stringify({cardnum, password}))
  res.data.openid = wxContext.OPENID
  return res.data
}