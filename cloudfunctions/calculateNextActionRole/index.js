// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

// 云函数入口函数
exports.main = async (event, context) => {
  const {
    currentRole, // 当前角色
    totalRoles, // 所有角色总数的config
    roleAssignment, // current和init场上和墓地的角色分配
    players // 玩家信息，用来计算需要接收行动结束request的数组
  } = event;
  const { graveyardRoles, playerRoles } = roleAssignment; 
  const initGraveyardRoles = graveyardRoles.map(role => role.init);
  const initPlayerRoles = playerRoles.map(role => role.init);
  // openId数组，index是座位号，不是players的index
  const playerOpenIds = getOpenIds(players);

  console.log("[INPUT PARAMS] :", event);

  if (!currentRole) {
    throw new Error(`currentRole: ${currentRole}, currentRole is required!`)
  }

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

  if (currentRole === "START") {
    // 开始游戏，第一次请求行动角色，此角色一定为狼（场上或墓地家角色）
    const wolves = ["wereWolf", "alphaWolf", "mysticWolf"];
    let wolfOpenIds = {};

    console.log("[LOG] initPlayerRoles: ", initPlayerRoles);

    for (const idx in initPlayerRoles) {
      const r = initPlayerRoles[idx];
      if (wolves.includes(r)) {
        wolfOpenIds[playerOpenIds[idx]] = false;
      }
    }

    console.log("[LOG] wolfOpenIds: ", wolfOpenIds);

    if (Object.keys(wolfOpenIds).length > 0) {
      // 有任何一种狼在场上，第一个行动角色一定是wereWolf
      return {
        nextActionRole: "wereWolf",
        waitingForActionOpenIds: wolfOpenIds,
        inGraveyardNextActionRole: {
          role: null,
          pendingTime: 0
        }
      };
    }

    // 所有狼都在墓地
    let allPlayerOpenIds = {}
    playerOpenIds.forEach(openId => {
      allPlayerOpenIds[openId] = false;
    });
    return {
      nextActionRole: null,
      // 如果下一个是墓地假角色，需要等待所有玩家返回
      waitingForActionOpenIds: allPlayerOpenIds,
      inGraveyardNextActionRole: {
        role: "wereWolf",
        pendingTime: generateRandomActionTime(5000, 10000)
      }
    };
  }

  // 第二次及以后请求角色
  const currIdx = ACTION_ORDER.findIndex(x => x === currentRole);

  var nextActionRole = null;
  var waitingForActionOpenIds = {};
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
          pendingTime: generateRandomActionTime(5000, 10000)
        };
        // 如果下一个是墓地假角色，需要等待所有玩家返回
        playerOpenIds.forEach(openId => {
          waitingForActionOpenIds[openId] = false;
        });
      } else {
        nextActionRole = role;

        for (const idx in initPlayerRoles) {
          const r = initPlayerRoles[idx];
          if (r === nextActionRole) {
            waitingForActionOpenIds[playerOpenIds[idx]] = false;
          }
        }
      }
      break;
    }
  }

  console.log("[LOG] nextActionRole: ", nextActionRole);

  return {
    nextActionRole,
    waitingForActionOpenIds,
    inGraveyardNextActionRole
  };
}

function generateRandomActionTime(min, max) {  
  return Math.floor(Math.random() * (max - min) + min); 
}

function getOpenIds(players) {
  var openIds = new Array(players.length);
  players.forEach(player => {
    openIds[player.seatNumber] = player.openId
  });
  return openIds;
}