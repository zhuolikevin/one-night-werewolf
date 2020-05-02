const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
exports.main = async (event, context) => {
  const { roomId, seatNumber, selectedPlayer } = event;

  const { data } = await db.collection('rooms').doc(roomId).get();
  const { game } = data;
  const { totalPlayer, roleAssignment, results } = game;
  const { playerResults, graveyardResults } = results;

  if (selectedPlayer != -1) {
    // 投票给了场上玩家
    playerResults[selectedPlayer].push(seatNumber);
  } else {
    // 投票给了墓地
    graveyardResults.push(seatNumber);
  }

  // 计算通过票玩家总数
  var totalVotedPlayers = 0;
  for (const idx in playerResults) {
    const p = playerResults[idx];
    totalVotedPlayers += p.length;
  }
  totalVotedPlayers += graveyardResults.length;

  const winner = totalPlayer === totalVotedPlayers ? calculateWinner(playerResults, graveyardResults, roleAssignment) : null;

  return db.collection('rooms').doc(roomId).update({
    data: {
      game: {
        ...game,
        roleAssignment,
        status: totalPlayer === totalVotedPlayers ? 'result' : 'voting',
        currentRole: null,
        currentRoleCount: 0,
        currentRoleActionedCount: 0,
        inGraveyardNextActionRole: { role: null, pendingTime: 0 },
        results: {
          playerResults,
          graveyardResults,
          winner
        }
      },
    },
  });
}

function calculateWinner(playerResults, graveyardResults, roleAssignment) {
  const { playerRoles } = roleAssignment;
  const currentPlayerRoles = playerRoles.map(role => role.current);
  const wolves = ["wereWolf", "alphaWolf", "mysticWolf"];

  // 被投最多票的场上玩家index，可能有多个
  var playerBeingVotedMaxCountIdx = [0];
  var playerBeingVotedMaxCount = playerResults[0].length;
  for (var i = 0; i < playerResults.length; i++) {
    const voteCount = playerResults[i].length;
    if (voteCount > playerBeingVotedMaxCount) {
      playerBeingVotedMaxCountIdx = [i];
      playerBeingVotedMaxCount = voteCount;
    } else if (voteCount === playerBeingVotedMaxCount) {
      playerBeingVotedMaxCountIdx.push(i);
    }
  }
  const graveyardBeingVotedCount = graveyardResults.length;

  if (graveyardBeingVotedCount >= playerBeingVotedMaxCount) {
    // 投墓地的最多。如果投墓地的和投场上某个玩家的一样多，视为投墓地
    for (const idx in currentPlayerRoles) {
      const r = currentPlayerRoles[idx];
      // 只要场上现在有狼，狼人阵营就获胜
      if (wolves.includes(r)) {
        return "狼人阵营";
      }
    }
    // 场上没有狼，好人阵营获胜
    return "好人阵营";
  } else {
    // 投场上某个玩家的最多
    const beingVotedPlayerRoles = playerBeingVotedMaxCountIdx.map(idx => playerRoles[idx].current)

    if (beingVotedPlayerRoles.length === 1) {
      // 没有平票
      return wolves.includes(beingVotedPlayerRoles[0]) ? "好人阵营" : "狼人阵营";
    }

    // 平票, 只要有一个被投的人不是狼，就是狼人赢
    for (const idx in beingVotedPlayerRoles) {
      const r = beingVotedPlayerRoles[idx];
      if (!wolves.includes(r)) {
        return "狼人阵营";
      }
    }
    return "好人阵营";
  }
}