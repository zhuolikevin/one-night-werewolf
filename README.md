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

游戏房间等待界面

![screenshot_waiting](docs/resource/snapshot_waiting.jpg)

游戏进行界面

![screenshot_playing](docs/resource/snapshot_playing.jpg)

游戏进程界面

![screenshot_progress](docs/resource/snapshot_progress.jpg)

投票结果界面

![screenshot_result](docs/resource/snapshot_result.jpg)

## 游戏介绍

本章节将从角色设定、游戏流程和胜负判定三个方面对游戏内容进行说明。

### 角色设定

#### 狼人阵营
- **普通狼人（WereWolf）** - 能和其他普通狼人，头狼和狼先知互相确认身份。
- **头狼（AlphaWolf）** - 头狼可以将任意一名玩家变成普通狼人。
- **狼先知（MysticWolf）** - 狼先知可以在晚上查看任意一名玩家的身份。
- **爪牙（Minion）** - 爪牙可以确认所有狼人的身份，但狼人不知道爪牙的身份。爪牙被投出局则狼人阵营获胜。

#### 好人阵营
- **预言家（Seer）** - 预言家可以查看场上一名玩家的角色。
- **学徒预言家（Apprentice Seer）** - 学徒预言家可以查看一个墓地里的身份。
- **女巫（Witch）** - 女巫在夜晚可以查看一个墓地里的身份，并将该身份与任意一名玩家（包括女巫自己）的身份进行交换。
- **揭示者（Revealer）** - 揭示者可以揭示任意一名玩家的身份，如果该玩家身份不是普通狼人、头狼或狼先知，则白天所有玩家都能看到该角色的身份。
- **强盗（Robber）** - 强盗可以查看一名玩家的身份，并与该玩家交换身份。
- **捣蛋鬼（Troublemaker）** - 捣蛋鬼可以交换两名玩家的身份。
- **失眠者（Insomniac）** - 失眠者可以查看自己行动当时的身份。
- **酒鬼（Drunk）** - 酒鬼可以将自己的身份与墓地里的一个身份交换。
- **守夜人（Mason）** - 守夜人可以和其他守夜人互相确认身份。
- **村民（Villager）** - 无技能。

#### 第三方阵营
- **皮匠（Tanner）** - 皮匠没有技能，也不属于狼人或好人阵营，胜利条件是让自己被投出局。

### 游戏流程

1. 创建房间，所有玩家进入房间并准备，房主选择“开始游戏”。
2. 所有玩家看到自己角色，并按游戏提示，以【所有狼人-头狼-狼先知-爪牙-守夜人-预言家-学徒预言家-强盗-女巫-捣蛋鬼-酒鬼-失眠者-揭示者】顺序行动。
3. 所有玩家依次进行发言，然后讨论。
4. 所有玩家投票选出狼人，可以选墓地。
5. 查看投票结果与胜负情况。
6. 房主可以重新开始新一局游戏。

### 胜负判定

所有胜负判断都基于玩家在行动结束后的当前身份，而不是初始身份。

- 狼人阵营胜利条件
	- 得票最多的玩家只有一名且不是狼人，或是爪牙
	- 如果有平票，平票玩家中有非狼人阵营的
	- 如果得票最多的是墓地且场上有狼人
- 好人阵营胜利条件
	- 得票最多的玩家只有一个且是狼人
	- 墓地得票最多且场上没有狼人
- 皮匠胜利条件
	- 自己是唯一得票最多的玩家