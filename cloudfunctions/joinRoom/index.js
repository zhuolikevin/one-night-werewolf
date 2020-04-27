const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
exports.main = async (event, context) => {
  const { roomNumber, userInfo } = event;
  const { openId } = userInfo;
  const { data: rooms } = await db.collection('rooms').where({ roomNumber: parseInt(roomNumber) }).get();

  if (rooms.length === 0) {
    // Cannot find room
    return {
      success: false,
      message: `找不到房间 ${roomNumber}`,
    };
  }

  const { totalPlayer, players, _id: roomId } = rooms[0];

  if (players.map(player => player.openId).includes(openId)) {
    // player already in room
    return {
      room: rooms[0],
      success: true,
      message: `您已在房间中`,
    };
  }

  if (totalPlayer === players.length) {
    // room is full
    return {
      success: false,
      message: `房间 ${roomNumber} 人数已满`,
    };
  }

  const seatedNumbers = players.map(player => player.seatNumber);
  const seatNumber = generateSeatNumber(totalPlayer, seatedNumbers);
  return db.collection('rooms').doc(roomId).update({
    data: {
      players: db.command.push({
        openId,
        isRoomMaster: false,
        isPrepared: false,
        seatNumber,
      }),
    },
  }).then(res => ({
    room: res,
    success: true,
    message: '进入房间成功',
  }));
}

function generateSeatNumber(totalPlayer, seatedNumbers) {
  const allSeatNumbers = [...Array(totalPlayer).keys()];
  const candidateSeatNumbers = allSeatNumbers.filter(x => !seatedNumbers.includes(x));
  return candidateSeatNumbers[Math.floor(Math.random() * candidateSeatNumbers.length)];
}