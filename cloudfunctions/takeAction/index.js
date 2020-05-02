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
  } = gameAC;

  console.log("[INPUT PARAMS] :", event);

  // 如果收到的请求不是currentRole或者该openId不在等待回复的list里
  if (!isCorrectActionPlayer(currentRole, senderRole, waitingForActionOpenIdsBC, senderOpenId)) {
    return {
      success: false,
      message: "不是你行动的时间"
    };
  }

  // 收到的请求是desiredRole，且还没接收到过这个openId
  let newWaitingForActionOpenIds = [];
  waitingForActionOpenIdsBC.forEach(waitingOpenId => {
    if (waitingOpenId != senderOpenId) {
      newWaitingForActionOpenIds.push(waitingOpenId);
    }
  });

  if (newWaitingForActionOpenIds.length > 0) {
    // 所有该角色没有全部take action
    return db.collection('rooms').doc(roomId).update({
      data: {
        game: {
          ...gameBC,
          // 更新角色分配
          roleAssignment: roleAssignmentAC,
          // 继续游戏状态
          status: 'gaming',
          // 当前行动角色不变
          currentRole,
          // 更新等待回复的角色list
          waitingForActionOpenIds: newWaitingForActionOpenIds,
          // 墓地假行动角色不变
          inGraveyardNextActionRole: inGraveyardNextActionRoleBC,
        }
      },
    });
  } else {
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
          ...gameBC,
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
}

function isCorrectActionPlayer(
  currentRole,
  senderRole,
  desiredOpenIds,
  senderOpenId
) {
  if (!desiredOpenIds.includes(senderOpenId)) {
    return false;
  }
  const wolves = ["wereWolf", "alphaWolf", "mysticWolf"];
  if (currentRole === "wereWolf") {
    // 当前行动角色是狼阵营，则sender可以是所有狼阵营
    return wolves.includes(senderRole);
  } else if (currentRole != null) {
    // 当前行动角色是场上玩家
    return desiredRole === senderRole;
  } else {
    // 当前行动角色在墓地里，接收的是前端simulate后的请求
    return true;
  }
}