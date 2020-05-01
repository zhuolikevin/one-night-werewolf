const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
exports.main = async (event, context) => {
  const { totalPlayer, totalRoles, richUserInfo, userInfo } = event;
  const { openId } = userInfo;
  const roomNumber = generateRoomNumber();
  const seatNumber = generateSeatNumber(totalPlayer, []);

  return db.collection('rooms').add({
    data: {
      _openid: openId,
      totalPlayer: parseInt(totalPlayer),
      roomNumber,
      players: [{
        openId,
        isRoomMaster: true,
        isReady: true, // room master is auto ready
        seatNumber,
        ...richUserInfo
      }],
      roleSettings: {
        totalRoles,
      },
      game: {
        status: 'waiting',
        results: {
          playerResults: new Array(parseInt(totalPlayer)).fill([]),
          graveyardResults: [],
          winner: null
        }
      }
    }
  }).then(res => ({
      roomId: res._id,
      success: true,
      message: '创建房间成功！'
    }));
}

function generateRoomNumber() {
  return Math.floor(1000 + Math.random() * 9000);
}

function generateSeatNumber(totalPlayer, seatedNumbers) {
  const allSeatNumbers = [];
  for (var i = 0; i < totalPlayer; i++) {
    allSeatNumbers.push(i);
  }
  const candidateSeatNumbers = allSeatNumbers.filter(x => !seatedNumbers.includes(x));
  return candidateSeatNumbers[Math.floor(Math.random() * candidateSeatNumbers.length)];
}