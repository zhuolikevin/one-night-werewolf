// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {

  const { roomId } = event;

  const room = await db.collection('rooms').aggregate()
    .match({
      "_id": roomId
    })
    .end()
    .then(res => res.list[0])

  const playerList = await db.collection('rooms').aggregate()
    .match({
      "_id": roomId
    })
    .project({
      players: 1,
    })
    .lookup({
      from: 'players',
      localField: 'players.openId',
      foreignField: 'openId',
      as: 'players2',
    })
    .end()
    .then(res => res.list[0])

  var playersReturn = []
  const sortedRoomConfigPlayers = playerList.players.sort((a, b) => a.openId - b.openId);
  const sortedPlayerInfoPlayers = playerList.players2.sort((a, b) => a.openId - b.openId);

  for (var i = 0; i < sortedRoomConfigPlayers.length; i++) {
    playersReturn.push({
      ...sortedRoomConfigPlayers[i],
      ...sortedPlayerInfoPlayers[i],
    });
  }

  return {
    room,
    playersReturn,
  }

}