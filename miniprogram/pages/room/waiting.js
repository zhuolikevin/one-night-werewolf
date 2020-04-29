// pages/room/waiting.js

const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    me: "",
    room: {},
    seats: [],
    start: false,
    enableStart: false,
    isReady: false,
    role: null,
    currentRole: null,
    selected: [],
    selectedBottom: [],
  },
  

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

    // For test
    options.roomId = "b7ef76b45ea6386900459d9531131c92"
    app.globalData.openid = "oVLcd5DjZZWv_ddtT6ClkYz9S4H0"

    this.setData({
      me: app.globalData.openid
    });

    const _this = this;
    const db = wx.cloud.database();

    wx.cloud.callFunction({
      name: 'waitingPlayersInfo',
      data: {
        roomId: options.roomId
      },
      success: res => {
        _this.setData({
          room: res.result.room,
        });
        this.calculateSeats(res.result.playersReturn, res.result.room.totalPlayer)
      },
      fail: err => {
        console.error('[云函数] [login] 调用失败', err)
      }
    });

    // watch current room change (e.g other players readiness)
    const watcher = db.collection('rooms').doc(options.roomId).watch({
      onChange: function(snapshot) {

        console.log(snapshot.docs[0])
        
        // 监听准备
        if (app.globalData.openid == _this.data.room._openid && _this.data.start == false) {
          var players = snapshot.docs[0].players
          var readyCount = 0
          for (var i = 0; i < players.length; i++) {
            if (players[i].isReady) {
              readyCount++;
            }
          }
          if (readyCount == _this.data.room.totalPlayer - 1) {
            _this.setData({
              enableStart: true
            });
          } else {
            _this.setData({
              enableStart: false
            });
          }
        }

        // 监听开始游戏

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
    })
  },

  /**
   * 开始游戏
   */
  onStart: function() {
    console.log("Now start")
  },

  /**
   * 操作卡牌
   */
  onSelect: function(e) {

    var selected = this.data.selected
    var selectedBottom = this.data.selectedBottom
    var index = e.currentTarget.dataset.index

    if (index >= this.data.room.totalPlayer) {
      return
    }
    if (index >= 0) {
      selected[e.currentTarget.dataset.index] = !selected[e.currentTarget.dataset.index]
    } else {
      selectedBottom[-1 * e.currentTarget.dataset.index - 1] = !selectedBottom[-1 * e.currentTarget.dataset.index - 1]
    }

    this.setData({
      selected: selected,
      selectedBottom: selectedBottom
    });
  },

  onAction: function() {
    console.log(this.data.selected)
    console.log(this.data.selectedBottom)
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
      seats[Math.floor(seatNumber / 3)][seatNumber % 3] = players[i]
    }

    this.setData({
      seats: seats,
    });

    var selected = []
    for (var i = 0; i < totalPlayers; i++) {
      selected[i] = false
    }

    var selectedBottom = []
    for (var i = 0; i < 3; i++) {
      selectedBottom[i] = false
    }

    this.setData({
      selected: selected,
      selectedBottom: selectedBottom
    });

  }
})