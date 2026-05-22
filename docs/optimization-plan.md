# RaidOverhaul 优化实施计划

> 基于完整代码审查的诊断结果。按优先级分为三个阶段。

---

## 严重Bug（Critical -- 会导致崩溃或数据损坏）

### [C1] DoSkillEvent 无限递归风险

**文件**: `ROPlugin/Controllers/EventController.cs:382`

```csharp
if (selectedSkill.Locked == true) { DoSkillEvent(); }; // 递归
```

如果所有技能都被锁定（极端情况或无技能存在），`DoSkillEvent` 会无限递归直到 StackOverflowException 崩溃。

### [C2] 数组越界（3处）

**文件**: `ROPlugin/Controllers/DoorController.cs:102,135,185`

```csharp
int selection = random.Next(_switchs.Length + 1); // 产生 0..Length（含），最大有效索引是 Length-1
Switch _switch = _switchs[selection];             // IndexOutOfRangeException
```

同样的 off-by-one 在 `DoUnlock:135` 和 `DoKUnlock:185`。

### [C3] 共享 ItemTemplate 直接修改（数据污染）

**文件**: `ROPlugin/Controllers/EventController.cs:491-493, 642-646, 713, 730, 752, 769`

```csharp
weapon.Template.BaseMalfunctionChance = ...; // 修改了全局共享的Template实例！
```

在Unity/EFT中，`Item.Template` 是静态数据表，所有同类型物品共享同一个实例。修改后：
- 仓库中同类型武器也被影响
- 其他玩家/Bot的同类型武器也被影响
- 事件结束后无法可靠恢复（多事件并发、共享实例问题）

这是本模组最严重的设计缺陷。

### [C4] WeightEvent恢复逻辑不可靠

**文件**: `ROPlugin/Controllers/EventController.cs:748-753`

结合C3的Template共享问题，恢复逻辑通过 `* 2` 和 `* 0.5` 互相抵消看似正确，但在Template被其他事件/玩家并发修改时会产生累积误差。

### [C5] DoKUnlock else分支删错数组

**文件**: `ROPlugin/Controllers/DoorController.cs:203`

```csharp
else
{
    RemoveAt(ref _door, selection); // BUG: 应该是 _kdoor，不是 _door
}
```

### [C6] swagBossConfig空语句

**文件**: `RaidOverhaul/src/controllers/LegionController.ts:252`

```typescript
swagBossConfig; // 什么都不做，遗留调试代码
```

---

## 中等Bug（Medium -- 影响游戏体验但不崩溃）

### [M1] DoBlackoutEvent 条件判断错误

**文件**: `ROPlugin/Controllers/EventController.cs:336`

```csharp
if (_keydoor != null || _keydoor.Length >= 0)
// || 应为 &&，且 Length>=0 永远为真
```

### [M2] DoDamageEvent 硬编码左手骨折

**文件**: `ROPlugin/Controllers/EventController.cs:237`

```csharp
ROPlayer.ActiveHealthController.DoFracture(EBodyPart.LeftArm); // 应该随机身体部位
```

### [M3] DoMetabolismEvent 禁用后无恢复

**文件**: `ROPlugin/Controllers/EventController.cs:422`

`DisableMetabolism()` 调用后永远不会被重新启用，整个突袭期间饥饿/口渴条冻结。

### [M4] ShoppingSpree声望逻辑名不副实

**文件**: `ROPlugin/Controllers/EventController.cs:788-896`

声望只是 `+1` 和 `-1`，并不是真正"全满级"。如果玩家原有声望已高，+1没有意义。应存储原始声望值，设为最大值，事件结束后恢复。

### [M5] 季节进度文件全局共享

**文件**: `RaidOverhaul/src/routers/StaticRouterHooks.ts:191-198`

```typescript
const seasonsProgressionLoc = `${modLoc}/src/utils/data/seasonsProgressionFile.json5`;
```

所有Profile共享同一个季节进度文件，每个存档应有独立的进度。

### [M6] async void 无取消令牌

**文件**: `ROPlugin/Controllers/EventController.cs`（多个方法）

`DoBlackoutEvent`, `DoBerserkEvent`, `DoWeightEvent`, `DoLockDownEvent` 等使用 `async void` + `await Task.Delay()`，在GameObject销毁后继续执行可能导致NullReferenceException。

### [M7] Random实例频繁创建

**文件**: `ROPlugin/Helpers/Weighting.cs:29` 等

```csharp
int randomNum = new Random().Next(1, totalWeight + 1);
```

高频调用下 `new Random()` 使用相同系统时钟种子，导致"随机"值重复。

### [M8] SharedSeasonFile across profiles

**文件**: `RaidOverhaul/src/routers/StaticRouterHooks.ts:191-198`

季节进度文件路径使用 `__dirname`，在 ts-node 热重载下路径可能漂移。

---

## 性能问题（Performance）

### [P1] Update中反复调用 FindObjectsOfType

**文件**: `ROPlugin/Controllers/EventController.cs:121-133`

每帧检查null然后调用昂贵的 `FindObjectsOfType`。即使查过一次后不再查，但初始化前每帧都在执行。

**影响**: 突袭加载阶段的帧率下降。

### [P2] 数组O(n)位移删除

**文件**: `ROPlugin/Controllers/DoorController.cs:286-297`

`RemoveAt` 每次O(n)位移。门数量多的地图（如Streets有200+门）显著受影响。 `List<T>` 或 `HashSet` 更优。

### [P3] HasKey每次枚举全物品

**文件**: `ROPlugin/Patches/KeyPatch.cs:53`

```csharp
return Singleton<GameWorld>.Instance.MainPlayer.Profile.Inventory.Equipment.GetAllItems()
    .Any(x => x.TemplateId == keyId);
```

每次打开门锁交互菜单遍历所有物品。应缓存为 `HashSet<string>`，在背包变化时更新。

### [P4] 标间坐标遍历全图

**文件**: `RaidOverhaul/src/controllers/RaidController.ts:125-202`

4个地图、8组硬编码坐标、遍历全图战利品点。坐标匹配效率低且极度脆弱。

### [P5] 尸体清理无对象池

**文件**: `ROPlugin/Patches/BodyCleanup.cs`

直接 `SetActive(false)` 而非对象池，造成频繁GC。

---

## 架构问题（Architecture）

### [A1] 无错误边界

**文件**: `ROPlugin/Controllers/EventController.cs`

任何未捕获异常直接终止MonoBehaviour，整场突袭事件系统停摆。

### [A2] KeycardPatch完全替换方法

**文件**: `ROPlugin/Patches/KeycardPatch.cs`

Prefix完全替代 `UnlockOperation` 而非Postfix/Transpiler。BSG/SPT更新时100%断裂。

### [A3] swagPatch直接写入其他模组文件

**文件**: `RaidOverhaul/src/controllers/LegionController.ts:182-259`

直接读写SWAG的配置文件，有文件锁冲突风险且侵犯数据完整性。

### [A4] 魔王嵌套if（7层）

**文件**: `RaidOverhaul/src/controllers/LegionController.ts:418-507`

`/client/match/local/end` 处理器有7层嵌套条件，难以阅读和维护。

### [A5] 硬编码坐标魔数

**文件**: `RaidOverhaul/src/controllers/RaidController.ts:125-202`

8组精确坐标用于识别标间位置，无注释说明。地图更新即静默失效。

### [A6] KeyPatch临时修改door.KeyId

**文件**: `ROPlugin/Patches/KeyPatch.cs:40-43`

```csharp
door.KeyId = Utils.SkeletonKey;
doorUnlockClass.method_0();
door.KeyId = originalKey; // 如果 method_0() 抛异常，KeyId永久被污染
```

---

---

## 第一阶段：紧急修复（预计 3-5 小时）

### 1. 修复数组越界 [C2]

**文件**: `ROPlugin/Controllers/DoorController.cs`

3处 `random.Next(array.Length + 1)` 改为 `random.Next(array.Length)`。如果数组长度为0则提前返回。

**代码变更**:
- `PowerOn:102`: `random.Next(_switchs.Length + 1)` -> `random.Next(_switchs.Length)`
- `DoUnlock:135`: `random.Next(_door.Length + 1)` -> `random.Next(_door.Length)`
- `DoKUnlock:185`: `random.Next(_kdoor.Length + 1)` -> `random.Next(_kdoor.Length)`

同时添加空数组检查。

### 2. 修复无限递归 [C1]

**文件**: `ROPlugin/Controllers/EventController.cs:382`

将递归改为带最大重试的while循环：

```csharp
int maxRetries = 20;
while (selectedSkill.Locked == true && maxRetries-- > 0)
{
    selectedSkill = ROSkillManager.DisplayList.RandomElement();
}
if (selectedSkill.Locked == true) return; // 放弃，避免无限循环
```

### 3. 修复DoKUnlock删错数组 [C5]

**文件**: `ROPlugin/Controllers/DoorController.cs:201-204`

```csharp
RemoveAt(ref _kdoor, selection); // 不是 _door
```

### 4. 修复DoBlackoutEvent条件 [M1]

**文件**: `ROPlugin/Controllers/EventController.cs:336`

```csharp
if (_keydoor != null && _keydoor.Length > 0)
```

### 5. 修复swagBossConfig空语句 [C6]

**文件**: `RaidOverhaul/src/controllers/LegionController.ts:252`

直接删除该行。

### 6. 添加空数组检查（防御性）

在 `DoorController.DoUnlock`、`DoorController.DoKUnlock`、`DoorController.PowerOn` 开头添加：

```csharp
if (_door == null || _door.Length == 0) return;
```

---

## 第二阶段：稳定性加强（预计 4-6 小时）

### 1. 全局错误边界 [A1]

**文件**: `ROPlugin/Controllers/EventController.cs`

为所有公开事件方法添加try-catch，并在异常时恢复事件循环：

```csharp
public void DoHealPlayer()
{
    try
    {
        // 原有逻辑
    }
    catch (Exception ex)
    {
        Plugin.Log.LogError($"Heal event failed: {ex}");
        _eventIsRunning = false; // 确保事件循环能继续
    }
}
```

所有15个事件方法都需要加。

### 2. async void添加取消令牌 [M6]

**文件**: `ROPlugin/Controllers/EventController.cs`

```csharp
public async void DoLockDownEvent()
{
    var token = this.destroyCancellationToken;
    // ...
    await Task.Delay(600000, token);
    if (token.IsCancellationRequested) return;
    // 恢复逻辑
}
```

涉及方法：`DoBlackoutEvent`、`DoBerserkEvent`、`DoWeightEvent`、`DoLockDownEvent`。

### 3. 代谢事件恢复机制 [M3]

**文件**: `ROPlugin/Controllers/EventController.cs`

改变策略：不永久禁用代谢，而是记录原始速率，定时（如15分钟后）恢复：

```csharp
if (!_metabolismDisabled)
{
    float originalEnergyRate = ROPlayer.ActiveHealthController.EnergyRate;
    float originalHydrationRate = ROPlayer.ActiveHealthController.HydrationRate;
    // ... 修改速率 ...
    _metabolismEventActive = true;
    
    // 启动定时恢复协程
    StartCoroutine(RestoreMetabolismAfterDelay(originalEnergyRate, originalHydrationRate, 900f));
}
```

### 4. 季节进度文件按Profile分文件 [M5][M8]

**文件**: `RaidOverhaul/src/routers/StaticRouterHooks.ts:191-198`

```typescript
const profileId = info.uid;
const seasonsProgressionLoc = path.join(modLoc, "config", "profiles", profileId, "seasonsProgression.json5");
```

### 5. ShoppingSpree存储原始声望 [M4]

**文件**: `ROPlugin/Controllers/EventController.cs:788-896`

事件开始时存储每个商人的原始声望到临时数据结构，事件结束时恢复：

```csharp
private Dictionary<string, float> _originalStandings = new Dictionary<string, float>();

// 开始事件
foreach (var trader in Traders)
{
    _originalStandings[trader] = Session.Profile.TradersInfo[trader].Standing;
    Session.Profile.TradersInfo[trader].SetStanding(6.0f); // 真正设为最大
}

// 结束事件
foreach (var kvp in _originalStandings)
{
    Session.Profile.TradersInfo[kvp.Key].SetStanding(kvp.Value);
}
```

### 6. KeyPatch临时KeyId加保护 [A6]

**文件**: `ROPlugin/Patches/KeyPatch.cs:40-43`

```csharp
var originalKey = door.KeyId;
try
{
    door.KeyId = Utils.SkeletonKey;
    doorUnlockClass.key = owner.GetKey(door);
    doorUnlockClass.method_0();
}
finally
{
    door.KeyId = originalKey; // 确保恢复
}
```

---

## 第三阶段：架构优化（预计 8-12 小时）

### 1. Template共享修改重构（核心）[C3][C4]

当前直接修改Template的做法是整个模组最危险的模式。推荐方案如下：

**推荐方案A：Harmony Transpiler（最佳）**

在访问 `WeaponTemplate` 属性的方法中注入乘数检查，而非修改对象本身。

**实现步骤**:
1. 创建 `WeaponStatOverrides` 静态字典，key为TemplateId，value为覆盖值
2. 为每个需要修改的属性（`BaseMalfunctionChance`, `DurabilityBurnRatio`, `Ergonomics`, `BaseOverweightLimits`等）编写Transpiler补丁
3. Transpiler在IL层面：`ldfld` 属性 -> 检查 `WeaponStatOverrides` 字典 -> 有则用覆盖值，无则用原值
4. 事件开始时 `WeaponStatOverrides[templateId] = modifier`，结束时删除

**推荐方案B：事件驱动覆盖层（次选）**

类似方案A但使用Harmony Postfix而不是Transpiler，复杂度略低但覆盖范围可能不全。

**涉及文件重写**: `DoMalfEvent`、`DoBerserkEvent`、`DoWeightEvent` 的整个Template访问逻辑。

### 2. KeycardPatch改为Postfix [A2]

**文件**: `ROPlugin/Patches/KeycardPatch.cs`

不使用Prefix完全替换方法，改为：
1. 保留原有方法逻辑
2. 添加Postfix，在检查 `key.Template.KeyId` 时加入 `Utils.VipKeycard` 的额外检查
3. 这样BSG更新方法签名时断裂风险大幅降低

### 3. 重构LegionController条件地狱 [A4]

**文件**: `RaidOverhaul/src/controllers/LegionController.ts:418-507`

拆分为独立方法：

```typescript
private async handleRaidEnd(url, info, sessionId, output): Promise<any> {
    const level = this.utils.checkProfileLevel(LegionController.profileId);
    const isLowLevel = level != null && level < 10;
    const useReqShop = this.configManager.modConfig().EnableRequisitionOffice;
    const useBoss = this.configManager.modConfig().EnableCustomBoss;
    
    this.handleReputation(info, sessionId, isLowLevel, useReqShop, useBoss);
    this.handleBossSpawn(info, isLowLevel, useBoss);
    return Promise.resolve(output);
}

private handleReputation(info, sessionId, isLowLevel, useReqShop, useBoss) {
    // 提取声望逻辑 ~50行
}

private handleBossSpawn(info, isLowLevel, useBoss) {
    // 提取Boss刷怪逻辑 ~30行
}
```

### 4. 魔数提取为常量 [A5]

**文件**: `RaidOverhaul/src/controllers/RaidController.ts`

```typescript
// 标间坐标定义（工厂模式提取）
const MARKED_ROOM_BOUNDS = {
    customs: {
        zone: { xMin: 180, xMax: 185, yMin: 6, yMax: 7, zMin: 180, zMax: 185 }
    },
    reserve: [
        { xMin: -125, xMax: -120, yMin: -15, yMax: -14, zMin: 25, zMax: 30 },
        { xMin: -155, xMax: -150, yMin: -9, yMax: -8, zMin: 70, zMax: 75 },
        { xMin: 190, xMax: 195, yMin: -6, yMax: -5, zMin: -230, zMax: -225 }
    ],
    streets: [
        { xMin: -133, xMax: -129, yMin: 8.5, yMax: 11, zMin: 265, zMax: 275 },
        { xMin: 186, xMax: 191, yMin: -0.5, yMax: 1.5, zMin: 224, zMax: 229 }
    ],
    lighthouse: [
        { xMin: 319, xMax: 330, yMin: 5, yMax: 6.5, zMin: 482, zMax: 489 }
    ]
};
```

同时添加地图版本验证日志，便于追踪标间坐标是否仍然有效。

### 5. 性能热点优化

| 优化项 | 文件 | 方法 |
|---|---|---|
| Update中FindObjectsOfType [P1] | EventController.cs | 改用Awake/Start初始化，或懒加载+标志位 |
| 数组RemoveAt [P2] | DoorController.cs | `T[]` 改为 `List<T>` |
| HasKey全枚举 [P3] | KeyPatch.cs | 缓存 `HashSet<string>`，监听背包变化事件更新 |
| Random频繁创建 [M7] | Weighting.cs等 | 全局 `static readonly Random` |
| DoRandomEvent每次重排列表 | Weighting.cs | 一次性洗牌或直接使用累积权重查找（O(n)替代O(n log n)） |

### 6. swagPatch解耦 [A3]

**文件**: `RaidOverhaul/src/controllers/LegionController.ts:182-259`

- 写入前检查文件是否被占用（try with retry）
- 写入前验证JSON格式完整性
- 在模组卸载钩子（如 `RemoveFromSwag` 配置）中恢复原始SWAG配置
- 记录wal日志以便回滚

### 7. 尸体清理对象池化 [P5]

**文件**: `ROPlugin/Patches/BodyCleanup.cs`

将 `SetActive(false)` 改为将尸体对象引用加入 `Queue<GameObject>`，在新尸体生成时从池中取用（如果适用）。考虑到尸体不重复使用，至少应改为在非关键帧执行（`yield return null` 分帧处理）以避免单帧GC峰值。

---

## 附加：可选帧数优化

### 可选优化O1：RandomizeDefaultDoors合并随机调用

**文件**: `ROPlugin/Controllers/DoorController.cs:241-253`

当前每扇门调用两次 `Random.Range`，可以合并为一次：
```csharp
float roll = Random.Range(0f, 100f);
if (roll < 50 && door.DoorState == EDoorState.Shut) { /* open */ }
else if (roll < 75 && door.DoorState == EDoorState.Open) { /* 25% close */ }
```
注意这改变了行为（原来是两个独立50%），需评估是否可接受。

### 可选优化O2：LootChanges标间遍历缓存

**文件**: `RaidOverhaul/src/controllers/RaidController.ts:125-202`

对每个地图的标间坐标，首次匹配后缓存已匹配的spawnpoint索引列表，避免每次重启全量遍历。

---

## 实施建议

1. **先攻第一阶段**：6项修复可直接提交，不需要重新设计
2. **第二阶段**：需要一些重构但风险可控
3. **第三阶段核心是Template重构**：这是最大的工作量，但也是解决根本问题的唯一途径。建议在第二阶段验收后再启动。

---

> Vault-Tec提醒：本计划基于代码静态分析，部分运行时行为（如Template共享的实际影响范围）需在游戏中验证。欢迎Vault-Tec工程质量团队审阅后提出修改意见。
