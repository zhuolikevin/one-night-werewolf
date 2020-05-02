const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
exports.main = async (event, context) => {
  /* suffix: AC -> AfterChange, BC -> BeforeChange */

  // 从前端拿到的信息
  const { roomId, game: gameAC, myRole: senderRole, userInfo } = event;
  const { openId: senderOpenId } = userInfo;
  // 从数据库拿到的信息
  const { data } = await db.collection('rooms').doc(roomId).get();
  const { roleSettings, game: gameBC, players } = data;
  const { totalRoles } = roleSettings;
  const {
    currentRole,
    waitingForActionOpenIds: waitingForActionOpenIdsBC,
    inGraveyardNextActionRole: inGraveyardNextActionRoleBC,
  } = gameBC;
  const {
    roleAssignment: roleAssignmentAC,
    revealer, // 揭示者行动的时候会有此项，需要存到数据库
  } = gameAC;

  console.log("[INPUT PARAMS] :", event);

  // 如果收到的请求不是currentRole，或者该openId不在等待回复的object里，或者在但已经操作过了
  if (!isCorrectActionPlayer(currentRole, senderRole, waitingForActionOpenIdsBC, senderOpenId)) {
    return {
      success: false,
      message: "不该你行动"
    };
  }

  // 只更新当前openId对应的行动
  let flipOpenId = {};
  flipOpenId[senderOpenId] = true;
  const updateRes = await db.collection('rooms').doc(roomId).update({
    data: {
      game: {
        roleAssignment: roleAssignmentAC,
        waitingForActionOpenIds: flipOpenId,
        revealer: revealer && { ...revealer }
      }
    },
  });

  console.log("[LOG] updateRes: ", updateRes);

  // 更改完以后再拿一次数据
  const { data: dataUpdated } = await db.collection('rooms').doc(roomId).get();
  const { game: gameUpdated } = dataUpdated;
  const { waitingForActionOpenIds: waitingForActionOpenIdsUpdated } = gameUpdated;

  for (const openId in waitingForActionOpenIdsUpdated) {
    if (!waitingForActionOpenIdsUpdated[openId]) {
      // 还有未收到的角色回复
      return {
        success: true,
        message: "操作成功"
      };
    }
  }

  // 所有该角色都已经take action了
  console.log("[LOG] Before getNext: ", {
    currentRole,
    inGraveyardNextActionRoleBC,
  });
  const { result } = await cloud.callFunction({
    name: 'calculateNextActionRole',
    data: {
      // 如果当前角色为null，就用墓地假角色算下一个行动角色
      currentRole: currentRole || inGraveyardNextActionRoleBC.role,
      totalRoles,
      roleAssignment: roleAssignmentAC,
      players
    }
  });
  const {
    nextActionRole,
    waitingForActionOpenIds,
    inGraveyardNextActionRole
  } = result;
  console.log("[LOG] After getNext:", result);

  const shouldEndGame = nextActionRole === null && inGraveyardNextActionRole.role === null;
  console.log("[LOG] After nextActionRole === null:", nextActionRole === null);
  console.log("[LOG] After inGraveyardNextActionRole.role === null:", inGraveyardNextActionRole.role === null);

  return db.collection('rooms').doc(roomId).update({
    data: {
      game: {
        // 更新角色分配
        roleAssignment: roleAssignmentAC,
        // 只有当行动角色和墓地假行动角色都没有的时候才切换到voting
        status: shouldEndGame ? 'voting' : 'gaming',
        // 更新当前行动角色
        currentRole: nextActionRole,
        // 更新等待请求的openId list
        waitingForActionOpenIds,
        // 更新墓地假行动角色
        inGraveyardNextActionRole,
      },
    },
  });
}

function isCorrectActionPlayer(
  currentRole,
  senderRole,
  desiredOpenIds,
  senderOpenId
) {
  // 当前角色不在等待列表里，或者在但已经操作过
  if (!desiredOpenIds.hasOwnProperty(senderOpenId) || desiredOpenIds[senderOpenId]) {
    return false;
  }
  const wolves = ["wereWolf", "alphaWolf", "mysticWolf"];
  if (currentRole === "wereWolf") {
    // 当前行动角色是狼阵营，则sender可以是所有狼阵营
    return wolves.includes(senderRole);
  } else if (currentRole != null) {
    // 当前行动角色是场上玩家
    return currentRole === senderRole;
  } else {
    // 当前行动角色在墓地里，接收的是前端simulate后的请求
    return true;
  }
}