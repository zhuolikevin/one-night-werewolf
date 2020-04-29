const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
exports.main = async (event, context) => {
  const { userInfo, roomId } = event;
  const { openId } = userInfo;

  console.log(event);

  const { data: playersResult } = await db.collection('rooms').doc(roomId).field({
    players: true
  }).get();
  const { players } = playersResult;

  console.log("before players: ", players);

  const foundIndex = players.findIndex(player => player.openId === openId);
  players[foundIndex] = {
    ...players[foundIndex],
    isReady: true,
  };

  console.log("after players: ", players);

  return db.collection('rooms').doc(roomId)
    .update({
      data: {
        players,
      },
    });
}