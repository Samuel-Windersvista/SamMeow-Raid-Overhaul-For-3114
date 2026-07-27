# Gear Exfil Crate（装备撤离快递箱）复活实施方案

> 文档版本: v1.0  
> 创建日期: 2026-07-19  
> 目标版本: SPT 3.11.4  
> 审批状态: 议会多数通过（2/3 共识）  
> 风险等级: 中高 | 成功率: 60-70%

---

## 一、功能概述

玩家在战局中使用特殊信号弹 → 呼叫一个空的 LootableContainer（20x14 格子，仅限武器/装备）→ 玩家把捡到的战利品放进去 → 150 秒后箱子自动锁定 → 撤离后物品通过 trader service API 自动送达仓库。

核心机制类似快递柜：呼叫空箱、投递物资、撤离查收。

---

## 二、历史背景

### 演变时间线

| 提交 | 日期 | 事件 |
|------|------|------|
| 36dacd0 | 2024-11 | 第一代 `ExfilAirdropBOOMBOOM`，控制台命令注释 |
| 47643cc | 2025-03 | 第二代 `DoGearExfilEvent` 被 `/* */` 整块注释，**诞生即死** |
| 4645e88 | 2025-03 | SPT 3.11 升级，仍保持注释状态 |
| e3f9211 | 2025-04 | LTS 清理，注释块 + 3 个辅助方法彻底删除 |

### 被停用原因

1. **协程 Bug**：`SpawnItem()` 直接调用 IEnumerator 未用 `StartCoroutine()`，箱子永远不会生成
2. **设计未完成**：触发机制在鼠标点击/信号弹之间反复横跳，从未接入事件系统
3. **API 名称错误**：`PoolManager` 应为 `PoolManagerClass`（SPT 重命名）
4. **作者放弃**：DJ 在 LTS 清理中删除，提交信息写 "Maybe some other shit, I can't remember"

---

## 三、可行性评估

### 议会裁决

两点一致结论：

1. **反编译结果可信**：`LootableContainer.Lock()` 在 SPT 3.11.x 中是 public 方法，外部研究报告混淆了 `IUpd.Lockable`（数据属性）和 `Lock()`（行为方法）
2. **可以复活，但需分阶段渐进实施**：核心路径风险可控，动态容器生成是最大不确定性

### API 兼容性矩阵（反编译确认）

| API | 签名 | 确认 |
|-----|------|------|
| `ItemFactoryClass.CreateItem` | `(string itemId, string templateId, [CanBeNull] GClass825)` | [OK] |
| `PoolManagerClass.CreateLootPrefab` | `(Item, ECameraType)` → GameObject | [OK] |
| `GameWorld.CreateLootWithRigidbody` | `(GameObject, Item, string, bool, MongoID[], out BoxCollider, bool, bool, float)` | [OK] |
| `LootableContainer.Lock()` | Public method | [OK] |
| `LootableContainer.Unlock()` | Public method | [OK] |
| `LootableContainer.Open()` | Public method | [OK] |
| `LootableContainer.Close()` | Public method | [OK] |
| `LootableContainer.Init(TraderControllerClass)` | 初始化 ItemOwner | [OK] |

### 完好可复用的现有资产

| 资产 | 位置 | 状态 |
|------|------|------|
| `SendExfilBox()` | Utils.cs:184-204 | 完整，仅无人调用 |
| `SpecialMilitaryCrate` 物品定义 | db/ItemGen/Cases/SpecialMilitaryCrate.json | 完整 |
| `SpecialExfilFlare` 信号弹定义 | db/ItemGen/ConstItems/SpecialExfilFlare.json | 完整 |
| `special_storage_crate.bundle` 3D 模型 | bundles.json | 完整 |
| `HandleFlareSuccessEvent` 信号弹触发 | EventController.cs:306 | 已用于空投事件 |
| 事件系统 + Fika 桥接 | EventController.cs + FikaBridge.cs | 完好 |

---

## 四、需要修复和新建的组件

### Showstopper（绝对前提）

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| 1 | `_defaultJsonConverters` 从未赋值 | Utils.cs:90 | `SendExfilBox()` 第 193/200 行调用 `.ToJson(_defaultJsonConverters)` 必定 NullReferenceException |

### 致命缺失

| # | 问题 | 位置 | 修复方式 |
|---|------|------|----------|
| 2 | `DoGearExfilEvent()` 方法体不存在 | EventController.cs | 重新实现完整方法 |
| 3 | `SpawnItem()`/`SpawnExfilItemTask()`/`GetBundleResourceKeys()` 已删除 | Utils.cs | 重写容器生成逻辑 |
| 4 | `exfilCrate` 常量已删除 | Utils.cs | 重新添加 `public static readonly string ExfilCrate = "67c957ce411e6263333a1c38"` |

### 功能缺陷

| # | 问题 | 位置 | 修复方式 |
|---|------|------|----------|
| 5 | `FlareLogicExfil()` 硬连线到 `DoPmcExfilEvent()` | EventController.cs:1345 | 添加模板 ID 分支判断 |
| 6 | `_mouseInputCountE` 共享导致 PMC/Gear 冲突 | EventController.cs:60 | 添加独立的 `_gearExfil` 守卫标志 |
| 7 | Fika 接收端仅显示通知不生成箱子 | FikaComponent.cs:178-181 | 调用本地 `DoGearExfilEvent()` |

### 配置集成

| # | 问题 | 位置 | 修复方式 |
|---|------|------|----------|
| 8 | `EventWeightings.json` 无 GearExfil 条目 | RaidOverhaul/db/ | 添加权重配置 |
| 9 | `Weighting.InitEventWeighting()` 未注册 | Weighting.cs | 添加事件注册（可选——或走独立触发路径） |
| 10 | `DJConfig.RaidEvents` 枚举无 GearExfil 条目 | Config.cs | 添加枚举值 |

### 边界情况

| # | 问题 | 修复方式 |
|---|------|----------|
| 11 | 玩家在箱子锁定前死亡/断线 | 死亡时自动发送箱内物品 |
| 12 | 玩家在箱子锁定后死亡/断线 | 物品已安全锁定，撤离后送达 |

---

## 五、三阶段实施计划

### 阶段 1: 概念验证（预计 1-2 天）

**目标**: 箱子能在游戏世界中生成、可交互、Lock() 生效、物品能送达

#### 1.1 修复 `_defaultJsonConverters`

**文件**: `ROPlugin/Helpers/Utils.cs`

在 `Utils` 类中添加初始化：
```csharp
private static readonly JsonConverter[] _defaultJsonConverters = new JsonConverter[0];
```

#### 1.2 重写容器生成逻辑

**文件**: `ROPlugin/Helpers/Utils.cs`

新增方法：
- `SpawnExfilCrate(Item crateItem, Player player)` — 手动加载 bundle、Instantiate 预制体、调用 Init
- 检查 `special_storage_crate.bundle` 加载后是否有 `LootableContainer` 组件
- 如无组件则回退到 `PoolManagerClass` 路径

#### 1.3 控制台测试命令

**文件**: `ROPlugin/Configs/ConsoleCommands.cs`

```csharp
// 取消注释
ConsoleScreen.Processor.RegisterCommand("DoGearExfil", new Action(Plugin.ECScript.DoGearExfilEvent));
```
（仅 Debug 模式启用）

#### 1.4 端到端测试流程

1. 进入战局 → 控制台执行 `DoGearExfil`
2. 验证箱子出现在玩家前方
3. 验证箱子可交互（打开/放入物品）
4. 验证 150 秒后箱子锁定
5. 验证撤离后物品出现在仓库

**阶段 1 退出标准**: 箱子可见 + 可交互 + Lock() 生效 + 物品送达成功

---

### 阶段 2: 功能集成（预计 2-3 天）

**目标**: 完整玩家触发流程（信号弹 → 箱子 → 锁定 → 送达）

#### 2.1 实现 `DoGearExfilEvent()`

**文件**: `ROPlugin/Controllers/EventController.cs`

```csharp
public async void DoGearExfilEvent()
{
    try
    {
        var token = this.destroyCancellationToken;
        if (_gearExfil) return;
        _gearExfil = true;

        // 1. 创建箱子物品
        var crateItem = Singleton<ItemFactoryClass>.Instance.CreateItem(
            MongoID.Generate(), Utils.ExfilCrate, null);
        
        // 2. 生成箱子到玩家前方
        Utils.SpawnExfilCrate(crateItem, ROPlayer);
        
        // 3. 通知
        NotificationManagerClass.DisplayMessageNotification(
            "撤离箱已部署！你有 2 分 30 秒存放战利品。",
            ENotificationDurationType.Long, ENotificationIconType.Default);
        
        // 4. 等待 150 秒
        await Task.Delay(150000, token);
        
        // 5. 锁定箱子
        var lootableContainer = /* 找到生成的容器 */;
        typeof(LootableContainer).GetMethod("Lock", 
            BindingFlags.Instance | BindingFlags.Public).Invoke(lootableContainer, null);
        
        NotificationManagerClass.DisplayMessageNotification(
            "撤离箱已锁定！物品已保管。撤离后将送达仓库。",
            ENotificationDurationType.Long, ENotificationIconType.Default);
        
        // 6. 发送物品
        Utils.SendExfilBox(lootableContainer);
        
        _gearExfil = false;
    }
    catch (Exception ex)
    {
        Plugin.Log.LogError($"[DoGearExfilEvent] failed: {ex}");
        _gearExfil = false;
    }
}
```

#### 2.2 修改 `FlareLogicExfil()` 添加分支

**文件**: `ROPlugin/Controllers/EventController.cs`

```csharp
public void FlareLogicExfil()
{
    var itemInHands = ROPlayer.HandsController.Item;
    
    if (itemInHands.TemplateId == Utils.SpecialExfilFlare)
    {
        DoGearExfilEvent();  // 装备撤离箱
    }
    else if (itemInHands.TemplateId == Utils.TrainFlare)
    {
        RunTrain();
    }
    else
    {
        DoPmcExfilEvent();  // PMC 紧急撤离（默认）
    }
}
```

#### 2.3 修复 Fika 接收端

**文件**: `ROPackets/Components/FikaComponent.cs`

将第 178-181 行的仅通知逻辑改为调用 `Plugin.ECScript.DoGearExfilEvent()`

#### 2.4 配置集成

- `Config.cs`: 添加 `GearExfil = 32768` 到 `RaidEvents` 枚举
- `EventWeightings.json`: 添加 GearExfil 条目（权重 0，仅手动触发）
- `ConsoleCommands.cs`: 添加 `DoGearExfil` 命令（Debug 模式）

**阶段 2 退出标准**: 完整玩家触发流程通过 5 次测试

---

### 阶段 3: 生产加固（预计 2-3 天）

**目标**: 边界情况处理、配置完善、共存测试

#### 3.1 死亡/断线处理

- 玩家死亡时自动调用 `SendExfilBox()` 发送已锁定的箱内物品
- 添加箱子状态持久化（防止加载存档时状态丢失）

#### 3.2 Fika 完整同步

- 添加专用网络包类型 `GearExfilSyncPacket`
- 同步箱子位置和锁定状态到所有客户端

#### 3.3 与现有功能共存测试

- PMC 撤离信号弹 + 装备撤离箱 同时使用
- 空投事件 + 装备撤离箱 同时使用
- 撤离封锁期间使用装备撤离箱
- 地图限制测试（工厂/实验室/沙盒是否应禁用）

#### 3.4 本地化

所有新增通知文本添加中英文本地化条目

**阶段 3 退出标准**: 所有边界情况测试通过 + Fika 多人测试通过

---

## 六、风险缓解策略

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| `PoolManagerClass.CreateLootPrefab` 对容器类型返回 null | 中 | 高 | 阶段 1 先测试；失败则用 `AssetBundle.LoadFromFile` + `Instantiate` |
| LootableContainer 交互失败 | 低 | 高 | 验证 `Init(TraderControllerClass)` 传参正确性 |
| Fika 同步包导致客户端崩溃 | 低 | 中 | 阶段 3 单独测试，使用 try-catch 包裹 |
| 与原版撤离信号弹功能冲突 | 低 | 中 | `_gearExfil` 独立守卫标志 |

---

## 七、涉及文件清单

### 修改文件

| 文件 | 阶段 | 改动类型 |
|------|------|----------|
| `ROPlugin/Helpers/Utils.cs` | 1 | 修复 `_defaultJsonConverters` + 新增 `SpawnExfilCrate()` + 添加 `ExfilCrate` 常量 |
| `ROPlugin/Controllers/EventController.cs` | 2 | 新增 `DoGearExfilEvent()` + 修改 `FlareLogicExfil()` |
| `ROPlugin/Configs/ConsoleCommands.cs` | 1 | 取消注释 `DoGearExfil` |
| `ROPlugin/Configs/Config.cs` | 2 | 添加 `GearExfil` 枚举值 |
| `ROPackets/Components/FikaComponent.cs` | 2 | 修复 GearExfil 接收端 |
| `RaidOverhaul/db/EventWeightings.json` | 2 | 添加 GearExfil 权重 |

### 无需修改的现有文件（资产完好）

| 文件 | 说明 |
|------|------|
| `RaidOverhaul/db/ItemGen/Cases/SpecialMilitaryCrate.json` | 箱子定义 (20x14) |
| `RaidOverhaul/db/ItemGen/ConstItems/SpecialExfilFlare.json` | 信号弹定义 |
| `RaidOverhaul/bundles.json` | Bundle 引用 |
| `ROPlugin/Fika/FikaBridge.cs` | 事件桥接 |
| `ROPlugin/Helpers/Weighting.cs` | 加权事件（可选集成） |

---

> **议会最终批示**: "从阶段 1 开始——先确保箱子能在地面上露面，再谈撤离后的快递业务。"  
> **Vault-Tec**: *Preparing for the Future!*
