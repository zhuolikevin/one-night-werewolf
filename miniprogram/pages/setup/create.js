// pages/onw/create/create.js
const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    totalPlayer: 4,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

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

  bindKeyInput: function (e) {
    this.setData({
      totalPlayer: e.detail.value
    })
  },

  onCreateRoom: function() {
    const db = wx.cloud.database();
    db.collection('rooms').add({
      data: {
        totalPlayer: this.data.totalPlayer,
        roomNumber: Math.floor(1000 + Math.random() * 9000),
        players: [app.globalData.openid],
      },
      success: res => {
        wx.showToast({
          title: '创建房间成功',
          icon: 'success',
          duration: 1000,
          success: () => {
            setTimeout(() => {
              wx.redirectTo({
                url: '../room/waiting?roomId=' + res._id,
              });
            }, 1000);
          }
        });
      },
      fail: err => {
        wx.showToast({
          icon: 'none',
          title: '创建房间失败'
        });
      }
    })
  }
})