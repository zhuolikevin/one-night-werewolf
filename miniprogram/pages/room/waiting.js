// pages/room/waiting.js

const app = getApp();
const { $Message } = require('../../dist/base/index');

Page({

  /**
   * 游戏初始化数据
   */
  data: { 
    myOpenId: app.globalData.openid, 
    mySeat: null,
    myRole: "",
    room: {},
    seats: [],
    selectedPlayers: [],
    selectedGraveyard: [],
    status: "waiting",
    enableStart: false,
    isReady: false,
    currentRole: "",
    currentStep: "",
    simulated: [],
    actioned: false,
    showRight: false,
    // 女巫
    round: 0,
    lastSelected: null,
    // 狼人
    onlyWolf: false,
    // 结束
    voted: false,
    results: [],
    winner: "",
  },
  

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

    if (!app.globalData.openid) {
      this.handleAlert("出错啦，重新登录一下吧", "error")
    }

    this.setData({
      myOpenId: app.globalData.openid
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

    // 监听数据库变化
    const watcher = db.collection('rooms').doc(options.roomId).watch({
      onChange: function(snapshot) {

        // 根据数据库更新房间数据
        if (snapshot.docs.length != 0) {
          _this.setData({
            room: snapshot.docs[0],
            actioned: app.globalData.actioned
          })
        } else {
          return
        }

        if (_this.data.mySeat == null) {
          _this.calculateSeats(_this.data.room.players, _this.data.room.totalPlayer);
        }

        // 准备阶段
        if (_this.data.room.game.status == "waiting") {

          // 刷新房间信息
          _this.onInit()
          _this.setData({
            room: snapshot.docs[0],
            myOpenId: app.globalData.openid
          })
          for (let i = 0; i < _this.data.room.players.length; i++) {
            if (_this.data.room.players[i].openId == _this.data.myOpenId) {
              _this.setData({
                isReady: _this.data.room.players[i].isReady
              })
            }
          }

          // （所有人）监听新玩家加入
          _this.calculateSeats(_this.data.room.players, _this.data.room.totalPlayer);
        
          // （房主）监听准备人数， 若所有人都准备， 房主可以点击开始游戏
          if (_this.data.myOpenId == _this.data.room._openid) {
            var players = _this.data.room.players
            var readyCount = 0, enableStart = false
            for (let i = 0; i < players.length; i++) {
              if (players[i].isReady) {
                readyCount++;
              }
            }
            if (readyCount == _this.data.room.totalPlayer) {
              enableStart = true
            }
            _this.setData ({
              enableStart: enableStart
            })
          }
        } 
        
        // 游戏阶段
        if (_this.data.room.game.status == "gaming") {

          var currentGame = _this.data.room.game;

          // （所有人）更新自己的初始角色
          if (_this.data.myRole == "") {
            _this.setData({
              myRole: currentGame.roleAssignment.playerRoles[_this.data.mySeat].init,
            });
          }

          // （所有人）更新当前正在行动的角色
          _this.setData({
            currentRole: currentGame.currentRole == null ? currentGame.inGraveyardNextActionRole.role : currentGame.currentRole,
          });

          // （所有人）监听非自己角色行动
          if (_this.data.currentRole != _this.data.myRole) {
            // 狼人阶段头狼和狼预言家也要睁眼
            _this.updateStep("")
            if (_this.data.currentRole == "wereWolf") {
              if (_this.data.myRole == "alphaWolf" || _this.data.myRole == "mysticWolf") {
                _this.setHint(currentGame)
              }
            }
            // 如果这个角色在墓地里
            if (currentGame.currentRole == null) {  
              _this.simulateAction(currentGame)
            }
          // （所有人）监听自己角色行动
          } else {
            // 如果之前行动过又退出房间了
            if (app.globalData.actioned) {
              _this.updateStep("你已经行动过啦!")
              _this.updateDatabase(currentGame, _this.data.myRole, 0)
              return
            }
            // 如果是非普通狼人的狼人牌
            if (_this.data.myRole == "alphaWolf" || _this.data.myRole == "mysticWolf") {
              _this.setData({
                actioned: false
              })
              app.globalData.actioned = false
            }
            _this.setHint(currentGame)
          }
        }

        // 投票阶段
        if (_this.data.room.game.status == "voting") {
          _this.updateStep("")

          // 如果有被揭示者翻开的牌
          if (JSON.stringify(_this.data.room.game.revealer) !== '{}') {
            _this.updateStep("揭示者揭露了" + _this.data.room.game.revealer.seatNumber + "号当前身份是: " + _this.convertFull(_this.data.room.game.revealer.role))
          }
        }  

        // 显示结果阶段
        if (_this.data.room.game.status == "results") {
          _this.updateStep(_this.data.room.game.winner)
          _this.showResult(_this.data.room.game)
        }
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
   * 显示右侧弹框
   */
  toggleRight() {
    this.setData({
      showRight: !this.data.showRight
    });
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

    if (game.currentRole == null) {
      return
    }

    var players = game.roleAssignment.playerRoles;

    switch (game.currentRole) {
      case "wereWolf": 
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
      case "minion": 
        var wolf = "";
        for (var i = 0; i < players.length; i++) {
          if (players[i].init == "wereWolf" || players[i].init == "alphaWolf" || players[i].init == "mysticWolf") {
            wolf += i + "号 ";
          }
        }
        if (wolf == "") {
          this.updateStep("场上没有狼人");
        } else {
          this.updateStep("狼人是: " + wolf);
        }
        break;
      case "alphaWolf": 
        this.updateStep("请选择一名玩家将他变成狼人");
        break;
      case "seer":
      case "mysticWolf":
        this.updateStep("请选择一名玩家查看它的身份");
        break;
      case "apprenticeSeer": 
        this.updateStep("请选择查看一张底牌");
        break;
      case "witch": 
        this.updateStep("请选择查看一张底牌并和任意一名玩家的卡牌交换");
        break;
      case "revealer": 
        this.updateStep("请翻开任意一名玩家的卡牌");
        break;
      case "robber": 
        this.updateStep("请选择查看任意一名玩家的卡牌并盗用他的身份");
        break;
      case "troublemaker": 
        this.updateStep("请选择任意两名玩家的卡牌并交换");
        break;
      case "insomniac": 
        this.updateStep("你的身份是: " + players[this.data.mySeat].current);
        break;
      case "drunk": 
        this.updateStep("请选择一张底牌并盗用此身份");
        break;
      case "mason": 
        var mason = ""
        for (var i = 0; i < players.length; i++) {
          if (i != this.data.mySeat && players[i].init == "mason") {
            mason += i + "号 ";
          }
        }
        if (mason == "") {
          this.updateStep("守夜人只有你自己");
        } else {
          this.updateStep("另外的守夜人是: " + mason);
        }
        break;
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
    var update = true

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
      case "wereWolf":
      case "minion":
      case "insomniac":
      case "mason": 

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
      
      // 头狼
      // 指定一名玩家成为狼人
      case "alphaWolf": 
        if (selectedPlayers.length != 1 || selectedGraveyard.length > 0) {
          this.handleAlert("请（只）选择一名玩家哦", 'warning')
          return;
        } else {
          game.roleAssignment.playerRoles[selectedPlayers[0]].current = "wereWolf"
        }
        break;
      
      // 预言家 || 狼预言家
      // 查看场上一名玩家身份
      case "mysticWolf":
      case "seer": 
        if (selectedPlayers.length != 1 || selectedGraveyard.length > 0) {
            this.handleAlert("请（只）选择一名玩家哦", 'warning')
            return;
        } else if (selectedPlayers[0] == this.data.mySeat) {
            this.handleAlert("请不要选择自己哦", 'warning')
            return;
        } else {
            this.updateStep("这名玩家的身份是: " + this.convertFull(game.roleAssignment.playerRoles[selectedPlayers[0]].current))
        }
        break;
      
      // 学徒预言家
      // 查看一张底牌
      case "apprenticeSeer": 
        if (selectedPlayers.length > 0 || selectedGraveyard.length != 1) {
          this.handleAlert("请（只）选择一张底牌哦", 'warning')
          return;
        } else {
          this.updateStep("这张底牌的身份是: " + this.convertFull(game.roleAssignment.graveyardRoles[selectedGraveyard[0]].current))
        }
        break;
      // 女巫
      // Round0: 查看一张底牌 & Round1: 将这张牌与任意一名玩家的卡牌交换
      case "witch": 
        if (this.data.round == 0) {
          if (selectedPlayers.length > 0 || selectedGraveyard.length != 1) {
            this.handleAlert("请（只）选择一张底牌哦", 'warning')
            return;
          } else {
            this.updateStep("这张底牌的身份是: " + this.convertFull(game.roleAssignment.graveyardRoles[selectedGraveyard[0]].current) + ", 再选择一名玩家把这个身份给他吧")
            this.setData({
              lastSelected: selectedGraveyard[0]
            });
            update = false
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
        var currentRound = parseInt(this.data.round) + 1
        this.setData({
          round: currentRound
        });
        break;
      // 揭示者
      case "revealer": 
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
      // 强盗
      // 查看场上一名玩家身份并将自己的卡牌与他交换
      case "robber": 
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
      // 捣蛋鬼
      // 交换任意两名玩家的卡牌
      case "troublemaker": 
        if (selectedPlayers.length != 2 || selectedGraveyard.length > 0) {
          this.handleAlert("请（只）选择二名玩家哦", 'warning')
          return;
        } else {
          var playerRole = game.roleAssignment.playerRoles[selectedPlayers[0]].current
          game.roleAssignment.playerRoles[selectedPlayers[0]].current = game.roleAssignment.playerRoles[selectedPlayers[1]].current
          game.roleAssignment.playerRoles[selectedPlayers[1]].current = playerRole
        }
        break;
      // 酒鬼
      // 将自己的卡牌和底牌中的一张交换
      case "drunk": 
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

    if (this.data.myRole == "witch" && this.data.round == 1) {
      return;
    } else {
      this.setData({
        actioned: true
      });
      app.globalData.actioned = true;
      this.updateDatabase(game, this.data.myRole, 2000);
    }

  },

  /**
   * 模拟动作 （角色在墓地里）
   */
  simulateAction: function(game) {

    // 如果已经模拟过则返回
    for (var i = 0; i < this.data.simulated.length; i++) {
      if (this.data.currentRole == this.data.simulated[i]) {
        return
      }
    }

    var simulated = this.data.simulated
    simulated.push(this.data.currentRole)
    this.setData({
      simulated: simulated,
    })

    const time = game.inGraveyardNextActionRole.pendingTime
    updateDatabase(game, this.data.currentRole, time)
  },


  /**
   * 根据操作更新数据库
   */
  updateDatabase: function (game, role, time) {
    var _this = this
    this.delay(time).then(
      res => {
        var _this = this
        wx.cloud.callFunction({
          name: 'takeAction',
          data: {
            roomId: _this.data.room._id,
            game: game,
            myRole: role
          },
          success: res => {
            console.log(res)
          }
        })
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
    for (let i in this.data.selectedPlayers) {
      if (this.data.selectedPlayers[i]) {
        selectedPlayers.push(i)
      }
    }
    for (let i = 0; i < 3; i++) {
      if (this.data.selectedGraveyard[i]) {
        selectedGraveyard.push(i)
      }
    }

    if (selectedPlayers.length + selectedGraveyard.length != 1) {
      this.handleAlert("请（只）选择一个玩家或一张底牌", 'warning')
    } else {
      const selectedPlayer = selectedPlayers.length > 0 ? selectedPlayers[0] : -1;
      wx.cloud.callFunction({
        name: 'vote',
        data: {
          roomId: _this.data.room._id,
          seatNumber: _this.data.mySeat,
          selectedPlayer: selectedPlayer
        },
        success: res => {
          console.log(res)
        }
      })

      _this.setData({
        voted: true
      })
    }

  },

  /**
   * 显示投票结果
   */
  showResult: function (game) {

    var results = []

    for (var i = 0; i < game.results.playerResults.length; i++) {
      if (game.results.playerResults[i].length > 0) {
        var voter = ""
        for (var j = 0; j < game.results.playerResults[i].length; j++) {
          voter += game.results.playerResults[i][j] + "号 "
        }
        results.push({
          player: i + "号玩家",
          voter: voter
        })
      }
    }

    var voter = ""
    for (var i = 0; i < game.results.graveyardResults.length; i++) {
      voter += game.results.graveyardResults[i] + "号 "
    }
    if (voter == "") {
      voter = "没有人"
    }
    results.push({
      player: "墓地",
      voter: voter
    })

    this.setData({
      results: results,
      winner: game.results.winner
    })

  },

  /**
   * 分配座位
   */
  calculateSeats: function(players, totalPlayers) {

    var rows = Math.ceil(totalPlayers / 3);
    var seats = new Array(rows);  
    for (let i = 0; i < seats.length; i++) {
      seats[i] = new Array(3);    
    }

    /**
     * 计算玩家位置
     */
    for (let i = 0; i < players.length; i++) {
      var seatNumber = players[i].seatNumber 
      if (players[i].openId == this.data.myOpenId) {
        this.setData({
          mySeat: players[i].seatNumber 
        });
      }
      seats[Math.floor(seatNumber / 3)][seatNumber % 3] = players[i]
    }

    /**
     * 初始化选择的玩家和底牌
     */
    var selectedPlayers = [], selectedGraveyard = [3]
    for (let i in totalPlayers) {
      selectedPlayers[i] = false
    }
    for (let i in selectedGraveyard) {
      selectedGraveyard[i] = false
    }

    /**
     * 更新数据
     */
    this.setData({
      seats: seats,
      selectedPlayers: selectedPlayers,
      selectedGraveyard: selectedGraveyard
    });

  },

  /**
   * 再来一局
   */
  onRestart: function() {
    var roomId = this.data.room._id
    const db = wx.cloud.database();
    const _ = db.command;
    db.collection('rooms').doc(roomId).update({
      data: {
        game: {
          status: "waiting",
          revealer: _.set({}),
          results: {
            votedOpenIds: [],
            votes: [],
          },
        }
      }
    });
  },

  /**
   * 初始化所有数据
   */
  onInit: function() {
    this.setData({
      myOpenId: "",
      room: {},
      enableStart: false,
      myRole: "",
      currentRole: "",
      selectedPlayers: [],
      selectedGraveyard: [],
      currentStep: "",
      simulated: [],
      showRight: false,
      actioned: false,
      // 女巫
      round: 0,
      lastSelected: null,
      // 狼人
      onlyWolf: false,
      // 结束
      voted: false,
      results: [],
      winner: "",
    })
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