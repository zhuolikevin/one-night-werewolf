// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

// 云函数入口函数
exports.main = async (event, context) => {
  const { currentRole, totalRoles, roleAssignment } = event;

  const ACTION_ORDER = [
    "wereWolf",
    "alphaWolf",
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

  if (currentRole === null) {
    // 开始游戏，第一次请求行动角色，此角色一定为狼（场上或墓地家角色）
    const wolves = ["wereWolf", "alphaWolf", "mysticWolf"];
    var wolfCount = 0;
    for (const r in initPlayerRoles) {
      if (wolves.includes(r)) {
        wolfCount++;
      }
    }

    if (wolfCount > 0) {
      // 有任何一种狼在场上，第一个行动角色一定是wereWolf
      return {
        nextActionRole: "wereWolf",
        totalNextActionRoleCount: wolfCount,
        inGraveyardNextActionRole: {
          role: null,
          pendingTime: 0
        }
      };
    }

    // 所有狼都在墓地
    return {
      nextActionRole: null,
      totalNextActionRoleCount: 0,
      inGraveyardNextActionRole: {
        role: "wereWolf",
        pendingTime: generateRandomActionTime(10000, 20000)
      }
    };
  }

  // 第二次及以后请求角色
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