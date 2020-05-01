// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

// 云函数入口函数
exports.main = async (event, context) => {
  const { currentRole, totalRoles, roleAssignment } = event;

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
  var inGraveyardNextActionRole = {
    role: null,
    pendingTime: 0
  };

  for (var i = currIdx + 1; i < ACTION_ORDER.length; i++) {
    const role = ACTION_ORDER[i];
    if (totalRoles[role] > 0) {
      if (initGraveyardRoles.includes(role) && !initPlayerRoles.includes(role)) {
        inGraveyardNextActionRole = {
          role,
          pendingTime: generateRandomActionTime(5000, 15000)
        };
      } else {
        nextActionRole = role;
        totalNextActionRoleCount = initPlayerRoles.filter(x => x === role).length;
      }
      break;
    }
  }

  return {
    nextActionRole,
    totalNextActionRoleCount,
    inGraveyardNextActionRole
  };
}

function generateRandomActionTime(min, max) {  
  return Math.floor(Math.random() * (max - min) + min); 
}