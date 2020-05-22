const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
exports.main = async (event, context) => {
  // 从前端拿到的信息
  const { roomId, seatNumber, selectedPlayer, userInfo } = event;
  const { openId: senderOpenId } = userInfo;
  // 从数据库拿到的信息
  const { data } = await db.collection('rooms').doc(roomId).get();

  // 已经投过票
  if (data.game.results.votedOpenIds.includes(senderOpenId)) {
    return {
      success: false,
      message: "您已经投过票了"
    };
  }

  // 未投过票，更新投票数据
  await db.collection('rooms').doc(roomId).update({
    data: {
      game: {
        results: {
          votes: _.push({ seatNumber, selectedPlayer }),
          votedOpenIds: _.push(senderOpenId)
        }
      }
    }
  });

  // 再读一次数据，检查是否收到了所有投票结果
  const { data: dataUpdated } = await db.collection('rooms').doc(roomId).get();
  const { game } = dataUpdated;
  const { totalPlayer } = data
  const { roleAssignment, results } = game;
  const { votes, votedOpenIds } = results;

  // 还没有收到所有投票
  if (votes.length < totalPlayer || votedOpenIds.length < totalPlayer) {
    return {
      success: true,
      message: "投票成功"
    };
  }

  // 所有玩家都投过票了，计算投票结果和赢家
  let playerResults = new Array();
  for (let i = 0; i < totalPlayer; i++) {
    playerResults[i] = new Array();
  }
  let graveyardResults = [];
  votes.forEach(({ seatNumber, selectedPlayer }) => {
    if (selectedPlayer == -1) {
      graveyardResults.push(seatNumber);
    } else {
      playerResults[selectedPlayer].push(seatNumber);
    }
  });
  const winner = calculateWinner(playerResults, graveyardResults, roleAssignment);

  return db.collection('rooms').doc(roomId).update({
    data: {
      game: {
        status: 'results',
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
      if (beingVotedPlayerRoles[0] === 'tanner') {
        return "皮匠";
      }
      return wolves.includes(beingVotedPlayerRoles[0]) ? "好人阵营" : "狼人阵营";
    }

    // 平票, 只要有皮匠，就是皮匠赢；否则，只要有一个被投的人不是狼，就是狼人赢
    for (const idx in beingVotedPlayerRoles) {
      const r = beingVotedPlayerRoles[idx];
      if (r === 'tanner') {
        return "皮匠";
      }
      if (!wolves.includes(r)) {
        return "狼人阵营";
      }
    }
    return "好人阵营";
  }
}