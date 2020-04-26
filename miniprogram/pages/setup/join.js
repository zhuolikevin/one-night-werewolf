// pages/setup/join.js
const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    roomNumber: null,
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
      roomNumber: e.detail.value
    });
  },

  onJoinRoom: function() {

    const parsedRoomNumber = parseInt(this.data.roomNumber);
    if (isNaN(parsedRoomNumber) || parsedRoomNumber < 1000 || parsedRoomNumber > 9999) {
      wx.showToast({
        title: '房间号为4位数字',
        icon: 'none'
      });
      return;
    }
    wx.cloud.callFunction({
      name: 'joinRoom',
      data: {
        roomNumber: this.data.roomNumber,
        openId: app.globalData.openid,
      },
      success: res => {
        const { success, message } = res.result
        wx.showToast({
          title: message,
          icon: success ? 'success' : 'none'
        });
      },
      fail: err => {
        console.log("err: ", err);
      }
    });
  }
})