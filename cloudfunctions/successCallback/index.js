// 云函数入口文件
const cloud = require('wx-server-sdk')
const axios = require('axios')
cloud.init()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const {callbackUrl, name, cardnum, identity, ids_session} = event // 解析参数
  let attempt = 0
  while(attempt < 3){
    try{
      let res = await axios.post(callbackUrl, {cardnum, name, ids_session, identity}, {timeout:5000, responseType: 'arraybuffer'})
      if(res.data.toString('utf8').indexOf('success') !== -1) {
        return true // 成功返回真
      } else {
        break // 响应不包含 success 视为失败
      }
    } catch(e) {
      // 超时或出错则重试，最多重试三次
      attempt++
    }
  }
  // 重试三次后依然失败则返回假
  return false
}