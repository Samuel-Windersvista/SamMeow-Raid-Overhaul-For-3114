# 武器数据诊断报告 -- Judge & Executioner 不可用原因分析

> 调查范围: `RaidOverhaul\db\ItemGen\Weapons\Judge.json` + `Executioner.json`
> 对比基准: `Jury.json`（工作正常的武器）
> 调查时间: 2026-06-02

---

## 调查结论摘要

| 武器 | 状态 | 根因分析 |
|---|---|---|
| Jury | 正常 | 克隆自 SPEAR（弹匣式DMR），架构完全兼容 |
| Judge | 不可用 | **弹药口径覆盖可能无效** + 弹匣克隆目标类型不匹配 |
| Executioner | 不可用 | **弹匣槽位索引错误** + M700内部弹匣架构不兼容 |

---

## 一、Judge 诊断

### 1.1 基础数据

```
Clone源:   PISTOL_GLOCK_17 (Glock 17, 9x19口径)
期望口径:  Caliber1143x23ACP (.45 ACP)
描述口径:  "12 gauge shotgun shells" (霰弹!)

三者互相矛盾！
```

| 字段 | 值 | 问题 |
|---|---|---|
| `ItemToClone` | `PISTOL_GLOCK_17` | 9x19口径手枪 |
| `ammoCaliber` | `Caliber1143x23ACP` | 重写为.45 ACP |
| 描述文本 | "12 gauge shotgun shells" | 与实际口径不符（应该是.45 ACP） |
| `defAmmo` | `5efb0cabfb3e451d70735af5` | 指向一把基游戏.45 ACP弹药 |

### 1.2 弹药链分析

Judge的弹膛过滤器中引用了3个自定义弹药ID：
- `66280a30d3b6f288cb6b9653` → 克隆自 `AMMO_12G_MAGNUM`（12号霰弹！），覆盖口径 `Caliber1143x23ACP`
- `662809f445b5ff428e21ac0a` → 克隆自 `AMMO_12G_AP20`（12号AP弹！），覆盖口径 `Caliber1143x23ACP`
- `662808ec26a8e83120bb25fe` → 克隆自 `AMMO_12G_FLECHETTE`（12号箭弹！），覆盖口径 `Caliber1143x23ACP`

这三个弹药都从**12号霰弹**克隆而来，这在EFT的弹道系统中有严重问题。

### 1.3 弹匣链分析

| 弹匣ID | 克隆自 | 容量 | 过滤器设置 |
|---|---|---|---|
| `Judge17Rd` | `MAGAZINE_9X19_GLOCK_9X19_17RND` | 17发 | 3个自定义.45ACP弹药 |
| `Judge33Rd` | `MAGAZINE_9X19_BIG_STICK_33RND` | 33发 | 同上 |
| `Judge50Rd` | `MAGAZINE_9X19_G_SGMT_50RND` | 50发 | 同上 |

弹匣克隆自 **9x19 Glock弹匣**，但填充的是 **.45 ACP自定义弹药**。

### 1.4 槽位映射（SlotGenerator）

```typescript
// Judge 使用 Glock 17 的槽位布局: Slot[2]=滑套, Slot[3]=弹匣
items[CustomMap.Judge]._props.Slots[3]._props.filters[0].Filter = [Judge17Rd, Judge33Rd, Judge50Rd];
items[CustomMap.Judge]._props.Slots[2]._props.filters[0].Filter = [JudgeSlide];
```

槽位映射看起来正确（Glock的弹匣槽确实是Slot[3]）。

### 1.5 可能根因（按可能性排序）

**根因A（最可能）：`ammoCaliber` 属性名无效**

SPT的 `customItem.createItemFromClone()` 使用 `overrideProperties` 深度合并到克隆物品的 `_props` 中。`ammoCaliber` 可能不是正确的属性名。
- 检查方式：查看SPT源码中武器Template上的实际属性名是否为 `Caliber`、`AmmoCaliber` 或其他
- 如果属性名不匹配，覆盖会静默失败 → 武器仍然是 9x19 口径
- 9x19口径的武器 + .45 ACP弹药过滤器 = 弹药永远不匹配 → 武器无法开火

**根因B：.45 ACP弹药不支持弹匣供弹**

EFT中.45 ACP武器（如UMP、Vector .45、1911）的弹药系统与12号霰弹克隆而来的自定义弹药可能不兼容。虽然覆盖了Caliber字段，但弹药模板中的其他属性（如弹丸数量、散布模式）可能仍保留12号霰弹的特性。

**根因C：12G霰弹克隆弹药与原口径冲突**

从 `AMMO_12G_*` 克隆的弹药可能保留了12号口径的内部数据结构，即使覆盖了 `Caliber` 字段。EFT在检查武器/弹药兼容性时可能还检查了其他属性（如 `ammoAccurusy`、`InitialSpeed` 等），这些值对于.45 ACP来说可能不在有效范围内。

**根因D（低可能）：弹匣与弹药口径不匹配**

弹匣克隆自9x19 Glock弹匣，其内部的 `Cartridges` 过滤器虽然设置为接受自定义.45 ACP弹药，但弹匣本身可能仍继承了9x19 Glock弹匣的其他限制。

### 1.6 推荐修复方案

**方案A（推荐，最小改动）：修改 `ItemToClone` 为 .45 ACP 武器**

将武器克隆源从 Glock 17 改为 USP .45 或其他 .45 ACP 手枪：
```json
"ItemToClone": "PISTOL_USP_45"   // 或其他 .45 ACP 手枪
```
这样武器本身的口径就与弹药匹配，不需要依赖可能无效的 `ammoCaliber` 覆盖。

**方案B：修改弹药克隆源**

将弹药克隆源从12号霰弹改为基游戏的.45 ACP弹药（如 `.45 ACP AP` 或 `.45 ACP FMJ`）：
```json
"ItemToClone": "AMMO_45ACP_AP"   // 使用真实的 .45 ACP 弹药作为克隆源
```

**方案C：完整重构为霰弹手枪**

如果设计意图确实是"发射12号霰弹的手枪"（像真实的Taurus Judge），那么需要：
1. 将 `ItemToClone` 改为类似左轮手枪 `PISTOL_RHINO` 或使用弹膛系统的武器
2. `ammoCaliber` 改为 `Caliber12g`
3. 移除弹匣系统，改为弹膛填装（因为左轮/霰弹手枪不用弹匣）
4. 弹药克隆源保持12G霰弹不变

**建议**：先尝试方案A（换为.45 ACP手枪克隆源），这是最快且有最高成功率的修复。

---

## 二、Executioner 诊断

### 2.1 基础数据

```
Clone源:   SNIPERRIFLE_M700 (栓动步枪，内部弹仓)
期望口径:  Caliber762x51
弹药类型:  2个自定义7.62x51弹药（克隆自AMMO_127X108_B32/BZT44M覆盖为7.62x51）
弹匣:     3个5发可拆卸弹匣（Wyatt, AICS, PMAG）
```

### 2.2 M700槽位架构分析

M700是栓动步枪，在EFT中使用**内部弹仓**系统。与可拆卸弹匣武器不同：

| 武器类型 | 弹匣机制 | 槽位结构 |
|---|---|---|
| DMR (如SPEAR → Jury) | 可拆卸弹匣 | Slot[1]=mod_magazine |
| 手枪 (如Glock → Judge) | 可拆卸弹匣 | Slot[3]=mod_magazine |
| **栓动步枪 (M700 → Executioner)** | **内部弹仓** | Slot索引完全不同！ |

### 2.3 槽位映射问题

当前 SlotGenerator 代码：
```typescript
items[CustomMap.Exec]._props.Slots[0]._props.filters[0].Filter = [ExecAics, ExecPmag, ExecWyatt];
```

将弹匣过滤器注入 **Slot[0]**。但M700的Slot[0]大概率是 `mod_mount`（镜桥/镜座槽），不是 `mod_magazine`（弹匣槽）。

**这导致自定义弹匣被添加到错误的槽位上，永远无法装备到武器上。**

### 2.4 内部弹仓 vs 可拆卸弹匣

EFT的武器系统对内部弹仓和可拆卸弹匣有严格区分：
- 内部弹仓武器（M700, Mosin, SV-98等）：弹药直接装入枪膛/内部弹仓
- 可拆卸弹匣武器（DVL-10, M1A等）：弹匣可在槽位中替换

从M700克隆的武器继承了内部弹仓架构。创建"可拆卸弹匣"并尝试装入内部弹仓槽位会失败，因为：
1. 弹匣槽位的 `_required` 属性不同
2. 弹匣兼容性由 `_props.filters` 决定，但槽位本身可能不接受外部弹匣物品

### 2.5 `defMagType` 属性问题

Executioner设置了 `"defMagType": "6628f973b21453a8afc0db68"`。与 `ammoCaliber` 类似，`defMagType` 也可能不是SPT `overrideProperties` 支持的正确属性名。

### 2.6 可能根因（按可能性排序）

**根因A（最可能 = 95%）：槽位索引错误**

Slot[0] 不是M700的弹匣槽。自定义弹匣被添加到了错误的槽位上。

**根因B：内部弹仓架构不兼容**

即使找到了正确的槽位索引，M700的内部弹仓可能不接受可拆卸弹匣物品类型。需要将M700的内部弹仓槽位重构为可拆卸弹匣槽位。

**根因C：弹药克隆源不匹配**

Executioner弹药从 `AMMO_127X108_B32`（12.7mm反器材弹药）克隆而来，覆盖口径为 `Caliber762x51`。与Judge相同的问题——从完全不相关的弹药类型克隆可能导致继承不兼容的属性。

### 2.7 推荐修复方案

**方案A（推荐）：将 `ItemToClone` 改为 DVL-10**

DVL-10 (`SNIPERRIFLE_DVL10`) 是一把使用**可拆卸弹匣**的栓动步枪：
```json
"ItemToClone": "SNIPERRIFLE_DVL10"
```
优势：
- 原生支持可拆卸弹匣
- 7.62x51 口径
- 消音器出厂即装

**方案B：修复槽位索引 + 弹药重构**

1. 通过调试确定M700当前正确的弹匣槽位索引
2. 将 SlotGenerator 中的 `Slots[0]` 改为正确的索引
3. 将弹药克隆源从12.7mm改为7.62x51弹药（如 `AMMO_762X51_M80`）
4. 验证 `defMagType` 是否被正确应用

**方案C：改为 DVL-10 克隆 + 保留M700外观**

如果对M700的外观有偏好，可以：
1. 克隆DVL-10作为功能基础（获得可拆卸弹匣支持）
2. 覆盖 `Prefab` 路径指向M700的3D模型（如果SPT支持）
3. 调整属性使其更像M700的手感

**推荐方案A**：最高成功率，最少的调试时间，功能上完全满足需求。

---

## 三、通用问题

### 3.1 弹药克隆源选择

所有自定义弹药都从"极端"弹药克隆（12G霰弹、12.7mm反器材），这增加了不兼容风险。建议：

| 当前克隆源 | 目标口径 | 建议克隆源 |
|---|---|---|
| AMMO_12G_FLECHETTE | .45 ACP | AMMO_45ACP_AP 或 AMMO_45ACP_FMJ |
| AMMO_12G_AP20 | .45 ACP | 同上 |
| AMMO_12G_MAGNUM | .45 ACP | 同上 |
| AMMO_127X108_B32 | 7.62x51 | AMMO_762X51_M80 或 AMMO_762X51_M61 |
| AMMO_127X108_BZT44M | 7.62x51 | 同上 |

### 3.2 overrideProperties 属性名验证

`ammoCaliber` 和 `defMagType` 等属性名需要在SPT的 `createItemFromClone` 源码中验证。如果属性名不匹配，覆盖会静默失败。

---

## 四、推荐的修复优先级

1. **Executioner**：改为 `ItemToClone: "SNIPERRIFLE_DVL10"` → 即日修复
2. **Judge**：改为 `ItemToClone: "PISTOL_USP_45"` 或基游戏 .45 ACP 手枪 → 即日修复
3. **弹药**：将弹药克隆源改为同口径基游戏弹药 → 后续优化
4. **描述文本**：修正Judge的描述以反映实际口径 → 连带修复
