// 云函数入口文件
const cloud = require('wx-server-sdk')
const axios = require('axios')
const uuid = require('uuid/v4')
const sha1 = require('sha1')
cloud.init({
  env: 'ids-mina-prod-3bdc8e'
})
const db = cloud.database()
// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { name, cardnum, identity, ids_session, appId} = event // 解析参数
  let appRecord = (await db.collection('app-authorization').where({appId}).get()).data
  if(appRecord.length !== 1){
    return appRecord
  }
  appRecord = appRecord[0]
  let { appSecret, callbackUrl } = appRecord
  let challenge = uuid()
  let string1 = `cardnum=${cardnum}&name=${name}&session=${ids_session}&challenge=${challenge}&secret=${appSecret}`
  let signature = sha1(string1)
  let attempt = 0
  while(attempt < 3){
    try{
      let res = await axios.post(callbackUrl, {cardnum, name, ids_session, identity, challenge, signature}, {timeout:5000, responseType: 'arraybuffer'})
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