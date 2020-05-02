const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
exports.main = async (event, context) => {
  const { roomId } = event;
  const { data } = await db.collection('rooms').doc(roomId).get();
  const { roleSettings, game, players } = data;
  const { totalRoles } = roleSettings;

  console.log("[INPUT PARAMS] :", event);

  const roleAssignment = assignRoles(totalRoles);

  const { result } = await cloud.callFunction({
    name: 'calculateNextActionRole',
    data: {
      currentRole: "START", // START是第一次计算行动玩家flag
      totalRoles,
      roleAssignment,
      players
    }
  });
  
  const {
    nextActionRole,
    waitingForActionOpenIds,
    inGraveyardNextActionRole
  }  = result;
  
  console.log("[LOG] After getNext:", result);

  return db.collection('rooms').doc(roomId).update({
    data: {
      game: {
        ...game,
        roleAssignment,
        status: 'gaming',
        currentRole: nextActionRole,
        waitingForActionOpenIds,
        inGraveyardNextActionRole,
      },
    },
  });
}

function assignRoles(totalRoles) {
  var allRoles = [];
  for (const role in totalRoles) {
    const roleCount = totalRoles[role];
    for (var i = 0; i < roleCount; i++) {
      allRoles.push(role);
    }
  }
  allRoles = shuffle(allRoles);

  var graveyardRoles = [];
  var playerRoles = [];
  for (var i = 0; i < allRoles.length; i++) {
    const roleObj = {
      init: allRoles[i],
      current: allRoles[i],
    };
    if (i < 3) {
      graveyardRoles.push(roleObj);
    } else {
      playerRoles.push(roleObj);
    }
  }

  return { graveyardRoles, playerRoles };
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
