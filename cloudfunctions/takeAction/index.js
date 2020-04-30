const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
exports.main = async (event, context) => {
  // suffix: AC -> AfterChange, BC -> BeforeChange
  const { roomId, game: gameAC } = event;
  const { data } = await db.collection('rooms').doc(roomId).get();
  const { roleSettings, game: gameBC } = data;
  const { totalRoles } = roleSettings;

  const {
    currentRole,
    currentRoleCount: currentRoleCountBC,
    currentRoleActionedCount: currentRoleActionedCountBC,
    inGraveyardNextRoles: inGraveyardNextRolesBC,
  } = gameBC;
  const {
    roleAssignment: roleAssignmentAC,
  } = gameAC;
  if (currentRoleActionedCountBC + 1 < currentRoleCountBC) {
    // 所有该角色没有全部take action
    return db.collection('rooms').doc(roomId).update({
      data: {
        roleAssignment: roleAssignmentAC,
        status: 'gaming',
        currentRole,
        currentRoleCount: currentRoleCountBC, // 当前在场上的该角色人数（除去墓地里的）
        currentRoleActionedCount: currentRoleActionedCountBC + 1, // 该角色已经行动的人数
        inGraveyardNextRoles: inGraveyardNextRolesBC,
      },
    });
  } else {
    // 所有该角色都已经take action了
    const { nextActionRole, inGraveyardNextRoles } = getNextActionRole(currentRole, totalRoles, roleAssignmentAC);

    return db.collection('rooms').doc(roomId).update({
      data: {
        game: {
          roleAssignment,
          status: nextActionRole === null ? 'voting' : 'gaming',
          currentRole: nextActionRole,
          inGraveyardNextRoles,
        },
      },
    });
  }
}

function getNextActionRole(currentRole, totalRoles, roleAssignment) {
  const ACTION_ORDER = [
    "wereWolf",
    "mysticWolf",
    "minion",
    "mason",
    "seer",
    "apprenticeSeer",
    "robber",
    "witch",
    "troublemaker",
    "drunk",
    "insomniac",
    "revealer"
  ];
  const { graveyardRoles, playerRoles } = roleAssignment; 
  const initGraveyardRoles = graveyardRoles.map(role => role.init);
  const initPlayerRoles = playerRoles.map(role => role.init);

  const currIdx = currentRole ? ACTION_ORDER.findIndex(x => x === currentRole) : -1;

  var nextActionRole = null;
  var totalNextActionRoleCount = 0;
  var inGraveyardNextRoles = [];

  for (var i = currIdx + 1; i < ACTION_ORDER.length; i++) {
    const role = ACTION_ORDER[i];
    if (totalRoles[role] > 0) {
      if (initGraveyardRoles.includes(role) && !initPlayerRoles.includes(role)) {
        inGraveyardNextRoles.push({
          role,
          pendingTime: generateRandomActionTime(5000, 15000)
        });
        continue;
      } else {
        nextActionRole = role;
        totalNextActionRoleCount = initPlayerRoles.filter(x => x === role).length;
        break;
      }
    }
  }

  return {
    nextActionRole,
    totalNextActionRoleCount,
    inGraveyardNextRoles
  };
}

function generateRandomActionTime(min, max) {  
  return Math.floor(Math.random() * (max - min) + min); 
}