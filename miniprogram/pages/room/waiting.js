// pages/room/waiting.js

const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    room: {},
    seats: [],
    start: false,
    role: null,
    currentRole: null,
  },
  

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

    // For test
    options.roomId = "b7ef76b45ea6386900459d9531131c92"

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
        console.log(res)
        this.calculateSeats(res.result.playersReturn, res.result.room.totalPlayer)
      },
      fail: err => {
        console.error('[云函数] [login] 调用失败', err)
      }
    })
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

    console.log(seats)

    this.setData({
      seats: seats,
    });

  }
})