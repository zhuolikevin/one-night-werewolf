const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
exports.main = async (event, context) => {
  const { roomId } = event;
  const { data } = await db.collection('rooms').doc(roomId).get();
  const { roleSettings } = data;
  const { totalRoles } = roleSettings;

  const roleAssignment = assignRoles(totalRoles);
  const { nextActionRole, inGraveyardNextRoles } = getNextActionRole(null, totalRoles, roleAssignment);

  return db.collection('rooms').doc(roomId).update({
    data: {
      game: {
        roleAssignment,
        startGame: true,
        currentRole: nextActionRole,
        inGraveyardNextRoles,
      },
    },
  });
}

function assignRoles(totalRoles) {
  var allRoles = [];
  for (const role in totalRoles) {
    const roleCount = totalRoles[role];
    for (var i = 0; i < roleCount; i++) {
      allRoles.push(role);
    }
  }
  allRoles = shuffle(allRoles);

  var graveyardRoles = [];
  var playerRoles = [];
  for (var i = 0; i < allRoles.length; i++) {
    const roleObj = {
      init: allRoles[i],
      current: allRoles[i],
    };
    if (i < 3) {
      graveyardRoles.push(roleObj);
    } else {
      playerRoles.push(roleObj);
    }
  }

  return { graveyardRoles, playerRoles };
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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
  const currentGraveyardRoles = graveyardRoles.map(role => role.current);
  const currentPlayerRoles = playerRoles.map(role => role.current);

  const currIdx = currentRole ? ACTION_ORDER.findIndex(x => x === currentRole) : -1;

  var nextActionRole = null;
  var inGraveyardNextRoles = [];

  for (var i = currIdx + 1; i < ACTION_ORDER.length; i++) {
    const role = ACTION_ORDER[i];
    if (totalRoles[role] > 0) {
      if (currentGraveyardRoles.includes(role) && !currentPlayerRoles.includes(role)) {
        inGraveyardNextRoles.push({
          role,
          pendingTime: generateRandomActionTime(5000, 15000)
        });
        continue;
      } else {
        nextActionRole = role;
        break;
      }
    }
  }

  return { nextActionRole, inGraveyardNextRoles };
}

function generateRandomActionTime(min, max) {  
  return Math.floor(Math.random() * (max - min) + min); 
}