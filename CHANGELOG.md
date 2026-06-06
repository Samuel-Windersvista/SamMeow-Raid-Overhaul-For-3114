# Changelog

## v2.7.2 (2026-06-02) - 社区优化版

### 严重Bug修复
- **崩溃**: 修复 `DoorController` 中3处数组越界（`random.Next(arr.Length + 1)` → `random.Next(arr.Length)`），可能导致 IndexOutOfRangeException 崩溃
- **崩溃**: 修复 `DoSkillEvent` 无限递归风险，改为有界重试循环（最大20次），避免所有技能锁定时 StackOverflow
- **逻辑错误**: 修复 `DoKUnlock` else分支删错数组（`_door` → `_kdoor`），避免门锁事件数据污染
- **逻辑错误**: 修复 `DoBlackoutEvent` 条件判断（`||` → `&&`，`>=0` → `>0`），避免对空数组执行无效操作

### 数据安全修复
- **全局数据污染**: 为 `DoMalfEvent`、`DoBerserkEvent`、`DoWeightEvent` 添加 try-finally 保护，确保共享ItemTemplate的修改在异常、MonoBehaviour销毁、事件取消时一定恢复原始值
- **KeyPatch保护**: 万能钥匙 KeyId 临时替换添加 try-finally，避免 `method_0()` 抛异常导致门的钥匙要求永久被改写

### 游戏逻辑修复
- **代谢事件**: 铁胃效果改为15分钟后自动恢复（原为永久禁用整个突袭的饥饿/口渴）
- **购物狂欢**: 声望改为真正的最大值 `6.0f`（原为简单 `+1`/`-1`，效果与名称不符）
- **季节进度**: 进度文件从全局共享改为按 Profile ID 分文件（每个存档独立季节进度）
- **撤离封锁**: 锁定时长与提示文本一致（修正为15分钟）

### EventController稳定性增强
- 15个事件方法添加 try-catch 全局错误边界，单事件异常不再导致整个事件系统停摆
- 10个 async void 方法添加 `CancellationToken`（`destroyCancellationToken`），避免 GameObject 销毁后继续执行导致 NullReferenceException

### 性能优化
- **EventController.Update**: FindObjectsOfType 添加30帧延迟懒加载，避免场景未就绪时每帧重复执行昂贵的 Unity 搜索
- **DoorController**: 将 `T[]` 数组改为 `List<T>`，删除 O(n) 自定义 RemoveAt 方法（Streets 200+门的场景性能显著改善）
- **KeyPatch.HasKey**: 从 `GetAllItems()`（全库存递归遍历）改为 `GetAllSlots()`（仅槽位级遍历）
- **Weighting**: 添加静态 `Random _rng` 替代 `new Random()`，避免高频调用时重复种子

### 代码质量
- **LegionController**: 7层嵌套 if-else 拆分为 `handleReputationLogic` + `handleBossSpawnLogic` 两个独立方法
- **RaidController**: 8组标间坐标魔数提取为 `MARKED_ROOM_BOUNDS` 常量 + `isInBounds` 辅助函数
- **KeycardPatch**: 从完全替换 Prefix 改为条件 Hybrid Prefix，非 VIP 钥匙走原始方法，降低游戏更新时断裂风险
- **swagPatch**: 添加 SWAG 配置文件存在性检查和独立写入错误处理
- 删除 `LegionController.ts` 中的空语句 `swagBossConfig;`（遗留调试代码）

### 武器数据修复
- **Executioner**: 克隆源 M700→AXMC(.338栓动)、口径 7.62mm→12.7mm反器材、弹药移除错误口径覆盖
- **Judge**: 克隆源 Glock 17→Saiga-12(12号霰弹)、口径 .45ACP→12G、弹匣克隆源改为 Saiga 系列、移除全自动模式
- 所有自定义弹药移除与克隆源冲突的错误口径覆盖

### 本地化
- 全部46处战局内事件通知文本汉化为中文
- 万能钥匙交互菜单文本汉化

### 新功能：事件中途提醒
为所有持续时间事件添加中途提醒和即将结束提醒通知：
- 停电: 5分钟 / 1分钟前
- 武器故障: 2.5分钟 / 即将结束
- 狂暴: 1.5分钟 / 30秒前
- 负重: 1.5分钟 / 30秒前
- 购物狂欢: 5分钟 / 1分钟前
- 撤离封锁: 7.5分钟 / 1分钟前
- 炮击: 10秒前预警
- 铁胃代谢: 7.5分钟 / 1分钟前
- 火车: 3.5分钟前
- PMC撤离: 1分钟到达提醒

---

> 本项目原始作者: DJLang | 此版本为社区优化迭代
> 兼容 SPT 3.11.4 | 需游戏环境编译 C# 客户端插件
