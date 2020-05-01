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
    status: "waiting",
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
    // 狼人
    onlyWolf: false,
    // 结束
    results: [],
    winner: "",
  },
  

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

    // For test
    options.roomId = "5feb61565eab9320004057805c2d4eff"
    app.globalData.openid = "oVLcd5DjZZWv_ddtT6ClkYz9S4H0"
    // this.setData({
    //   status: "gaming"
    // });

    this.delay(1000)

    this.setData({
      me: app.globalData.openid
    });

    const _this = this;
    const db = wx.cloud.database();

    db.collection('rooms').doc(options.roomId).get({
      success: res => {
        _this.setData({ 
          room: res.data
        });
        this.calculateSeats(res.data.players, res.data.totalPlayer);
      }
    });

    // TODO: 退出再进入房间显示已准备

    // watch current room change (e.g other players readiness)
    const watcher = db.collection('rooms').doc(options.roomId).watch({
      onChange: function(snapshot) {

        console.log(snapshot)

        if (snapshot.docs.length == 0) {
          return
        }

        // 游戏还没开始
        if (_this.data.status == "waiting") {

          // （所有人）监听新玩家加入
          if (snapshot.docs[0].game.status == "waiting") {
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
          if (snapshot.docs[0].game.status == "gaming")        
          {
            _this.setData({
              status: "gaming",
              role: snapshot.docs[0].game.roleAssignment.playerRoles[_this.data.mySeat].init,
              currentRole: snapshot.docs[0].game.currentRole,
            });
          }
        // 游戏已经开始
        } 
        
        if (_this.data.status == "gaming") {

          var currentGame = snapshot.docs[0].game
          var currentRole = currentGame.currentRole
          if (currentRole == null) {
            currentRole = currentGame.inGraveyardNextActionRole.role;
          }

          _this.setData({
            role: currentGame.roleAssignment.playerRoles[_this.data.mySeat].init,
            currentRole: currentRole
          });

          // （所有人）监听游戏中的其余角色
          if (currentGame.currentRole != _this.data.role) {
            // 狼人阶段头狼和狼预言家也要睁眼
            _this.updateStep("")
            if (currentGame.currentRole == "wereWolf") {
              if (_this.data.role == "alphaWolf" || _this.data.role == "mysticWolf") {
                _this.setHint(currentGame)
              }
            }
            // 如果这个角色在墓地里
            if (currentGame.currentRole == null && snapshot.docs[0].game.status == "gaming") {
              _this.simulateAction(currentGame)
            }
          }

          // （所有人）监听游戏中自己角色
          if (currentGame.currentRole == _this.data.role) {
            _this.setHint(currentGame)
          }

          // 监听进入投票环节
          if (snapshot.docs[0].game.status == "voting") {
            _this.updateStep("")
            _this.setData({
              status: "voting"
            })
            // 如果有被揭示者翻开的牌
            console.log(snapshot.docs[0].game.revealer)
            if (snapshot.docs[0].game.revealer != null) {
              _this.updateStep("揭示者揭露了" + snapshot.docs[0].game.revealer.seatNumber + "号当前身份是: " + _this.convertFull(snapshot.docs[0].game.revealer.role))
            }
          }     
        }

        if (_this.data.status == "voting") {
          
          // 投票结束，显示投票结果
          if (snapshot.docs[0].game.status == "result") {
            _this.setData({
              status: "result"
            })
            _this.updateStep(snapshot.docs[0].game.winner)
            _this.showResult(snapshot.docs[0].game)
          }
        }

        // 更新room数据
        _this.setData({
          room: snapshot.docs[0],
          isReady: snapshot.docs[0].players[_this.data.mySeat].isReady
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

    var players = game.roleAssignment.playerRoles;

    switch (game.currentRole) {
      case "wereWolf": {
        var wolf = "";
        for (var i = 0; i < players.length; i++) {
          if (i != this.data.mySeat && (players[i].init == "wereWolf" || players[i].init == "alphaWolf" || players[i].init == "mysticWolf")) {
            wolf += i + "号 ";
          }
        }
        if (wolf == "") {
          this.setData({
            onlyWolf: true
          })
          this.updateStep("狼人只有你自己，你可以选择查看一张底牌");
        } else {
          this.updateStep("你的狼同伴是: " + wolf);
        }
        break;
      }
      case "minion": {
        var wolf = "";
        for (var i = 0; i < players.length; i++) {
          if (players[i].init == "wereWolf" || players[i].init == "alphaWolf" || players[i].init == "mysticWolf") {
            wolf += i + "号 ";
          }
        }
        this.updateStep("狼人是: " + wolf);
        break;
      }
      case "alphaWolf": {
        this.updateStep("请选择一名玩家将他变成狼人");
        break;
      }
      case "mysticWolf" || "seer": {
        this.updateStep("请选择一名玩家查看它的身份");
        break;
      }
      case "apprenticeSeer": {
        this.updateStep("请选择查看一张底牌");
        break;
      }
      case "witch": {
        this.updateStep("请选择查看一张底牌并和任意一名玩家的卡牌交换");
        break;
      }
      case "revealer": {
        this.updateStep("请翻开任意一名玩家的卡牌");
        break;
      }
      case "robber": {
        this.updateStep("请选择查看任意一名玩家的卡牌并盗用他的身份");
        break;
      }
      case "troublemaker": {
        this.updateStep("请选择任意两名玩家的卡牌并交换");
        break;
      }
      case "insomniac": {
        this.updateStep("你的身份是: " + players[this.data.mySeat].currentRole);
        break;
      }
      case "drunk": {
        this.updateStep("请选择一张底牌并盗用此身份");
        break;
      }
      case "mason": {
        var mason = ""
        for (var i = 0; i < players.length; i++) {
          if (i != this.data.mySeat) {
            if (players[i].init == "mason") {
              mason += i + "号 ";
            }
          }
        }
        if (mason == "") {
          this.updateStep("守夜人只有你自己");
        } else {
          this.updateStep("另外的守夜人是: " + mason);
        }
        break;
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
    for (var i = 0; i < this.data.selectedPlayers.length; i++) {
      if (this.data.selectedPlayers[i]) {
        selectedPlayers.push(i)
      }
    }
    for (var i = 0; i < 3; i++) {
      if (this.data.selectedGraveyard[i]) {
        selectedGraveyard.push(i)
      }
    }

    switch(game.currentRole) {

      // 狼人 || 爪牙 || 失眠者 || 守夜人
      // 夜晚除了看牌外无(选牌)操作
      case ("wereWolf" || "minion" || "insomniac" || "mason"): {

        // 如果是独狼可以查看一张底牌
        if (this.data.onlyWolf && (this.data.role == "wereWolf" || this.data.role == "alphaWolf" || this.data.role == "mysticWolf")) {
          // 玩家
          if (selectedPlayers.length > 0 || selectedGraveyard.length != 1) {
            this.handleAlert("请（只）选择一张底牌哦", 'warning')
            return;
          } else {
            this.updateStep("这张底牌的身份是: " + this.convertFull(game.roleAssignment.graveyardRoles[selectedGraveyard[0]].current))
          }
        } else {
          if (selectedPlayers.length > 0 || selectedGraveyard.length > 0)        {
            this.handleAlert("请不要选择玩家或者底牌哦", 'warning')
            return;
          }
        }
        break;
      }
      // 头狼
      // 指定一名玩家成为狼人
      case "alphaWolf": {
        if (selectedPlayers.length != 1 || selectedGraveyard.length > 0) {
          this.handleAlert("请（只）选择一名玩家哦", 'warning')
          return;
        } else {
          game.roleAssignment.playerRoles[selectedPlayers[0]].current = "wereWolf"
        }
        break;
      }
      // 预言家 || 狼预言家
      // 查看场上一名玩家身份
      case "mysticWolf" || "seer": {
        if (selectedPlayers.length != 1 || selectedGraveyard.length > 0) {
            this.handleAlert("请（只）选择一名玩家哦", 'warning')
          return;
          } else if (selectedPlayers[0] == this.data.mySeat) {
            this.handleAlert("请不要选择自己哦", 'warning')
          return;
          return;
          } else {
            this.updateStep("这名玩家的身份是: " + this.convertFull(game.roleAssignment.playerRoles[selectedPlayers[0]].current))
          }
        break;
      }
      // 学徒预言家
      // 查看一张底牌
      case "apprenticeSeer": {
        if (selectedPlayers.length > 0 || selectedGraveyard.length != 1) {
          this.handleAlert("请（只）选择一张底牌哦", 'warning')
          return;
        } else {
          this.updateStep("这张底牌的身份是: " + this.convertFull(game.roleAssignment.graveyardRoles[selectedGraveyard[0]].current))
        }
        break;
      }
      // 女巫
      // Round0: 查看一张底牌 & Round1: 将这张牌与任意一名玩家的卡牌交换
      case "witch": {
        if (this.data.round == 0) {
          if (selectedPlayers.length > 0 || selectedGraveyard.length != 1) {
            this.handleAlert("请（只）选择一张底牌哦", 'warning')
            return;
          } else {
            this.updateStep("这张底牌的身份是: " + this.convertFull(game.roleAssignment.graveyardRoles[selectedGraveyard[0]].current) + ", 再选择一名玩家把这个身份给他吧")
            this.setData({
              lastSelected: selectedGraveyard[0]
            });
          }
        }
        if (this.data.round == 1) {
          if (selectedPlayers.length != 1) {
            this.handleAlert("请（只）选择一名玩家哦", 'warning')
            return;
          } else {
            var playerRole = game.roleAssignment.playerRoles[selectedPlayers[0]].current
            game.roleAssignment.playerRoles[selectedPlayers[0]].current = game.roleAssignment.graveyardRoles[this.data.lastSelected].current
            game.roleAssignment.graveyardRoles[this.data.lastSelected].current = playerRole
          }
        }
        var newData = parseInt(this.data.round) + 1
        this.setData({
          round: newDataT
        });
        break;
      }
      // 揭示者
      case "revealer": {
        if (selectedPlayers.length != 1 || selectedGraveyard.length > 0) {
          this.handleAlert("请（只）选择一名玩家哦", 'warning')
          return;
        } else if (selectedPlayers[0] == this.data.mySeat) {
          this.handleAlert("请不要选择自己哦", 'warning')
          return;
        } else {
          var thisRole = game.roleAssignment.playerRoles[selectedPlayers[0]].current
          if (thisRole == "wereWolf" || thisRole == "alphaWolf" || thisRole == "mysticWolf") {
            this.updateStep(selectedPlayers[0] + "号的身份是: " + this.convertFull(thisRole) + ", 由于这名玩家是狼人，其他人将看不到他的身份")
          } else {
            this.updateStep(selectedPlayers[0] + "号的身份是: " + this.convertFull(thisRole) + ", 其他人醒来后将能够看到他的身份")
            // 数据库里说明翻牌座位号和角色
            game.revealer = {
              seatNumber: selectedPlayers[0],
              role: thisRole
            }
          }
        }
        break;
      }
      // 强盗
      // 查看场上一名玩家身份并将自己的卡牌与他交换
      case "robber": {
        if (selectedPlayers.length != 1 || selectedGraveyard.length > 0) {
          this.handleAlert("请（只）选择一名玩家哦", 'warning')
          return;
        } else {
          this.updateStep("这名玩家(你现在)的身份是: " + game.roleAssignment.playerRoles[selectedPlayers[0]].current)
          var playerRole = game.roleAssignment.playerRoles[selectedPlayers[0]].current
          game.roleAssignment.playerRoles[selectedPlayers[0]].current = game.roleAssignment.playerRoles[this.data.mySeat].current
          game.roleAssignment.playerRoles[this.data.mySeat].current = playerRole
        }
        break;
      }
      // 捣蛋鬼
      // 交换任意两名玩家的卡牌
      case "troublemaker": {
        if (selectedPlayers.length != 2 || selectedGraveyard.length > 0) {
          this.handleAlert("请（只）选择二名玩家哦", 'warning')
          return;
        } else {
          var playerRole = game.roleAssignment.playerRoles[selectedPlayers[0]].current
          game.roleAssignment.playerRoles[selectedPlayers[0]].current = game.roleAssignment.playerRoles[selectedPlayers[1]].current
          game.roleAssignment.playerRoles[selectedPlayers[1]].current = playerRole
        }
        break;
      }
      // 酒鬼
      // 将自己的卡牌和底牌中的一张交换
      case "drunk": {
        if (selectedPlayers.length > 0 || selectedGraveyard.length != 1) {
          this.handleAlert("请（只）选择一张底牌", 'warning')
          return;
        } else {
          var graveyardRole = game.roleAssignment.graveyardRoles[selectedGraveyard[0]].current
          game.roleAssignment.graveyardRoles[selectedGraveyard[0]].current = game.roleAssignment.playerRoles[this.data.mySeat].current
          game.roleAssignment.playerRoles[this.data.mySeat].current = graveyardRole
        }
        break;
      }
    }

    // TODO: update game in database
    var _this = this
    console.log(game)
    wx.cloud.callFunction({
      name: 'takeAction',
      data: {
        roomId: _this.data.room._id,
        game: game
      },
      success: res => {
        console.log(res)
      }
    })
  },

  /**
   * 模拟动作 （角色在墓地里）
   */
  simulateAction: function(game) {

    const time = game.inGraveyardNextActionRole.pendingTime
    var _this = this

    console.log("[before delay] ", time);
    _this.delay(time).then(
      res => {
        var takeAction = false
        wx.cloud.callFunction({
          name: 'takeAction',
          data: {
            roomId: _this.data.room._id,
            game: game
          },
          success: res => {
            console.log(res)
            takeAction = true
            return
          }
        })
        if (takeAction) {
          return
        }
      }
    )

  },

  /**
   * 投票
   */
  onVote: function() {
    var game = this.data.room.game
    var _this = this

    var selectedPlayers = []
    var selectedGraveyard = []
    for (var i = 0; i < this.data.selectedPlayers.length; i++) {
      if (this.data.selectedPlayers[i]) {
        selectedPlayers.push(i)
      }
    }
    for (var i = 0; i < 3; i++) {
      if (this.data.selectedGraveyard[i]) {
        selectedGraveyard.push(i)
      }
    }

    if (selectedPlayers.length + selectedGraveyard.length != 1) {
      this.handleAlert("请（只）选择一个玩家或一张底牌", 'warning')
    } else {
      // TODO：发送投票结果

      const selectedPlayer = selectedPlayers.length > 0 ? selectedPlayers[0] : -1;
      const selectedGraveyardRole = selectedGraveyard.length > 0 ? selectedGraveyard[0] : -1;

      wx.cloud.callFunction({
        name: 'vote',
        data: {
          roomId: _this.data.room._id,
          selectedPlayer: selectedPlayer,
          selectedGraveyard: selectedGraveyardRole
        },
        success: res => {
          console.log(res)
        }
      })
    }

  },

  /**
   * 显示投票结果
   */
  showResult: function (game) {

    var results = []

    // For test
    game.playerResults = [[2, 3], [], [3, 4]]
    game.graveyardResults = [[2, 3], [], [3, 4]]
    game.winner = "wereWolf"

    for (var i = 0; i < game.playerResults.length; i++) {
      if (game.playerResults[i].length > 0) {
        var voter = ""
        for (var j = 0; j < game.playerResults[i].length; j++) {
          voter += game.playerResults[i][j] + "号 "
        }
        results.push({
          player: i + "号玩家",
          voter: voter
        })
      }
    }

    for (var i = 0; i < game.graveyardResults.length; i++) {
      if (game.playerResults[i].length > 0) {
        var voter = ""
        for (var j = 0; j < game.graveyardResults[i].length; j++) {
          voter += game.graveyardResults[i][j] + "号 "
        }
        results.push({
          player: i + "号墓地",
          voter: voter
        })
      }
    }

    this.setData({
      results: results,
      winner: game.winner
    })

    console.log(this.data.results)

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

    for (var i = 0; i < players.length; i++) {
      var seatNumber = players[i].seatNumber 
      if (players[i].openId == this.data.me) {
        this.setData({
          mySeat: players[i].seatNumber 
        });
      }
      seats[Math.floor(seatNumber / 3)][seatNumber % 3] = players[i]
    }

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

  },

  /**
   * 再来一局
   */
  onRestart: function() {
    this.setData({
      me: "",
      mySeat: null,
      room: {},
      seats: [],
      status: "waiting",
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
      // 狼人
      onlyWolf: false,
      results: []
    })
    // TODO: 数据库改waiting

  },
  
  delay: function(milSec) {
    return new Promise(resolve => {
      setTimeout(resolve, milSec)
    })
  },

  convertFull: function (value) {
    switch (value) {
      case "wereWolf": {
        return "狼人[" + value + "]";
      }
      case "minion": {
        return "替罪羊[" + value + "]";
      }
      case "alphaWolf": {
        return "头狼[" + value + "]";
      }
      case "mysticWolf": {
        return "狼预言家[" + value + "]";
      }
      case "seer": {
        return "预言家[" + value + "]";
      }
      case "apprenticeSeer": {
        return "学徒预言家[" + value + "]";
      }
      case "witch": {
        return "女巫[" + value + "]";
      }
      case "revealer": {
        return "揭示者[" + value + "]";
      }
      case "robber": {
        return "强盗[" + value + "]";
      }
      case "troublemaker": {
        return "捣蛋鬼[" + value + "]";
      }
      case "insomniac": {
        return "失眠者[" + value + "]";
      }
      case "drunk": {
        return "酒鬼[" + value + "]";
      }
      case "mason": {
        return "守夜人[" + value + "]";
      }
      case "villager": {
        return "村民[" + value + "]";
      }
    }
  }
})