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

  if (gameBC.status === 'fuck') {
    return "stop!";
  }

  const {
    currentRole,
    currentRoleCount: currentRoleCountBC,
    currentRoleActionedCount: currentRoleActionedCountBC,
    inGraveyardNextActionRole: inGraveyardNextActionRoleBC,
  } = gameBC;
  const {
    roleAssignment: roleAssignmentAC,
  } = gameAC;
  if (currentRoleActionedCountBC + 1 < currentRoleCountBC) {
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
          // 当前场上行动角色（除去墓地里的）总数不变
          currentRoleCount: currentRoleCountBC, 
          // 该角色已行动人数加1
          currentRoleActionedCount: currentRoleActionedCountBC + 1,
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
        roleAssignment: roleAssignmentAC
      }
    });
    const {
      nextActionRole,
      totalNextActionRoleCount,
      inGraveyardNextActionRole
    } = result;
    console.log("[LOG] After getNext:", result);

    return db.collection('rooms').doc(roomId).update({
      data: {
        game: {
          ...gameBC,
          // 更新角色分配
          roleAssignment: roleAssignmentAC,
          // 只有当行动角色和墓地假行动角色都没有的时候才切换到voting
          status: nextActionRole === null && inGraveyardNextActionRole.role === null ? 'voting' : 'gaming',
          // 更新当前行动角色
          currentRole: nextActionRole,
          // 更新当前角色行动总数
          currentRoleCount: totalNextActionRoleCount,
          // 更新该角色已行动人数
          currentRoleActionedCount: 0,
          // 更新墓地假行动角色
          inGraveyardNextActionRole,
        },
      },
    });
  }
}
