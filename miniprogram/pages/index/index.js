//index.js
const app = getApp();

Page({
  data: {
    avatarUrl: './user-unlogin.png',
    userInfo: {},
    logged: false,
    takeSession: false,
    requestResult: '',
    readyToCreateOrJoin: false,
  },

  onLoad: function() {
    if (!wx.cloud) {
      wx.redirectTo({
        url: '../chooseLib/chooseLib',
      })
      return
    }

    // 获取用户信息
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          // 已经授权，可以直接调用 getUserInfo 获取头像昵称，不会弹框
          wx.getUserInfo({
            success: res => {
              this.setData({
                avatarUrl: res.userInfo.avatarUrl,
                userInfo: res.userInfo
              })
            }
          })
        }
      }
    })
  },

  onGetUserInfo: function(e) {
    if (!this.data.logged && e.detail.userInfo) {
      this.setData({
        logged: true,
        avatarUrl: e.detail.userInfo.avatarUrl,
        userInfo: e.detail.userInfo
      })
      app.globalData.userInfo = e.detail.userInfo;
    }
    this.getOpenId();
  },

  getOpenId: function() {
    // 调用云函数
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        app.globalData.openid = res.result.openid
        this.registerPlayer()
      },
      fail: err => {
        console.error('[云函数] [login] 调用失败', err);
        wx.showToast({
          title: '登陆失败',
        });
      }
    })
  },

  registerPlayer: function() { 
    const _this = this;
    wx.cloud.callFunction({
      name: 'registerPlayer',
      data: {
        userInfo: {
          openId: app.globalData.openid,
          ..._this.data.userInfo,
        }
      },
      complete: res => {
        wx.showToast({
          title: '登陆成功',
        });
        this.setData({
          readyToCreateOrJoin: true,
        });
      }
    });
  }
})
