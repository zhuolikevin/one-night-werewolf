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
    const { result } = cloud.callFunction({
      name: 'calculateNextActionRole',
      data: {
        currentRole,
        totalRoles,
        roleAssignment: roleAssignmentAC
      }
    });
    const {
      nextActionRole,
      totalNextActionRoleCount,
      inGraveyardNextActionRole
    }  = result;

    return db.collection('rooms').doc(roomId).update({
      data: {
        game: {
          roleAssignment: roleAssignmentAC,
          status: nextActionRole === null && inGraveyardNextActionRole === null ? 'voting' : 'gaming',
          currentRole: nextActionRole,
          currentRoleCount: totalNextActionRoleCount,
          inGraveyardNextActionRole,
        },
      },
    });
  }
}
