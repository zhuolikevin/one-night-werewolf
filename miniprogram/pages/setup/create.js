// pages/onw/create/create.js
const app = getApp();
const { $Message } = require('../../dist/base/index');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    totalPlayer: 4,
    wereWolf: 0,
    alphaWolf: 0,
    minion: 0,
    mysticWolf: 0,
    seer: 0,
    apprenticeSeer: 0,
    witch: 0,
    revealer: 0,
    robber: 0,
    troublemaker: 0,
    insomniac: 0,
    drunk: 0,
    mason: 0,
    villager: 0
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

  handleInputChange: function (e) {
    this.setData({
      totalPlayer: e.detail.value
    })
  },

  handleChangeWereWolf: function (e) {
    this.setData({
      wereWolf: e.detail.value
    })
  },

  handleChangeAlphaWolf: function (e) {
    this.setData({
      alphaWolf: e.detail.value
    })
  },

  handleChangeMinion: function (e) {
    this.setData({
      minion: e.detail.value
    })
  },

  handleChangeMysticWolf: function (e) {
    this.setData({
      mysticWolf: e.detail.value
    })
  },

  handleChangeSeer: function (e) {
    this.setData({
      seer: e.detail.value
    })
  },

  handleChangeApprenticeSeer: function (e) {
    this.setData({
      apprenticeSeer: e.detail.value
    })
  },

  handleChangeWitch: function (e) {
    console.log(e)
    this.setData({
      witch: e.detail.value
    })
  },

  handleChangeRevealer: function (e) {
    this.setData({
      revealer: e.detail.value
    })
  },

  handleChangeRobber: function (e) {
    this.setData({
      robber: e.detail.value
    })
  },

  handleChangeTroublemaker: function (e) {
    this.setData({
      troublemaker: e.detail.value
    })
  },

  handleChangeInsomniac: function (e) {
    this.setData({
      insomniac: e.detail.value
    })
  },

  handleChangeDrunk: function (e) {
    this.setData({
      drunk: e.detail.value
    })
  },

  handleChangeMason: function (e) {
    this.setData({
      mason: e.detail.value
    })
  },

  handleChangeVillager: function (e) {
    this.setData({
      villager: e.detail.value
    })
  },

  handleAlert: function(content, type) {
    $Message({
      content: content,
      type: type
    });
  },

  calculateTotalRoles: function() {
    const {wereWolf, alphaWolf, minion, mysticWolf, seer, 
    apprenticeSeer, witch, revealer, robber, troublemaker, insomniac, 
    drunk, mason, villager} = this.data
    console.log(mason)
    return wereWolf + alphaWolf + minion + mysticWolf + seer + 
      apprenticeSeer + witch + revealer + robber + troublemaker + insomniac + 
      drunk + mason + villager;
  },

  onCreateRoom: function() {

    var totalPlayers = this.data.totalPlayer

    if (isNaN(totalPlayers) || totalPlayers < 3 || totalPlayers >= 20) {
      this.handleAlert("请输入合法房间人数（数字3到20）", 'warning')
      return
    }

    var totalRoles = this.calculateTotalRoles()

    if (totalRoles != totalPlayers + 3) {
      this.handleAlert("已选角色 " + totalRoles + ", 需要角色" + (totalPlayers + 3), 'warning')
      return
    }

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