// pages/room/waiting.js

const app = getApp();
const { $Message } = require('../../dist/base/index');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    me: "",
    mySeat: null,
    room: {},
    seats: [],
    start: false,
    enableStart: false,
    isReady: false,
    role: "role",
    currentRole: "currentRole",
    selectedPlayers: [],
    selectedGraveyard: [],
    currentStep: "",
    seatToPlayersName: [],
    // 女巫
    round: 0,
    lastSelected: null,
  },
  

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

    // For test
    // options.roomId = "19762d645eaa162c001f935166207880"
    // app.globalData.openid = "oVLcd5DjZZWv_ddtT6ClkYz9S4H0"

    this.setData({
      me: app.globalData.openid
    });

    const _this = this;
    const db = wx.cloud.database();

    db.collection('rooms').doc(options.roomId).get({
      success: res => {
        const room = res.data;
        _this.setData({room: room});
        this.calculateSeats(room.players, room.totalPlayer);
      }
    });

    // watch current room change (e.g other players readiness)
    const watcher = db.collection('rooms').doc(options.roomId).watch({
      onChange: function(snapshot) {

        console.log(snapshot)

        if (snapshot.docs.length == 0) {
          return
        }

        // 游戏还没开始
        if (!_this.data.start) {

          // （所有人）监听新玩家加入
          if (!snapshot.docs[0].game.startGame) {
            _this.calculateSeats(snapshot.docs[0].players, snapshot.docs[0].totalPlayer);
          }
        
          // （房主）监听准备人数
          if (app.globalData.openid == _this.data.room._openid) {
            var players = snapshot.docs[0].players
            var readyCount = 0
            for (var i = 0; i < players.length; i++) {
              if (players[i].isReady) {
                readyCount++;
              }
            }
            if (readyCount == _this.data.room.totalPlayer) {
              _this.setData({
                enableStart: true
              });
            } else {
              _this.setData({
                enableStart: false
              });
            }
          }

          // （所有人）监听开始游戏
          if (snapshot.docs[0].game.startGame)        
          {
            _this.setData({
              start: true,
              role: newGame.roleAssignment.playerRoles[_this.data.mySeat].init,
              currentRole: snapshot.docs[0].game.currentRole,
            });
          }
        // 游戏已经开始
        } else {

          var currentGame = snapshot.docs[0].game
          _this.setData({
            currentRole: currentGame.currentRole
          });

          // （所有人）监听游戏中的其余角色
          if (currentGame.currentRole != _this.data.role) {
            // 狼人阶段头狼和狼预言家也要睁眼
            if (currentGame.currentRole == "wereWolf") {
              if (_this.data.role == "alphaWolf" || _this.data.role == "mysticWolf") {
                _this.setHint(currentGame)
              }
            }
          }

          // （所有人）监听游戏中自己角色
          if (currentGame.currentRole == _this.data.role) {
            _this.setHint(currentGame)
          }
        }

        // 更新room数据
        _this.setData({
          room: snapshot.docs[0],
        });

      },
      onError: function(err) {
        console.error('the watch closed because of error', err)
      }
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  },

  /**
   * 警告
   */
  handleAlert: function (content, type) {
    $Message({
      content: content,
      type: type
    });
  },

  /**
   * 准备
   */
  onSetReady: function() {
    console.log("Now ready");
    wx.cloud.callFunction({
      name: 'setReady',
      data: { roomId: this.data.room._id },
      success: res => {
        console.log(res);
        this.setData({
          isReady: true
        });
      }
    });
  },

  /**
   * 开始游戏
   */
  onStart: function() {
    console.log("Now start");
    wx.cloud.callFunction({
      name: 'startGame',
      data: { roomId: this.data.room._id },
      success: res => {
        console.log(res);
      }
    });
  },

  /**
   * 操作提示
   */
  setHint: function(game) {

    var players = game.roleAssignment.playerRoles

    switch (game.currentRole) {
      case "wereWolf": {
        var wolf = ""
        for (var i = 0; i < players.length; i++) {
          if (i != this.data.mySeat && (players[i].init == "wereWolf" || players[i].init == "alphaWolf" || players[i].init == "mysticWolf")) {
            wolf += i + "号 "
          }
        }
        this.updateStep("你的狼同伴是: " + wolf)
      }
      case "minion": {
        var wolf = ""
        for (var i = 0; i < players.length; i++) {
          if (players[i].init == "wereWolf" || players[i].init == "alphaWolf" || players[i].init == "mysticWolf") {
            wolf += i + "号 "
          }
        }
        this.updateStep("狼人是: " + wolf)
      }
      case " alphaWolf": {
        this.updateStep("请选择一名玩家将他变成狼人")
      }
      case "mysticWolf" || "seer": {
        this.updateStep("请选择一名玩家查看它的身份")
      }
      case "apprenticeSeer": {
        this.updateStep("请选择查看一张底牌")
      }
      case "witch": {
        this.updateStep("请选择查看一张底牌并和任意一名玩家的卡牌交换")
      }
      case "revealer": {
        this.updateStep("请翻开任意一名玩家的卡牌")
      }
      case "robber": {
        this.updateStep("请选择查看任意一名玩家的卡牌并盗用他的身份")
      }
      case "troublemaker": {
        this.updateStep("请选择任意两名玩家的卡牌并交换")
      }
      case "insomniac": {
        this.updateStep("你的身份是: " + players[this.data.mySeat].currentRole)
      }
      case "drunk": {
        this.updateStep("请选择一张底牌并盗用此身份")
      }
      case "mason": {
        var mason = ""
        for (var i = 0; i < players.length; i++) {
          if (players[i].init == "mason") {
            mason += i + "号 "
          }
        }
        this.updateStep("守夜人是: " + mason)
      }
    }
  },

  updateStep: function(step) {
    this.setData({
      currentStep: step
    });
  },

  /**
   * 操作卡牌
   */
  onSelect: function(e) {

    var selectedPlayers = this.data.selectedPlayers
    var selectedGraveyard = this.data.selectedGraveyard
    var index = e.currentTarget.dataset.index

    if (index >= this.data.room.totalPlayer) {
      return
    }
    if (index >= 0) {
      selectedPlayers[e.currentTarget.dataset.index] = !selectedPlayers[e.currentTarget.dataset.index]
    } else {
      selectedGraveyard[-1 * e.currentTarget.dataset.index - 1] = !selectedGraveyard[-1 * e.currentTarget.dataset.index - 1]
    }

    this.setData({
      selectedPlayers: selectedPlayers,
      selectedGraveyard: selectedGraveyard
    });
  },

  /**
   * 确定操作
   */
  onAction: function() {
    
    var game = this.data.room.game

    var selectedPlayers = []
    var selectedGraveyard = []
    for (var i = 0; i < this.data.selectedPlayers; i++) {
      if (this.data.selectedPlayers[i]) {
        selectedPlayers.push(i)
      }
    }
    for (var i = 0; i < 3; i++) {
      if (this.data.selectedGraveyard[i]) {
        selectedGraveyard.push(i)
      }
    }

    switch(this.data.role) {

      // 狼人 || 爪牙 || 失眠者 || 守夜人
      // 夜晚除了看牌外无(选牌)操作
      case ("wereWolf" || "minion" || "insomniac" || "mason"): {
        if (selectedPlayers.length > 0 || selectedGraveyard.length > 0) {
          this.handleAlert("请不要选择玩家或者底牌哦", 'warning')
        }
      }
      // 头狼
      // 指定一名玩家成为狼人
      case "alphaWolf": {
        if (selectedPlayers.length != 1 || selectedGraveyard.length > 0) {
          this.handleAlert("请（只）选择一名玩家哦", 'warning')
        } else {
          game.roleAssignment.playerRoles[selectedPlayers[0]].currentRole = "wereWolf"
        }
      }
      // 预言家 || 狼预言家
      // 查看场上一名玩家身份
      case "mysticWolf" || "seer": {
        if (selectedPlayers.length != 1 || selectedGraveyard.length > 0) {
          this.handleAlert("请（只）选择一名玩家哦", 'warning')
        } else {
          this.updateStep("这名玩家的身份是: " + game.roleAssignment.playerRoles[selectedPlayers[0]].currentRole)
        }
      }
      // 学徒预言家
      // 查看一张底牌
      case "apprenticeSeer": {
        if (selectedPlayers.length > 0 || selectedGraveyard.length != 1) {
          this.handleAlert("请（只）选择一张底牌哦", 'warning')
        } else {
          this.updateStep("这张底牌的身份是: " + game.roleAssignment.graveyardRoles[selectedGraveyard[0]].currentRole)
        }
      }
      // 女巫
      // Round0: 查看一张底牌 & Round1: 将这张牌与任意一名玩家的卡牌交换
      case "witch": {
        if (this.data.round == 0) {
          if (selectedPlayers.length > 0 || selectedGraveyard.length != 1) {
            this.handleAlert("请（只）选择一张底牌哦", 'warning')
          } else {
            this.updateStep("这张底牌的身份是: " + game.roleAssignment.graveyardRoles[selectedGraveyard[0]].currentRole + ", 再选择一名玩家把这个身份给他吧")
          }
        }
        if (this.data.round == 1) {
          if (selectedPlayers.length != 1 || selectedGraveyard.length > 0) {
            this.handleAlert("请（只）选择一名玩家哦", 'warning')
          } else {
            var playerRole = game.roleAssignment.playerRoles[selectedPlayers[0]].currentRole
            game.roleAssignment.playerRoles[selected[0]].currentRole = game.roleAssignment.graveyardRoles[lastSelected].currentRole
            game.roleAssignment.graveyardRoles[lastSelected].currentRole = playerRole
          }
        }
        this.setData({
          round: this.setData.round + 1
        });
      }
      // 揭示者
      case "revealer": {
        if (selectedPlayers.length != 1 || selectedGraveyard.length > 0) {
          this.handleAlert("请（只）选择一名玩家哦", 'warning')
        } else {
          this.updateStep("这名玩家的身份是: " + game.roleAssignment.playerRoles[selectedPlayers[0]].currentRole)
          // TODO: 数据库里说明翻牌座位号和角色
        }
      }
      // 强盗
      // 查看场上一名玩家身份并将自己的卡牌与他交换
      case "robber": {
        if (selectedPlayers.length != 1 || selectedGraveyard.length > 0) {
          this.handleAlert("请（只）选择一名玩家哦", 'warning')
        } else {
          this.updateStep("这名玩家(你现在)的身份是: " + game.roleAssignment.playerRoles[selectedPlayers[0]].currentRole)
          var playerRole = game.roleAssignment.playerRoles[selectedPlayers[0]].currentRole
          game.roleAssignment.playerRoles[selectedPlayers[0]].currentRole = game.roleAssignment.playerRoles[this.data.mySeat].currentRole
          game.roleAssignment.playerRoles[this.data.mySeat].currentRole = playerRole
        }
      }
      // 捣蛋鬼
      // 交换任意两名玩家的卡牌
      case "troublemaker": {
        if (selectedPlayers.length != 2 || selectedGraveyard.length > 0) {
          this.handleAlert("请（只）选择二名玩家哦", 'warning')
        } else {
          var playerRole = game.roleAssignment.playerRoles[selectedPlayers[0]].currentRole
          game.roleAssignment.playerRoles[selectedPlayers[0]].currentRole = game.players[selectedPlayers[1]].currentRole
          game.roleAssignment.playerRoles[selectedPlayers[1]].currentRole = playerRole
        }
      }
      // 酒鬼
      // 将自己的卡牌和底牌中的一张交换
      case "drunk": {
        if (selectedPlayers.length > 0 || selectedGraveyard.length != 1) {
          this.handleAlert("请（只）选择一张底牌", 'warning')
        } else {
          var bottomRole = game.roleAssignment.graveyardRoles[selectedGraveyard[0]].currentRole
          game.roleAssignment.graveyardRoles[selectedGraveyard[0]].currentRole = game.roleAssignment.playerRoles[this.data.mySeat].currentRole
          game.roleAssignment.playerRoles[this.data.mySeat].currentRole = bottomRole
        }
      }
    }

    // TODO: update game in database
    console.log(game)
  },

  /**
   * 分配座位
   */
  calculateSeats: function(players, totalPlayers) {

    var rows = Math.ceil(totalPlayers / 3);

    var seats = new Array(rows);  
    for (var i = 0; i < seats.length; i++) {
      seats[i] = new Array(3);    
    }

    console.log(seats)

    for (var i = 0; i < players.length; i++) {
      var seatNumber = players[i].seatNumber 
      console.log(seatNumber)
      if (players[i].openId == this.data.me) {
        this.setData({
          mySeat: players[i].seatNumber 
        });
      }
      seats[Math.floor(seatNumber / 3)][seatNumber % 3] = players[i]
    }

    console.log(seats)

    this.setData({
      seats: seats,
    });

    var selectedPlayers = []
    for (var i = 0; i < totalPlayers; i++) {
      selectedPlayers[i] = false
    }

    var selectedGraveyard = []
    for (var i = 0; i < 3; i++) {
      selectedGraveyard[i] = false
    }

    this.setData({
      selectedPlayers: selectedPlayers,
      selectedGraveyard: selectedGraveyard
    });

  }
})