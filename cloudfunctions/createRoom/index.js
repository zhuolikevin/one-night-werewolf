const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
exports.main = async (event, context) => {
  const {
    totalPlayer: totalPlayerString,
    totalRoles,
    richUserInfo,
    userInfo
  } = event;

  console.log("[INPUT PARAMS] :", event);

  const { openId } = userInfo;
  const totalPlayer = parseInt(totalPlayerString);
  const roomNumber = generateRoomNumber();
  const seatNumber = generateSeatNumber(totalPlayer, []);

  return db.collection('rooms').add({
    data: {
      _openid: openId,
      totalPlayer,
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
        revealer: {},
        results: {
          // 形式为 [{seatNumber: 0, selectedPlayer: 1}]，表示一个投票结果，0号位投给1号位，-1表示投给墓地
          votes: [],
          // 投过票的openId
          votedOpenIds: []
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