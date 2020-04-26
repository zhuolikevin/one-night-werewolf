// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  // API 调用都保持和云函数当前所在环境一致
  env: cloud.DYNAMIC_CURRENT_ENV
});
const db = cloud.database();
// 云函数入口函数
exports.main = async (event, context) => {
  const { openId, avatarUrl, nickName } = event.userInfo;
  console.log("event: ", event);
  console.log("context: ", context);

  const players = await db.collection('players').where({ openId }).get();

  console.log("players: ", players);

  if (players.length === 0) {
    return db.collection('players').add({
      data: { openId, avatarUrl, nickName }
    });
  } else {
    return new Promise((resolve, reject) => {
      resolve(players);
    })
  }
}