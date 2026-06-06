# 武器修复+通知增强 -- 实施计划

> 基于 Overseer 确认的设计目标制定
> 2026-06-02

---

## 任务2: 武器修复

### 2.1 Judge -- 方案C: 霰弹手枪（12号口径半自动手枪）

**设计目标**: 发射12号霰弹的半自动手枪，使用可拆卸弹匣。

**当前问题**:
- 克隆自 Glock 17（9x19 手枪） -- 弹膛太小，物理上装不下12号霰弹
- `ammoCaliber` 设为了 `.45 ACP` -- 不是霰弹口径
- 弹匣克隆自 9x19 Glock弹匣 -- 不应该容纳霰弹
- 弹药虽然从12G霰弹克隆，但口径覆盖为 `.45 ACP` -- 口径错

**修复步骤**:

| 步骤 | 文件 | 操作 |
|---|---|---|
| 1 | `Judge.json` | 武器: `ItemToClone` 改为 `SHOTGUN_SAIGA12`（半自动12号霰弹，原生支持弹匣） |
| 2 | `Judge.json` | 武器: `ammoCaliber` 改为 `Caliber12g`（正确口径） |
| 3 | `Judge.json` | 武器: 保持 `defAmmo` 指向自定义弹药ID |
| 4 | `Judge.json` | 武器: `weapFireType` 移除或改为 `["single"]`（手枪化） |
| 5 | `Judge.json` | 武器: `HandbookParent` 保持 `Pistols`（分类仍为手枪） |
| 6 | `Ammo.json` | 3个弹药: 移除 `Caliber` 覆盖（不需要了，直接继承12G） |
| 7 | `Ammo.json` | 3个弹药: 保持 `Prefab` 覆盖（用.45 ACP的外观模型） |
| 8 | `SlotGenerator.ts` | Judge 的槽位索引可能需要微调（Saiga-12的弹匣槽位置与 Glock 不同） |
| 9 | `Judge.json` | 3个弹匣: `ItemToClone` 改为 Saiga 弹匣系列（`MAGAZINE_SAIGA12_5RND`、`MAGAZINE_SAIGA12_8RND`、`MAGAZINE_SAIGA12_10RND`、或鼓弹 `MAGAZINE_SAIGA12_20RND_DRUM`） |
| 10 | `Judge.json` | 弹匣容量保持 17/33/50（`_max_count` 覆盖属性） |
| 11 | `Judge.json` | 滑套/机匣配件: 评估是否保留（Saiga-12 的配件槽与 Glock 完全不同） |

**风险点**:
- Saiga-12 是长枪（步枪/霰弹枪类），`HandbookParent` 设为 `Pistols` 可能导致分类异常
- Saiga-12 的槽位布局与手枪完全不同：有枪托槽、护木槽等手枪不存在的槽位
- 需要在创建后移除多余槽位，或通过 `ConflictingItems` 屏蔽

**替代克隆源探讨**:

如果没有"12号口径手枪"，另一个思路：
- Clone from `PISTOL_SR1MP` 或 `PISTOL_P226` 等，**不覆盖口径**
- 改为让弹药 clone from `.45 ACP` 而非 12G（方案B的思路）
- 但用户明确说设计目标是"霰弹手枪"→ 12号口径是核心

**推荐实施路径**:
1. 先尝试 `ItemToClone: "SHOTGUN_SAIGA12"` + `ammoCaliber: "Caliber12g"` + 弹匣改 Saiga 系列
2. 如果槽位冲突太多，改为 `ItemToClone: "SHOTGUN_MP153"`（半自动、管式弹仓、无多余战术槽）
3. 弹匣系统通过 OverrideProperties 的 `Slots` 手动创建

**预估工时**: 2-3 小时（含测试调试）

---

### 2.2 Executioner -- 方案C: 12.7mm反器材栓动步枪

**设计目标**: 类似麦克米兰 TAC-50 的12.7mm反器材栓动步枪。

**当前问题**:
- 克隆自 M700（7.62x51 栓动） -- 口径太小
- `ammoCaliber` 覆盖为 `Caliber762x51` -- **与设计目标相反！应该是 `Caliber127x108`**
- 弹药克隆自 `AMMO_127X108_B32/BZT44M` -- 正确！这些是12.7mm反器材弹药
- 但弹药被覆盖为 `Caliber762x51` -- 口径与克隆源冲突
- 内部弹仓问题（M700不支持可拆卸弹匣）

**修复步骤**:

| 步骤 | 文件 | 操作 |
|---|---|---|
| 1 | `Executioner.json` | 武器: `ammoCaliber` 改为 `Caliber127x108`（匹配12.7mm弹药） |
| 2 | `Executioner.json` | 武器: 移除 `defMagType`（可能不是有效覆盖属性名）或验证其正确性 |
| 3 | `Ammo.json` | 2个弹药: 移除 `Caliber` 覆盖（已是12.7mm，不需要覆盖） |
| 4 | `SlotGenerator.ts` | Executioner 槽位索引从 `Slots[0]` 改为正确索引 |
| 5 | `Executioner.json` | 武器: 评估 `ItemToClone` 是否保持 M700 或换为更合适的栓动步枪 |

**关键问题 -- 弹匣槽位**: 

M700在EFT中的槽位结构需要实地验证。执行此步骤：
1. 写一个调试脚本，遍历 `tables.templates.items[M700_ID]._props.Slots` 找哪个槽是 `mod_magazine`
2. 或者直接改为克隆 `SNIPERRIFLE_AXMC`（.338 Lapua栓动，有可拆卸弹匣槽），更接近12.7mm反器材步枪的体量

**如果 M700 槽位索引无法确定**，改为克隆 `SNIPERRIFLE_AXMC`:
- AXMC 是 .338 Lapua 栓动步枪
- 原生支持可拆卸弹匣（5发/10发）
- 体积/重量/手感更接近反器材步枪
- 槽位结构与需求匹配
- `ammoCaliber` 覆盖为 `Caliber127x108`

**推荐实施路径**:
1. 先测试 M700 的弹匣槽位索引（通过 SP-调试输出或文档）
2. 如果找不到正确索引 → 换 `ItemToClone: "SNIPERRIFLE_AXMC"`
3. 修正 `ammoCaliber` 为 `Caliber127x108`
4. 弹匣保持现有克隆源（Wyatt/AICS/PMAG），容量5发不变
5. 弹药移除口径覆盖（已经是12.7mm）

**预估工时**: 1-2 小时

---

## 任务3: 通知增强 -- 第一阶段（中途提醒）

### 3.1 修改范围

仅修改一个文件: `ROPlugin/Controllers/EventController.cs`

### 3.2 需要添加提醒的事件

| 方法 | 持续时间 | 中途提醒时间 | 即将结束提醒 | Token已就绪 |
|---|---|---|---|---|
| `DoBlackoutEvent` | 10分钟 | 5分钟时 | 1分钟前 | 是 |
| `DoMalfEvent` | 5分钟 | 2.5分钟时 | 1分钟前 | 是 |
| `DoBerserkEvent` | 3分钟 | 1.5分钟时 | 30秒前 | 是 |
| `DoWeightEvent` | 3分钟 | 1.5分钟时 | 30秒前 | 是 |
| `DoMaxLLEvent` | 10分钟 | 5分钟时 | 1分钟前 | 是 |
| `DoLockDownEvent` | 15分钟 | 7.5分钟时 | 1分钟前 | 是 |
| `DoArtyEvent` | 30秒倒计时 | -- | 10秒前 | 是 |
| `RestoreMetabolism` | 15分钟 | 7.5分钟时 | 1分钟前 | 否（协程） |
| `RunTrain` | 7分钟 | 3.5分钟时 | -- | 是 |
| `DoPmcExfilEvent` | 2分钟 | 1分钟时 | -- | 是 |

### 3.3 实现模式

在每个 async void 方法中，在现有的 `await Task.Delay(totalDuration, token)` 之前插入中途提醒的 `Task.Delay` + 通知。模式如下：

```csharp
// 现有: 初始通知
Notify("XXX事件: ...");

// 新增: 中途提醒
await Task.Delay(midPointMs, token);
if (!token.IsCancellationRequested)
    Notify("XXX事件: 剩余X分钟");

// 新增: 即将结束提醒
await Task.Delay(remainingAfterMidPointMs, token);
if (!token.IsCancellationRequested)
    Notify("XXX事件: 即将结束!");

// 现有: 恢复逻辑
// await Task.Delay(endPointMs, token);
// ... restore ...
```

### 3.4 新增提示文本

| 事件 | 中途提醒 | 即将结束 |
|---|---|---|
| 停电 | `停电事件: 电力仍中断，剩余5分钟` | `停电事件: 电力将在1分钟后恢复` |
| 武器故障 | `武器故障事件: 武器仍不稳定，剩余2.5分钟` | `武器故障事件: 武器状态即将恢复正常` |
| 狂暴 | `狂暴事件: 你的愤怒仍在燃烧，剩余1.5分钟` | `狂暴事件: 30秒后恢复理智` |
| 负重 | `负重事件: 体重仍异常，剩余1.5分钟` | `负重事件: 30秒后恢复正常` |
| 购物狂欢 | `购物狂欢事件: 还有5分钟，抓紧采购！` | `购物狂欢事件: 1分钟后声望恢复，最后机会！` |
| 撤离封锁 | `撤离封锁事件: 撤离点仍关闭，剩余7.5分钟` | `撤离封锁事件: 1分钟后解除封锁，准备撤离！` |
| 炮击 | -- | `炮击事件: 10秒后开始炮击！快找掩体！` |
| 铁胃 | `代谢事件: 铁胃效果剩余7.5分钟` | `代谢事件: 铁胃效果将在1分钟后消退` |
| 火车 | `火车即将离站，剩余3.5分钟` | -- |
| PMC撤离 | `撤离支援: 还有1分钟到达` | -- |

### 3.5 预估工时

- 修改 10 个方法，每个 3-5 行代码: 1 小时
- 调整 `RestoreMetabolism` 协程支持提醒（需改为可用 `token` 的 async 模式）: 0.5 小时
- 编译验证: 0.5 小时
- **总计: 约 2 小时**

---

## 实施顺序建议

1. **先做 Executioner 修复**（最简单，1-2h）: 修正口径+槽位
2. **再做 Judge 修复**（较复杂，2-3h）: 克隆源切换+弹匣重建
3. **最后做通知增强**（相当独立，2h）
4. 全部完成后统一编译验证

总计工时: 约 5-7 小时

---

> 请审阅。确认后按此顺序实施。
