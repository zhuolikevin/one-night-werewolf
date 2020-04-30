const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
exports.main = async (event, context) => {
  const { roomId, game } = event;
  const { data } = await db.collection('rooms').doc(roomId).get();
  const { roleSettings } = data;
  const { totalRoles } = roleSettings;

  // This game is calculated from frontend
  // which contains the updated roleAssignment
  const { currentRole, roleAssignment } = game;

  const { nextActionRole, inGraveyardNextRoles } = getNextActionRole(currentRole, totalRoles, roleAssignment);

  return db.collection('rooms').doc(roomId).update({
    data: {
      game: {
        roleAssignment,
        status: nextActionRole === null ? 'voting' : 'gaming',
        currentRole: nextActionRole,
        inGraveyardNextRoles,
      },
    },
  });
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