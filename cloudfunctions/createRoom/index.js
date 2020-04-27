const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
exports.main = async (event, context) => {
  const { totalPlayer, userInfo } = event;
  const { openId: roomMasterOpenId } = userInfo;
  const roomNumber = generateRoomNumber();
  const seatNumber = generateSeatNumber(totalPlayer, []);

  return db.collection('rooms').add({
    data: {
      _openid: roomMasterOpenId,
      totalPlayer,
      roomNumber,
      players: [{
        openId: roomMasterOpenId,
        isRoomMaster: true,
        isPrepared: true, // room master is auto prepared
        seatNumber,
      }],
      // TODO: add role setting from request
      roleSettings: {}
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
  const allSeatNumbers = [...Array(totalPlayer).keys()];
  const candidateSeatNumbers = allSeatNumbers.filter(x => !seatedNumbers.includes(x));
  return candidateSeatNumbers[Math.floor(Math.random() * candidateSeatNumbers.length)];
}