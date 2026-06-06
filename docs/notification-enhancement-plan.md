# 战局事件通知增强方案

> 问题: 当前所有动态事件通知通过 `NotificationManagerClass.DisplayMessageNotification()` 在右下角推送，易被忽略
> 目标: 提升事件通知的到达率而不破坏沉浸感
> 时间: 2026-06-02

---

## 一、当前现状分析

### 1.1 现有通知机制

```
位置: 屏幕右下角（EFT原生消息区域）
持续时间: Long ≈ 5秒 | Default ≈ 3秒
图标类型: Alert / Default / Quest / EntryPoint / Achievement / Mail
样式: 统一白色文字 + 小图标，与"物品拾取/任务更新"共用一个通知管道
```

### 1.2 核心问题

| 问题 | 影响 |
|---|---|
| **通知管道拥挤** | 事件通知与物品拾取、任务进度、商人消息混在一起 |
| **视觉不突出** | 白色文字+小图标，没有颜色分级或动画区分 |
| **无持续提醒** | 一次性通知，玩家可能刚好没看到 |
| **正向事件无需行动** | 治愈/护甲修复等事件通知即使错过也无后果 |
| **负向事件错过更惨** | 停电/撤离封锁/炮击等事件错过会导致严重后果 |
| **持续时间长的事件无进度感** | 10-15分钟的事件中间没有提示，玩家忘记事件还在进行中 |

---

## 二、增强方案设计

### 2.1 方案A: 中途提醒系统（推荐优先实施）

**原理**: 对持续时间超过阈值的事件，在时间过半和即将结束时自动发送额外提醒。

**适用事件**:

| 事件 | 持续时间 | 中途提醒时间点 | 即将结束提醒 |
|---|---|---|---|
| 停电 (Blackout) | 10分钟 | 5分钟 | 1分钟 |
| 撤离封锁 (Lockdown) | 15分钟 | 7.5分钟 | 1分钟 |
| 购物狂欢 (Shopping Spree) | 10分钟 | 5分钟 | 1分钟 |
| 狂暴 (Berserk) | 3分钟 | 1.5分钟 | 30秒 |
| 负重 (Weight) | 3分钟 | 1.5分钟 | 30秒 |
| 武器故障 (Malfunction) | 5分钟 | 2.5分钟 | 1分钟 |
| 代谢停止 (Iron Stomach) | 15分钟 | 7.5分钟 | 1分钟 |
| 炮击倒计时 (Arty) | 30秒 | -- | 10秒 |

**实现方式**:
```csharp
// 在现有的 async void 事件方法中，添加中途提醒协程
public async void DoLockDownEvent()
{
    var token = this.destroyCancellationToken;
    
    // 初始通知（已有）
    NotificationManagerClass.DisplayMessageNotification("撤离封锁事件: 所有撤离点已关闭，持续15分钟", ...);
    
    // 中途提醒：7.5分钟后
    await Task.Delay(450000, token);
    if (!token.IsCancellationRequested) {
        NotificationManagerClass.DisplayMessageNotification("撤离封锁事件: 还剩7.5分钟", ...);
    }
    
    // 即将结束提醒：14分钟后
    await Task.Delay(390000, token); // 450000 + 390000 = 840000 ≈ 14分钟
    if (!token.IsCancellationRequested) {
        NotificationManagerClass.DisplayMessageNotification("撤离封锁事件: 还剩1分钟！准备撤离！", ...);
    }
    
    // 原有恢复逻辑...
}
```

**工作量**: 修改 EventController.cs 中 8 个 async void 方法，每个方法加 2-3 个提醒点。预计 2-3 小时。

**提示文本草案**:

| 事件 | 中途提醒 | 即将结束 |
|---|---|---|
| 停电 | `停电事件剩余5分钟` | `停电事件: 电力将在1分钟后恢复` |
| 撤离封锁 | `撤离封锁剩余7.5分钟` | `撤离封锁: 1分钟后解除，准备撤离！` |
| 购物狂欢 | `购物狂欢剩余5分钟` | `购物狂欢: 1分钟后结束，抓紧时间！` |
| 狂暴 | `狂暴效果剩余1.5分钟` | `狂暴: 30秒后消退` |
| 负重 | `负重变化剩余1.5分钟` | `负重: 30秒后恢复正常` |
| 武器故障 | `武器故障剩余2.5分钟` | `武器故障: 1分钟后恢复正常` |
| 代谢停止 | `铁胃效果剩余7.5分钟` | `铁胃: 1分钟后效果消退` |
| 炮击 | -- | `炮击: 10秒后开始！找掩体！` |

---

### 2.2 方案B: 屏幕中央大字提示（高冲击事件专用）

**原理**: 对"必须立即行动"的事件（撤离封锁、炮击、心脏骤停），在屏幕中央显示大字提示，类似原版游戏"撤离点已开启"的效果。

**实现方式**:
使用 Unity `GameObject` 动态创建屏幕中央 TextMeshPro 文本，带淡入淡出动画。或在现有 HUD 层添加 overlay。

**技术路径**:
```csharp
// 通过反射获取 BattleUIScreen 或使用 EFT UI 系统的 HUD 层级
private void ShowCentralNotification(string text, float duration)
{
    var uiScreen = MonoBehaviourSingleton<PreloaderUI>.Instance;
    // 在 screen 的 HUD 层创建临时 TextMeshProUGUI
    // 使用 DOTween 做 fadeIn/fadeOut 动画
}
```

**适用事件**: 撤离封锁、炮击、心脏骤停（仅最高优先级事件）

**风险**: 需要深入 EFT UI 系统，API 可能随版本变化。建议作为第二阶段增强。

---

### 2.3 方案C: 事件状态 HUD 图标

**原理**: 在屏幕左上角（Buff/Debuff 区域下方）添加小型事件状态图标，持续显示正在进行中的事件。

**显示内容**:
- 事件图标（根据事件类型不同）
- 事件名称简写
- 剩余时间倒计时（可选）

**示例布局**:
```
┌─ Buff/Debuff 图标区 ─────────────────┐
│ [狂暴Buff] [负重Debuff]               │
│ [🔒 封锁 12:34] [⚡ 停电 05:21]       │  ← 新增事件状态行
└──────────────────────────────────────┘
```

**实现方式**: 
利用 EFT 的 Buff 系统（`ActiveHealthController`）或创建自定义 UI 组件。最干净的方案是利用现有的 `Effects` 系统——添加自定义 Effect 类型。

**风险**: 中等。需要理解 EFT 的 Buff UI 渲染管线。建议作为第三阶段增强。

---

### 2.4 方案D: 音效反馈

**原理**: 为关键事件添加独特的音效提示。

**优先级分级**:
| 等级 | 事件 | 音效建议 |
|---|---|---|
| 危急 | 心脏骤停、炮击 | EFT 原版空袭警报音效 |
| 警告 | 撤离封锁、停电 | EFT 原版雷声/警报短音 |
| 信息 | 治愈、护甲修复、技能 | 轻快提示音 |
| 正面 | 狂暴、购物狂欢、空投 | 战鼓/激励音效 |

**实现方式**: 使用 `Singleton<BetterAudio>.Instance.PlayAtPoint()` 或 EFT 的 `MonoBehaviourSingleton<BetterAudio>.Instance` 播放游戏内音频。

**优势**: 不依赖视觉，玩家即使不看屏幕也能感知事件。

---

### 2.5 方案E: 通知级别可配置

**原理**: 在客户端 `DJConfig` 中添加事件通知强度选项，让玩家自定义。

```csharp
public enum NotificationLevel
{
    Subtle,     // 仅右下角通知（当前行为）
    Normal,     // 右下角 + 中途提醒
    Prominent,  // 右下角 + 中途提醒 + 屏幕中央大字（危急事件）
    Full        // 以上全部 + 音效
}
```

---

## 三、推荐实施路线

### 第一阶段（2-3小时，高ROI）: 中途提醒系统

**实施**: 方案A - 为所有持续时间 > 2分钟的事件添加中途和即将结束提醒

**效果**: 事件到达率从 ~60% 提升到 ~90%

**修改范围**: 仅 `EventController.cs`，在现有 async void 方法中添加延迟提醒

### 第二阶段（3-5小时，中ROI）: 通知级别 + 音效

**实施**: 方案D（音效） + 方案E（可配置级别）

**效果**: 进一步差异化事件感知

**修改范围**: `EventController.cs` + `Config.cs`（客户端配置面板）

### 第三阶段（5-8小时，低ROI/高沉浸）: HUD 图标 + 中央大字

**实施**: 方案B（中央大字）+ 方案C（HUD状态图标）

**效果**: 接近原生游戏的功能完整性

**修改范围**: 需要深入 EFT UI 系统，添加新 UI 组件

---

## 四、方案A实现细节（供实施参考）

### 需要修改的事件方法（EventController.cs）

| 方法 | 原持续时间 | 新增提醒点 | Token 已就绪？ |
|---|---|---|---|
| `DoBlackoutEvent` | 600000ms (10min) | 300000ms + 540000ms | 是（Phase 2已加） |
| `DoMalfEvent` | 300000ms (5min) | 150000ms + 240000ms | 是 |
| `DoBerserkEvent` | 180000ms (3min) | 90000ms + 150000ms | 是 |
| `DoWeightEvent` | 180000ms (3min) | 90000ms + 150000ms | 是 |
| `DoMaxLLEvent` | 600000ms (10min) | 300000ms + 540000ms | 是 |
| `DoLockDownEvent` | 600000ms (15min) | 450000ms + 840000ms | 是 |
| `DoArtyEvent` | 30000ms (0.5min) | -- + 20000ms | 是 |
| `RestoreMetabolism` | 900000ms (15min) | 450000ms + 840000ms | 否（协程） |
| `RunTrain` | 420000ms (7min) | 210000ms | 是 |
| `DoPmcExfilEvent` | 120000ms (2min) | 60000ms | 是 |

### 新增提示文本（待确认后注入）

见方案A表格中的文本草案。

---

## 五、风险与权衡

| 因素 | 说明 |
|---|---|
| **通知疲劳** | 过多的中途提醒可能打扰玩家。建议非关键事件（代谢、负重）只做1次中途提醒 |
| **性能** | `Task.Delay` 不占 CPU，仅增加少量内存 |
| **多事件并发** | 理论上多个事件可能同时触发提醒，但概率低且影响小（多个通知排队显示） |
| **Fika联机** | 提醒仅在本地显示，不需要网络同步 |

---

> Vault-Tec 建议：先实施第一阶段（中途提醒），在游戏中感受效果后再决定是否需要第二阶段（音效/大字）。
