const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
exports.main = async (event, context) => {
  const { userInfo, roomId } = event;
  const { openId } = userInfo;

  const { data: playersResult } = await db.collection('rooms').doc(roomId).field({
    players: true
  }).get();
  const { players } = playersResult;

  const foundIndex = players.findIndex(player => player.openId === openId);
  players[foundIndex] = {
    ...players[foundIndex],
    isReady: true,
  };

  return db.collection('rooms').doc(roomId)
    .update({
      data: {
        players,
      },
    });
}