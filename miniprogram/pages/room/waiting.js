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
  },
  

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const _this = this;
    const db = wx.cloud.database();
    db.collection('rooms').doc(options.roomId).get({
      success: res => {
        _this.setData({
          room: res.data,
        });
        this.calculateSeats(res.data.players)
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
  onPrepare: function() {
    console.log("Now prepare")
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
  calculateSeats: function(players) {

    var rows = Math.ceil(players.length / 3);

    var seats = new Array(rows);   //表格有10行
    for (var i = 0; i < seats.length; i++) {
      seats[i] = new Array(3);    //每行有10列
    }

    for (var i = 0; i < players.length; i++) {
      var seatNumber = players[i].seatNumber 
      seats[Math.floor(seatNumber / 3)][seatNumber % 3] = players[i]
    }

    this.setData({
      seats: seats,
    });

  }
})