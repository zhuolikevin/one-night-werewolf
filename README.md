# 终极一夜狼

终极一夜狼是一款基于微信小程序平台的多人在线互动策略推理游戏。此款微信小程序游戏基于[百度百科一夜狼人杀](https://baike.baidu.com/item/%E4%B8%80%E5%A4%9C%E7%8B%BC%E4%BA%BA%E6%9D%80/22270282)，同时结合了[一夜终极狼人](https://www.douban.com/review/7934668/)的规则。玩家可以通过微信内置功能登陆游戏进行互动。

## 软件介绍

本节我们将从运行平台、技术框架和应用实例三个方面对本软件做简单介绍。

### 运行平台

本游戏在微信小程序平台运行，包括iOS与安卓，其中逻辑层分别基于JavaScriptCore和V8，渲染层基于WKWebView和chrominum定制内核。对于开发者而言，在开发过程中可运行在小程序开发者工具。[微信开放文档](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/#%E5%B0%8F%E7%A8%8B%E5%BA%8F%E4%B8%8E%E6%99%AE%E9%80%9A%E7%BD%91%E9%A1%B5%E5%BC%80%E5%8F%91%E7%9A%84%E5%8C%BA%E5%88%AB)对于运行环境有更为详细的阐述。

### 技术框架

本游戏基于微信小程序官方提供的技术框架，包括逻辑层页面路由与生命周期，如登录游戏、创建房间、加入房间、房间内游戏等页面切换与时间响应。页面渲染基于小程序平台提供的WXML/WXSS/WXS编写。同时应用了云函数功能实现多游戏者状态同步更新、协同游戏等后端数据库功能。

#### 数据库设计

- `players`- 所有玩家的集合，会在玩家第一次登陆游戏时添加记录，存储玩家的微信头像、昵称以及openId。
- `rooms` - 所有游戏房间的集合，每个记录包含了所有该房间游戏相关的信息，如
	- 创建者openId
	- 房间初始设定（房间号、游戏总人数、角色设定）
	- 玩家头像、昵称、座位及openId
	- 游戏状态（所有玩家和墓地初始角色、当前角色、当前行动玩家、投票结果等）

#### 云函数

- `calculateNextActionRole` - 通过当前角色和场上角色设定计算下一个行动角色，在开始游戏和有角色行动后调用。
- `createRoom` - 创建房间，在用户选择创建房间时调用。在数据库中添加房间记录，初始化房主设置，角色设置，和游戏状态等。
- `joinRoom` - 加入房间，当用户输入房间号加入房间时调用。为新入房间用户分配座位，并更新房间记录。
- `login` - 获取微信上下文（主要为openId）以识别当前用户。
- `registerPlayer` - 在用户选择使用微信登陆小程序获取到微信上下文后调用。判断是否为新用户，如果是会在用户集合中添加一条记录。
- `setReady` - 在玩家选择准备时调用，改变其在数据库房间记录中的准备状态。当所有玩家准备后房主可以开始游戏。
- `startGame` - 开始游戏，根据房间角色设定给所有玩家分配角色，并计算第一个行动的角色。同时也用于结束一句游戏后重新开始游戏，这时会重置房间状态。
- `takeAction` - 在某一角色行动结束后，或者墓地中角色随机延时后调用，用来计算下一个需要行动的角色。如果当前角色是最后一个角色则进入投票状态。
- `vote` - 接收玩家投票信息，更新数据库房间记录中的投票统计，当所有角色投票请求都收到后，会根据游戏规则计算胜利阵营。

### 应用实例

游戏登陆界面

创建游戏界面

游戏进行界面

投票结果界面

## 游戏介绍



### 角色设定

### 游戏流程

### 胜负判定
