using EFT;
using EFT.UI;
using EFT.Interactive;
using EFT.HealthSystem;
using EFT.UI.Matchmaker;
using EFT.UI.BattleTimer;
using EFT.InventoryLogic;
using EFT.Communications;
using EFT.MovingPlatforms;
using SPT.Common.Http;
using JsonType;
using UnityEngine;
using UnityEngine.UI;
using HarmonyLib;
using Comfort.Common;
using CommonAssets.Scripts.Game;
using Newtonsoft.Json;
using System.Linq;
using System.Reflection;
using System.Collections;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using RaidOverhaul.Helpers;
using RaidOverhaul.Configs;
using RaidOverhaul.Patches;
using RaidOverhaul.Fika;


using static RaidOverhaul.Plugin;

namespace RaidOverhaul.Controllers
{
    public class EventController : MonoBehaviour
    {
        private bool _exfilUIChanged = false;
        private Dictionary<string, float> _originalStandings = new Dictionary<string, float>();

        private static bool _pmcExfilEventRunning = false;
        public static bool _eventIsRunning = false;
        public static bool _exfilLockdown;
        public static bool _gearExfil;
        private static LootableContainer _activeExfilCrate = null;
        private static float _lastAirspaceCheck = 0f;
        private static bool _airspaceOccupied = false;
        private static float _lastAirspaceWarningTime = 0f;
        private static int _airspaceWarningCount = 0;
        private static bool _airspaceClearShown = false;
        private bool _airdropDisabled = false;
        private bool _metabolismDisabled = false;
        private bool _jokeEventHasRun = false;
        private bool _airdropEventHasRun = false;
        private bool _berserkEventHasRun = false;
        private bool _malfEventHasRun = false;
        private bool _weightEventHasRun = false;
        private bool _artyEventHasRun = false;

        private int _skillEventCount = 0;
        private int _repairEventCount = 0;
        private int _healthEventCount = 0;
        private int _damageEventCount = 0;
        private int _maxLLEventCount = 0;
        private int _exfilEventCount = 0;

        public static int timeStart;
        public static int _mouseInputCountT = 0;
        public static int _mouseInputCountE = 0;

        private Switch[] _pswitchs = null;
        private KeycardDoor[] _keydoor = null;
        private LampController[] _lamp = null;
        private bool _objectsFound = false;
        private int _initFrameDelay = 30;

        public DamageInfoStruct Blunt { get; private set; }

        public EExfiltrationStatus AwaitsManualActivation { get; private set; }

        private class OriginalWeaponStatsBers
        {
            public float malfChance;
            public float duraBurn;
            public float ergo;
            public float recoilBack;
            public float recoilUp;
        }

        private class OriginalWeaponStatsMalf
        {
            public float malfChance;
            public float duraBurn;
            public float ergo;
        }

        private Dictionary<string, OriginalWeaponStatsBers> _originalWSBers = new Dictionary<string, OriginalWeaponStatsBers>();
        private Dictionary<string, OriginalWeaponStatsMalf> _originalWSMalf = new Dictionary<string, OriginalWeaponStatsMalf>();
        private IEnumerable<Item> _allWeapons => Session.Profile.Inventory.AllRealPlayerItems;

        void Update()
        {
            if (DJConfig.TimeChanges.Value)
            {
                RaidTime.inverted = MonoBehaviourSingleton<MenuUI>.Instance == null || MonoBehaviourSingleton<MenuUI>.Instance.MatchMakerSelectionLocationScreen == null
                ? RaidTime.inverted
                : !((EDateTime)typeof(MatchMakerSelectionLocationScreen).GetField("edateTime_0", BindingFlags.Instance | BindingFlags.NonPublic).GetValue(MonoBehaviourSingleton<MenuUI>.Instance.MatchMakerSelectionLocationScreen) == EDateTime.CURR);
            }

            if (!Ready() || !DJConfig.EnableEvents.Value)
            {
                // Reset Events
                if (_airdropDisabled != false)      { _airdropDisabled = false; }
                if (_metabolismDisabled != false)   { _metabolismDisabled = false; }
                if (_jokeEventHasRun != false)      { _jokeEventHasRun = false; }
                if (_airdropEventHasRun != false)   { _airdropEventHasRun = false; }
                if (_berserkEventHasRun != false)   { _berserkEventHasRun = false; }
                if (_malfEventHasRun != false)      { _malfEventHasRun = false; }
                if (_weightEventHasRun != false)    { _weightEventHasRun = false; }
                if (_artyEventHasRun != false)      { _artyEventHasRun = false; }

                if (_skillEventCount != 0)          { _skillEventCount = 0; }
                if (_repairEventCount != 0)         { _repairEventCount = 0; }
                if (_healthEventCount != 0)         { _healthEventCount = 0; }
                if (_damageEventCount != 0)         { _damageEventCount = 0; }
                if (_maxLLEventCount != 0)          { _maxLLEventCount = 0; }
                if (_exfilEventCount != 0)          { _exfilEventCount = 0; }

                return;
            }

            // Lazy init with frame delay to ensure scene is fully loaded
            if (_initFrameDelay > 0)
            {
                _initFrameDelay--;
                return;
            }

            if (!_objectsFound)
            {
                _pswitchs = FindObjectsOfType<Switch>();
                _keydoor = FindObjectsOfType<KeycardDoor>();
                _lamp = FindObjectsOfType<LampController>();
                _objectsFound = true;
            }


            if (!_eventIsRunning && FikaBridge.IAmHost())
            {
                StaticManager.Instance.StartCoroutine(StartEvents());

                _eventIsRunning = true;
            }

            if (EventExfilPatch.IsLockdown)
            {
                if (!_exfilUIChanged)
                {
                    ChangeExfilUI();
                }
            }

            if (Ready())
            {
                CheckForFlag();
                FlareLogicTrain();
                FlareLogicExfil();
            }
        }

        private IEnumerator StartEvents()
        {
            yield return new WaitForSeconds(UnityEngine.Random.Range(ConfigController.EventConfig.RandomEventRangeMinimumServer, ConfigController.EventConfig.RandomEventRangeMaximumServer) * 60f);

            if (Ready() && FikaBridge.IAmHost())
            {
                Weighting.DoRandomEvent(Weighting.weightedEvents);
            }

            else
            {
                _pswitchs = null;
                _keydoor = null;
                _lamp = null;
            }

            _eventIsRunning = false;
            yield break;
        }

        async void ChangeExfilUI()
        {
            if (EventExfilPatch.IsLockdown)
            {
                Color red = new Color(0.8113f, 0.0376f, 0.0714f, 0.8627f);
                Color green = new Color(0.4863f, 0.7176f, 0.0157f, 0.8627f);
                RectTransform mainDescription = (RectTransform)typeof(ExtractionTimersPanel).GetField("_mainDescription", BindingFlags.Instance | BindingFlags.NonPublic).GetValue(FindObjectOfType<ExtractionTimersPanel>());

                var text = mainDescription.gameObject.GetComponentInChildren<TMPro.TextMeshProUGUI>();
                var box = mainDescription.gameObject.GetComponentInChildren<Image>();

                text.text = EventExfilPatch.IsLockdown ? "Extraction unavailable" : "Find an extraction point";
                box.color = red;

                foreach (ExitTimerPanel panel in FindObjectsOfType<ExitTimerPanel>())
                    panel.enabled = false;

                _exfilUIChanged = true;

                while (EventExfilPatch.IsLockdown)
                    await Task.Yield();

                text.text = "Find an extraction point";
                box.color = green;

                foreach (ExitTimerPanel panel in FindObjectsOfType<ExitTimerPanel>())
                    panel.enabled = true;

                _exfilUIChanged = false;
            }
        }

        #region Core Events Controller

        public void DoHealPlayer()
        {
            try
            {
                if (_healthEventCount >= 2) { return; }

                if (FikaBridge.IAmHost()) { FikaBridge.SendRandomEventPacket(Utils.Heal); }

                NotificationManagerClass.DisplayMessageNotification("治愈事件: 站起来，你还没死。", ENotificationDurationType.Long, ENotificationIconType.Default);
                ROPlayer.ActiveHealthController.RestoreFullHealth();
                _healthEventCount++;

                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole("Heal Event has run");
                }
            }
            catch (Exception ex)
            {
                Plugin.Log.LogError($"[DoHealPlayer] event failed: {ex}");
                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole($"[DoHealPlayer] event exception: {ex.Message}");
                }
            }
        }

        public void DoDamageEvent()
        {
            try
            {
                if (_damageEventCount >= 1) { return; }

                if (FikaBridge.IAmHost()) { FikaBridge.SendRandomEventPacket(Utils.Damage); }

                NotificationManagerClass.DisplayMessageNotification("心脏骤停事件: 赶紧找医生，你撑不了多久了。", ENotificationDurationType.Long, ENotificationIconType.Alert);
                ROPlayer.ActiveHealthController.DoContusion(4f, 50f);
                ROPlayer.ActiveHealthController.DoStun(5f, 0f);
                ROPlayer.ActiveHealthController.DoFracture(EBodyPart.LeftArm);
                ROPlayer.ActiveHealthController.ApplyDamage(EBodyPart.Chest, 65f, Blunt);
                _damageEventCount++;

                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole("Heart Attack Event has run");
                }
            }
            catch (Exception ex)
            {
                Plugin.Log.LogError($"[DoDamageEvent] event failed: {ex}");
                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole($"[DoDamageEvent] event exception: {ex.Message}");
                }
            }
        }

        public void DoArmorRepair()
        {
            try
            {
                if (_repairEventCount >= 2) { return; }

                if (FikaBridge.IAmHost()) { FikaBridge.SendRandomEventPacket(Utils.Repair); }

                NotificationManagerClass.DisplayMessageNotification("护甲修复事件: 所有装备护甲已修复... nice!", ENotificationDurationType.Long, ENotificationIconType.Default);
                ROPlayer.Profile.Inventory.GetPlayerItems().ExecuteForEach((item) =>
                {
                    if (item.GetItemComponent<ArmorComponent>() != null) item.GetItemComponent<RepairableComponent>().Durability = item.GetItemComponent<RepairableComponent>().MaxDurability;
                    _repairEventCount++;
                });

                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole("Armor Repair Event has run");
                }
            }
            catch (Exception ex)
            {
                Plugin.Log.LogError($"[DoArmorRepair] event failed: {ex}");
                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole($"[DoArmorRepair] event exception: {ex.Message}");
                }
            }
        }

        public void DoAirdropEvent()
        {
            try
            {
                if (ROPlayer.Location != "factory4_day" && ROPlayer.Location != "factory4_night" && ROPlayer.Location != "laboratory" && ROPlayer.Location != "sandbox" && !_airdropEventHasRun)
                {
                    if (Utils.FindTemplates(Utils.RedFlare).FirstOrDefault() is not AmmoTemplate ammoTemplate) { return; };
                    
                    ROPlayer.HandleFlareSuccessEvent(ROPlayer.Transform.position, ammoTemplate);

                    NotificationManagerClass.DisplayMessageNotification("空投事件: 空投 incoming!", ENotificationDurationType.Long, ENotificationIconType.Quest);

                    _airdropEventHasRun = true;

                    if (ConfigController.DebugConfig.DebugMode) {
                        Utils.LogToServerConsole("Aidrop Event has run");
                    }
                }

                else
                {

                    Weighting.DoRandomEvent(Weighting.weightedEvents);
                }
            }
            catch (Exception ex)
            {
                Plugin.Log.LogError($"[DoAirdropEvent] event failed: {ex}");
                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole($"[DoAirdropEvent] event exception: {ex.Message}");
                }
            }
        }

        public async void DoFunny()
        {
            try
            {
                var token = this.destroyCancellationToken;
                if (!_jokeEventHasRun)
                {
                    if (FikaBridge.IAmHost()) { FikaBridge.SendRandomEventPacket(Utils.Jokes); }

                    NotificationManagerClass.DisplayMessageNotification("心脏骤停事件: 很高兴认识你，你还有10秒。", ENotificationDurationType.Long, ENotificationIconType.Alert);

                    await Task.Delay(10000, token);

                    NotificationManagerClass.DisplayMessageNotification("骗你的 / 开玩笑", ENotificationDurationType.Long, ENotificationIconType.Quest);

                    await Task.Delay(2000, token);

                    DoHealPlayer();

                    if (ConfigController.DebugConfig.DebugMode) {
                        Utils.LogToServerConsole("Joke Event has run");
                    }

                    _jokeEventHasRun = true;
                }

                if (_jokeEventHasRun)
                {
                    Weighting.DoRandomEvent(Weighting.weightedEvents);
                }
            }
            catch (Exception ex)
            {
                Plugin.Log.LogError($"[DoFunny] event failed: {ex}");
                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole($"[DoFunny] event exception: {ex.Message}");
                }
            }
        }

        public async void DoBlackoutEvent()
        {
            try
            {
                var token = this.destroyCancellationToken;
                if (FikaBridge.IAmHost()) { FikaBridge.SendRandomEventPacket(Utils.Blackout); }

                foreach (Switch pSwitch in _pswitchs)
                {
                    typeof(Switch).GetMethod("Close", BindingFlags.Instance | BindingFlags.Public).Invoke(pSwitch, null);
                    typeof(Switch).GetMethod("Lock", BindingFlags.Instance | BindingFlags.Public).Invoke(pSwitch, null);
                }

                foreach (LampController lamp in _lamp)
                {
                    lamp.Switch(Turnable.EState.Off);
                    lamp.enabled = false;
                }

                foreach (KeycardDoor door in _keydoor)
                {
                    if (_keydoor != null && _keydoor.Length > 0)
                    {
                        typeof(KeycardDoor).GetMethod("Unlock", BindingFlags.Instance | BindingFlags.Public).Invoke(door, null);
                        typeof(KeycardDoor).GetMethod("Open", BindingFlags.Instance | BindingFlags.Public).Invoke(door, null);
                    }
                }

                NotificationManagerClass.DisplayMessageNotification("停电事件: 所有电闸和灯光已关闭，持续10分钟", ENotificationDurationType.Long, ENotificationIconType.Alert);

                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole("Blackout Event: All power switches and lights disabled for 10 minutes");
                }

                await Task.Delay(300000, token);
                if (!token.IsCancellationRequested)
                    NotificationManagerClass.DisplayMessageNotification("停电事件: 电力仍中断，剩余5分钟", ENotificationDurationType.Long, ENotificationIconType.Alert);

                await Task.Delay(240000, token);
                if (!token.IsCancellationRequested)
                    NotificationManagerClass.DisplayMessageNotification("停电事件: 电力将在1分钟后恢复", ENotificationDurationType.Long, ENotificationIconType.Alert);

                await Task.Delay(60000, token);

                foreach (Switch pSwitch in _pswitchs)
                {
                    typeof(Switch).GetMethod("Unlock", BindingFlags.Instance | BindingFlags.Public).Invoke(pSwitch, null);
                }

                foreach (LampController lamp in _lamp)
                {
                    lamp.Switch(Turnable.EState.On);
                    lamp.enabled = true;
                }

                NotificationManagerClass.DisplayMessageNotification("停电事件结束", ENotificationDurationType.Long, ENotificationIconType.Quest);

                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole("Blackout Event has run");
                }
            }
            catch (Exception ex)
            {
                Plugin.Log.LogError($"[DoBlackoutEvent] event failed: {ex}");
                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole($"[DoBlackoutEvent] event exception: {ex.Message}");
                }
            }
        }

        public void DoSkillEvent()
        {
            try
            {
                if (_skillEventCount >= 3) { return; }

                if (FikaBridge.IAmHost()) { FikaBridge.SendRandomEventPacket(Utils.Skill); }

                System.Random random = new System.Random();
                int chance = random.Next(0, 100 + 1);

                // Try to find an unlocked skill, with a bounded retry limit
                var selectedSkill = ROSkillManager.DisplayList.RandomElement();
                int maxRetries = 20;
                while (selectedSkill.Locked == true && maxRetries-- > 0)
                {
                    selectedSkill = ROSkillManager.DisplayList.RandomElement();
                }
                if (selectedSkill.Locked == true) return; // Give up if all locked

                int level = selectedSkill.Level;

                // 55% chance to roll a skill gain
                // 45% chance to roll a skill loss
                if (chance >= 0 && chance <= 55)
                {
                    if (level > 50 || level < 0) { return; }

                    selectedSkill.SetLevel(level + 1);
                    _skillEventCount++;
                    NotificationManagerClass.DisplayMessageNotification("技能事件: 你的某项技能升了一级!", ENotificationDurationType.Long, ENotificationIconType.Quest);
                }
                else
                {
                    if (level <= 0) { return; }

                    selectedSkill.SetLevel(level - 1);
                    _skillEventCount++;
                    NotificationManagerClass.DisplayMessageNotification("技能事件: 你的某项技能降了一级，运气真差!", ENotificationDurationType.Long, ENotificationIconType.Quest);
                }

                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole("Skill Event has run");
                }
            }
            catch (Exception ex)
            {
                Plugin.Log.LogError($"[DoSkillEvent] event failed: {ex}");
                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole($"[DoSkillEvent] event exception: {ex.Message}");
                }
            }
        }

        public void DoMetabolismEvent()
        {
            try
            {
                if (!_metabolismDisabled)
                {
                    if (FikaBridge.IAmHost()) { FikaBridge.SendRandomEventPacket(Utils.Metabolism); }

                    System.Random random = new System.Random();
                    int chance = random.Next(0, 100 + 1);

                    // 33% chance to disable metabolism for the raid
                    // 33% chance to increase metabolism rate by 20% for the raid
                    // 33% chance to reduce metabolism rate by 20% for the raid
                    if (chance >= 0 && chance <= 33)
                    {
                        float originalEnergyRate = ROPlayer.ActiveHealthController.EnergyRate;
                        float originalHydrationRate = ROPlayer.ActiveHealthController.HydrationRate;
                        ROPlayer.ActiveHealthController.DisableMetabolism();
                        _metabolismDisabled = true;
                        NotificationManagerClass.DisplayMessageNotification("代谢事件: 你拥有钢铁般的胃，不再感到饥饿和口渴!", ENotificationDurationType.Long, ENotificationIconType.Quest);
                        StartCoroutine(RestoreMetabolism(originalEnergyRate, originalHydrationRate));
                    }
                    else if (chance >= 34f && chance <= 66)
                    {
                        AccessTools.Property(typeof(ActiveHealthController), "EnergyRate").SetValue(
                            ROPlayer.ActiveHealthController,
                            ROPlayer.ActiveHealthController.EnergyRate * 0.80f);

                        AccessTools.Property(typeof(ActiveHealthController), "HydrationRate").SetValue(
                            ROPlayer.ActiveHealthController,
                            ROPlayer.ActiveHealthController.HydrationRate * 0.80f);

                        NotificationManagerClass.DisplayMessageNotification("代谢事件: 你的代谢减慢了，饥饿和口渴消耗降低!", ENotificationDurationType.Long, ENotificationIconType.Quest);
                    }
                    else if (chance >= 67 && chance <= 100f)
                    {
                        AccessTools.Property(typeof(ActiveHealthController), "EnergyRate").SetValue(
                            ROPlayer.ActiveHealthController,
                            ROPlayer.ActiveHealthController.EnergyRate * 1.20f);

                        AccessTools.Property(typeof(ActiveHealthController), "HydrationRate").SetValue(
                            ROPlayer.ActiveHealthController,
                            ROPlayer.ActiveHealthController.HydrationRate * 1.20f);

                        NotificationManagerClass.DisplayMessageNotification("代谢事件: 你的代谢加速了，饥饿和口渴消耗增加!", ENotificationDurationType.Long, ENotificationIconType.Quest);
                    }
                }

                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole("Metabolism Event has run");
                }
            }
            catch (Exception ex)
            {
                Plugin.Log.LogError($"[DoMetabolismEvent] event failed: {ex}");
                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole($"[DoMetabolismEvent] event exception: {ex.Message}");
                }
            }
        }

        public async void DoMalfEvent()
        {
            try
            {
                var token = this.destroyCancellationToken;
                var Items = Session.Profile.Inventory.GetItemsInSlots(new EquipmentSlot[] {EquipmentSlot.FirstPrimaryWeapon, EquipmentSlot.SecondPrimaryWeapon});

                if (!_malfEventHasRun)
                {
                    if (FikaBridge.IAmHost()) { FikaBridge.SendRandomEventPacket(Utils.Malf); }

                    _malfEventHasRun = true;

                    var tempItems = _allWeapons;

                    foreach (var item in tempItems)
                    {
                        if (item is Weapon weapon)
                        {
                            var origStats = new OriginalWeaponStatsMalf();

                            origStats.malfChance = weapon.Template.BaseMalfunctionChance;
                            origStats.duraBurn = weapon.Template.DurabilityBurnRatio;
                            origStats.ergo = weapon.Template.Ergonomics;

                            _originalWSMalf.Add(item.TemplateId, origStats);
                        }
                    }

                    //
                    //
                    //

                    try
                    {
                        foreach (var item in Items)
                        {
                            if (item is Weapon weapon)
                            {
                                weapon.Template.BaseMalfunctionChance = _originalWSMalf[item.TemplateId].malfChance * 3f;
                                weapon.Template.DurabilityBurnRatio = _originalWSMalf[item.TemplateId].duraBurn * 2f;
                                weapon.Template.Ergonomics = _originalWSMalf[item.TemplateId].ergo * 0.5f;
                            }
                        }

                        NotificationManagerClass.DisplayMessageNotification("武器故障事件: 小心卡壳!", ENotificationDurationType.Long, ENotificationIconType.Alert);

                        if (ConfigController.DebugConfig.DebugMode) {
                            Utils.LogToServerConsole("Malfunction Event has started");
                        }

                        await Task.Delay(150000, token);
                        if (!token.IsCancellationRequested)
                            NotificationManagerClass.DisplayMessageNotification("武器故障事件: 武器仍不稳定，剩余2.5分钟", ENotificationDurationType.Long, ENotificationIconType.Alert);

                        await Task.Delay(90000, token);
                        if (!token.IsCancellationRequested)
                            NotificationManagerClass.DisplayMessageNotification("武器故障事件: 武器状态即将恢复正常", ENotificationDurationType.Long, ENotificationIconType.Default);

                        await Task.Delay(60000, token);
                    }
                    finally
                    {
                        foreach (var item in Items)
                        {
                            if (item is Weapon weapon)
                            {
                                weapon.Template.BaseMalfunctionChance = _originalWSMalf[item.TemplateId].malfChance;
                                weapon.Template.DurabilityBurnRatio = _originalWSMalf[item.TemplateId].duraBurn;
                                weapon.Template.Ergonomics = _originalWSMalf[item.TemplateId].ergo;
                            }
                        }

                        NotificationManagerClass.DisplayMessageNotification("武器故障事件: 你的武器已经冷却，应该不会再出问题了!", ENotificationDurationType.Long, ENotificationIconType.Default);

                        if (ConfigController.DebugConfig.DebugMode) {
                            Utils.LogToServerConsole("Malfunction Event has run");
                        }
                    }
                }  

                else
                {
                    Weighting.DoRandomEvent(Weighting.weightedEvents);
                }
            }
            catch (Exception ex)
            {
                Plugin.Log.LogError($"[DoMalfEvent] event failed: {ex}");
                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole($"[DoMalfEvent] event exception: {ex.Message}");
                }
            }
        }

        public void DoLLEvent()
        {
            try
            {
                if (FikaBridge.IAmHost()) { FikaBridge.SendRandomEventPacket(Utils.LoyaltyLevel); }

                System.Random random = new System.Random();

                if (ConfigController.ServerConfig.EnableReqShop)
                {
                    var Trader = Utils.Traders.RandomElement();
                    int chance = random.Next(0, 100 + 1);

                    if (chance is >= 0 && chance is <= 49)
                    {
                        Session.Profile.TradersInfo[Trader].SetStanding(Session.Profile.TradersInfo[Trader].Standing + 0.1);
                        NotificationManagerClass.DisplayMessageNotification("商人事件: 某位随机商人对你多了几分敬意。", ENotificationDurationType.Default, ENotificationIconType.Achievement);

                        if (ConfigController.DebugConfig.DebugMode) {
                            Utils.LogToServerConsole("Trader Rep Gain Event has run");
                        }
                    }

                    else if (chance is >= 50 && chance is <= 100)
                    {
                        if (Session.Profile.TradersInfo[Trader].Standing >= 0.05)
                        {
                            Session.Profile.TradersInfo[Trader].SetStanding(Session.Profile.TradersInfo[Trader].Standing - 0.05);
                            NotificationManagerClass.DisplayMessageNotification("商人事件: 某位随机商人对你失去了一些信任。", ENotificationDurationType.Default, ENotificationIconType.Achievement);

                            if (ConfigController.DebugConfig.DebugMode) {
                                Utils.LogToServerConsole("Trader Rep Loss Event has run");
                            }
                        }

                        else
                        {
                            Weighting.DoRandomEvent(Weighting.weightedEvents);
                        }
                    }
                }
                else
                {
                    var Trader = Utils.TradersNoReq.RandomElement();
                    int chance = random.Next(0, 100 + 1);

                    if (chance is >= 0 && chance is <= 49)
                    {
                        Session.Profile.TradersInfo[Trader].SetStanding(Session.Profile.TradersInfo[Trader].Standing + 0.1);
                        NotificationManagerClass.DisplayMessageNotification("商人事件: 某位随机商人对你多了几分敬意。", ENotificationDurationType.Default, ENotificationIconType.Achievement);

                        if (ConfigController.DebugConfig.DebugMode) {
                            Utils.LogToServerConsole("Trader Rep Gain Event has run");
                        }
                    }

                    else if (chance is >= 50 && chance is <= 100)
                    {
                        if (Session.Profile.TradersInfo[Trader].Standing >= 0.05)
                        {
                            Session.Profile.TradersInfo[Trader].SetStanding(Session.Profile.TradersInfo[Trader].Standing - 0.05);
                            NotificationManagerClass.DisplayMessageNotification("商人事件: 某位随机商人对你失去了一些信任。", ENotificationDurationType.Default, ENotificationIconType.Achievement);

                            if (ConfigController.DebugConfig.DebugMode) {
                                Utils.LogToServerConsole("Trader Rep Loss Event has run");
                            }
                        }

                        else
                        {
                            Weighting.DoRandomEvent(Weighting.weightedEvents);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Plugin.Log.LogError($"[DoLLEvent] event failed: {ex}");
                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole($"[DoLLEvent] event exception: {ex.Message}");
                }
            }
        }

        public async void DoBerserkEvent()
        {
            try
            {
                var token = this.destroyCancellationToken;
                var Items = Session.Profile.Inventory.GetItemsInSlots(new EquipmentSlot[] {EquipmentSlot.FirstPrimaryWeapon, EquipmentSlot.SecondPrimaryWeapon});

                if (!_berserkEventHasRun)
                {
                    if (FikaBridge.IAmHost()) { FikaBridge.SendRandomEventPacket(Utils.Berserk); }

                    _berserkEventHasRun = true;

                    var tempItems = _allWeapons;

                    foreach (var item in tempItems)
                    {
                        if (item is Weapon weapon)
                        {
                            var origStats = new OriginalWeaponStatsBers();

                            origStats.ergo = weapon.Template.Ergonomics;
                            origStats.duraBurn = weapon.Template.DurabilityBurnRatio;
                            origStats.malfChance = weapon.Template.BaseMalfunctionChance;
                            origStats.recoilBack = weapon.Template.RecoilForceBack;
                            origStats.recoilUp = weapon.Template.RecoilForceUp;

                            _originalWSBers.Add(item.TemplateId, origStats);
                        }
                    }

                    //
                    //
                    //


                    try
                    {
                        ROPlayer.ActiveHealthController.DoScavRegeneration(10f);

                        foreach (var item in Items)
                        {
                            if (item is Weapon weapon)
                            {
                                weapon.Template.BaseMalfunctionChance = _originalWSBers[item.TemplateId].malfChance * 0.25f;
                                weapon.Template.DurabilityBurnRatio = _originalWSBers[item.TemplateId].duraBurn * 0.5f;
                                weapon.Template.Ergonomics = _originalWSBers[item.TemplateId].ergo * 2f;
                                weapon.Template.RecoilForceBack = _originalWSBers[item.TemplateId].recoilBack * 0.5f;
                                weapon.Template.RecoilForceUp = _originalWSBers[item.TemplateId].recoilUp * 0.5f;
                            }
                        }

                        NotificationManagerClass.DisplayMessageNotification("狂暴事件: 你双眼泛红，挡在你路上的Scav和PMC们可惨了!", ENotificationDurationType.Long, ENotificationIconType.Alert);

                        if (ConfigController.DebugConfig.DebugMode) {
                            Utils.LogToServerConsole("Berserk Event has started");
                        }

                        await Task.Delay(90000, token);
                        if (!token.IsCancellationRequested)
                            NotificationManagerClass.DisplayMessageNotification("狂暴事件: 你的愤怒仍在燃烧，剩余1.5分钟", ENotificationDurationType.Long, ENotificationIconType.Alert);

                        await Task.Delay(60000, token);
                        if (!token.IsCancellationRequested)
                            NotificationManagerClass.DisplayMessageNotification("狂暴事件: 30秒后恢复理智", ENotificationDurationType.Long, ENotificationIconType.Alert);

                        await Task.Delay(30000, token);
                    }
                    finally
                    {
                        ROPlayer.ActiveHealthController.DoScavRegeneration(0);
                        ROPlayer.ActiveHealthController.PauseAllEffects();

                        foreach (var item in Items)
                        {
                            if (item is Weapon weapon)
                            {
                                weapon.Template.BaseMalfunctionChance = _originalWSBers[item.TemplateId].malfChance;
                                weapon.Template.DurabilityBurnRatio = _originalWSBers[item.TemplateId].duraBurn;
                                weapon.Template.Ergonomics = _originalWSBers[item.TemplateId].ergo;
                                weapon.Template.RecoilForceBack = _originalWSBers[item.TemplateId].recoilBack;
                                weapon.Template.RecoilForceUp = _originalWSBers[item.TemplateId].recoilUp;
                            }
                        }

                        NotificationManagerClass.DisplayMessageNotification("狂暴事件: 你的视线恢复了清晰，看来怒气发泄完了!", ENotificationDurationType.Long, ENotificationIconType.Alert);

                        if (ConfigController.DebugConfig.DebugMode) {
                            Utils.LogToServerConsole("Berserk Event has run");
                        }
                    }
                }

                else
                {
                    Weighting.DoRandomEvent(Weighting.weightedEvents);
                }
            }
            catch (Exception ex)
            {
                Plugin.Log.LogError($"[DoBerserkEvent] event failed: {ex}");
                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole($"[DoBerserkEvent] event exception: {ex.Message}");
                }
            }
        }

        public async void DoWeightEvent()
        {
            try
            {
                var token = this.destroyCancellationToken;
                var Items = Session.Profile.Inventory.GetItemsInSlots(new EquipmentSlot[] { EquipmentSlot.FirstPrimaryWeapon, 
                                                                                            EquipmentSlot.SecondPrimaryWeapon,
                                                                                            EquipmentSlot.Holster,
                                                                                            EquipmentSlot.Scabbard,
                                                                                            EquipmentSlot.ArmorVest, 
                                                                                            EquipmentSlot.TacticalVest, 
                                                                                            EquipmentSlot.Backpack,
                                                                                            EquipmentSlot.Earpiece,
                                                                                            EquipmentSlot.Headwear });

                System.Random random = new System.Random();
                int chance = random.Next(0, 100 + 1);

                if (!_weightEventHasRun)
                {
                    if (FikaBridge.IAmHost()) { FikaBridge.SendRandomEventPacket(Utils.Weight); }

                    _weightEventHasRun = true;

                    if (chance is >= 0 && chance is <= 49)
                    {
                        try
                        {
                            foreach (var item in Items)
                            {
                                if (item is Item slottedItem)
                                {
                                    slottedItem.Template.Weight = slottedItem.Template.Weight * 2f;
                                }
                            }
                            Session.Profile.Inventory.UpdateTotalWeight();

                            NotificationManagerClass.DisplayMessageNotification("负重事件: 最好蹲好别动，等体力恢复!", ENotificationDurationType.Long, ENotificationIconType.Alert);

                            if (ConfigController.DebugConfig.DebugMode) {
                                Utils.LogToServerConsole("Weight Event has started");
                            }

                            await Task.Delay(90000, token);
                            if (!token.IsCancellationRequested)
                                NotificationManagerClass.DisplayMessageNotification("负重事件: 体重仍异常，剩余1.5分钟", ENotificationDurationType.Long, ENotificationIconType.Alert);

                            await Task.Delay(60000, token);
                            if (!token.IsCancellationRequested)
                                NotificationManagerClass.DisplayMessageNotification("负重事件: 30秒后恢复正常", ENotificationDurationType.Long, ENotificationIconType.Alert);

                            await Task.Delay(30000, token);
                        }
                        finally
                        {
                            foreach (var item in Items)
                            {
                                if (item is Item slottedItem)
                                {
                                    slottedItem.Template.Weight = slottedItem.Template.Weight * 0.5f;
                                }
                            }
                            Session.Profile.Inventory.UpdateTotalWeight();

                            NotificationManagerClass.DisplayMessageNotification("负重事件: 你已休息好，可以重新出发了!", ENotificationDurationType.Long, ENotificationIconType.Alert);

                            if (ConfigController.DebugConfig.DebugMode) {
                                Utils.LogToServerConsole("Weight Event has run");
                            }
                        }
                    }

                    //
                    //
                    //

                    if (chance is >= 50 && chance is <= 100)
                    {
                        try
                        {
                            foreach (var item in Items)
                            {
                                if (item is Item slottedItem)
                                {
                                    slottedItem.Template.Weight = slottedItem.Template.Weight * 0.5f;
                                }
                            }
                            Session.Profile.Inventory.UpdateTotalWeight();

                            NotificationManagerClass.DisplayMessageNotification("负重事件: 你感到身轻如燕，能拿多少就拿多少!", ENotificationDurationType.Long, ENotificationIconType.Alert);

                            if (ConfigController.DebugConfig.DebugMode) {
                                Utils.LogToServerConsole("Weight Event has started");
                            }

                            await Task.Delay(90000, token);
                            if (!token.IsCancellationRequested)
                                NotificationManagerClass.DisplayMessageNotification("负重事件: 体重仍异常，剩余1.5分钟", ENotificationDurationType.Long, ENotificationIconType.Alert);

                            await Task.Delay(60000, token);
                            if (!token.IsCancellationRequested)
                                NotificationManagerClass.DisplayMessageNotification("负重事件: 30秒后恢复正常", ENotificationDurationType.Long, ENotificationIconType.Alert);

                            await Task.Delay(30000, token);
                        }
                        finally
                        {
                            foreach (var item in Items)
                            {
                                if (item is Item slottedItem)
                                {
                                    slottedItem.Template.Weight = slottedItem.Template.Weight * 2f;
                                }
                            }
                            Session.Profile.Inventory.UpdateTotalWeight();

                            NotificationManagerClass.DisplayMessageNotification("负重事件: 你的额外能量消失了，希望你背包没塞太满!", ENotificationDurationType.Long, ENotificationIconType.Alert);

                            if (ConfigController.DebugConfig.DebugMode) {
                                Utils.LogToServerConsole("Weight Event has run");
                            }
                        }
                    }
                }

                else
                {
                    Weighting.DoRandomEvent(Weighting.weightedEvents);
                }
            }
            catch (Exception ex)
            {
                Plugin.Log.LogError($"[DoWeightEvent] event failed: {ex}");
                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole($"[DoWeightEvent] event exception: {ex.Message}");
                }
            }
        }

        public async void DoMaxLLEvent()
        {
            try
            {
                var token = this.destroyCancellationToken;
                if (JsonHandler.CheckFilePath("TraderRep", "Flags"))
                {
                    JsonHandler.ReadFlagFile("TraderRep", "Flags");

                    if (FikaBridge.IAmHost()) { FikaBridge.SendRandomEventPacket(Utils.MaxLoyaltyLevel); }

                    if (!ConfigController.flags.traderRepFlag)
                    {
                        if (_maxLLEventCount >= 1) 
                        {
                            Weighting.DoRandomEvent(Weighting.weightedEvents);
                            return; 
                        }

                        if (ConfigController.ServerConfig.EnableReqShop)
                        {
                            var Traders = Utils.Traders;

                            _maxLLEventCount++;

                            foreach (var Trader in Traders)
                            {
                                {
                                    if (!_originalStandings.ContainsKey(Trader))
                                        _originalStandings[Trader] = (float)Session.Profile.TradersInfo[Trader].Standing;
                                    Session.Profile.TradersInfo[Trader].SetStanding(6.0f);
                                }
                            }

                            ConfigController.flags.traderRepFlag = true;
                            JsonHandler.SaveToJson(ConfigController.flags, "TraderRep", "Flags");

                            NotificationManagerClass.DisplayMessageNotification("购物狂欢事件: 所有商人声望已达最高。最好在这十分钟内去光顾他们!", ENotificationDurationType.Default, ENotificationIconType.Mail);

                            if (ConfigController.DebugConfig.DebugMode) {
                                Utils.LogToServerConsole("Shopping Spree Event has started");
                            }

                            await Task.Delay(300000, token);
                            if (!token.IsCancellationRequested)
                                NotificationManagerClass.DisplayMessageNotification("购物狂欢事件: 还有5分钟，抓紧采购！", ENotificationDurationType.Default, ENotificationIconType.Mail);

                            await Task.Delay(240000, token);
                            if (!token.IsCancellationRequested)
                                NotificationManagerClass.DisplayMessageNotification("购物狂欢事件: 1分钟后声望恢复，最后机会！", ENotificationDurationType.Default, ENotificationIconType.Mail);

                            await Task.Delay(60000, token);

                            foreach (var Trader in Traders)
                            {
                                {
                                    if (_originalStandings.TryGetValue(Trader, out float origStanding))
                                        Session.Profile.TradersInfo[Trader].SetStanding(origStanding);
                                }
                            }
                            _originalStandings.Clear();

                            ConfigController.flags.traderRepFlag = false;
                            JsonHandler.SaveToJson(ConfigController.flags, "TraderRep", "Flags");

                            NotificationManagerClass.DisplayMessageNotification("购物狂欢事件: 所有商人声望已恢复正常。毕竟这生意就是这样变幻无常。", ENotificationDurationType.Default, ENotificationIconType.Mail);

                            if (ConfigController.DebugConfig.DebugMode) {
                                Utils.LogToServerConsole("Shopping Spree Event has run");
                            }
                        }
                        else
                        {
                            var Traders = Utils.TradersNoReq;

                            _maxLLEventCount++;

                            foreach (var Trader in Traders)
                            {
                                {
                                    if (!_originalStandings.ContainsKey(Trader))
                                        _originalStandings[Trader] = (float)Session.Profile.TradersInfo[Trader].Standing;
                                    Session.Profile.TradersInfo[Trader].SetStanding(6.0f);
                                }
                            }

                            ConfigController.flags.traderRepFlag = true;
                            JsonHandler.SaveToJson(ConfigController.flags, "TraderRep", "Flags");

                            NotificationManagerClass.DisplayMessageNotification("购物狂欢事件: 所有商人声望已达最高。最好在这十分钟内去光顾他们!", ENotificationDurationType.Default, ENotificationIconType.Mail);

                            if (ConfigController.DebugConfig.DebugMode) {
                                Utils.LogToServerConsole("Shopping Spree Event has started");
                            }

                            await Task.Delay(300000, token);
                            if (!token.IsCancellationRequested)
                                NotificationManagerClass.DisplayMessageNotification("购物狂欢事件: 还有5分钟，抓紧采购！", ENotificationDurationType.Default, ENotificationIconType.Mail);

                            await Task.Delay(240000, token);
                            if (!token.IsCancellationRequested)
                                NotificationManagerClass.DisplayMessageNotification("购物狂欢事件: 1分钟后声望恢复，最后机会！", ENotificationDurationType.Default, ENotificationIconType.Mail);

                            await Task.Delay(60000, token);

                            foreach (var Trader in Traders)
                            {
                                {
                                    if (_originalStandings.TryGetValue(Trader, out float origStanding))
                                        Session.Profile.TradersInfo[Trader].SetStanding(origStanding);
                                }
                            }
                            _originalStandings.Clear();

                            ConfigController.flags.traderRepFlag = false;
                            JsonHandler.SaveToJson(ConfigController.flags, "TraderRep", "Flags");

                            NotificationManagerClass.DisplayMessageNotification("购物狂欢事件: 所有商人声望已恢复正常。毕竟这生意就是这样变幻无常。", ENotificationDurationType.Default, ENotificationIconType.Mail);

                            if (ConfigController.DebugConfig.DebugMode) {
                                Utils.LogToServerConsole("Shopping Spree Event has run");
                            }
                        }
                    }

                    else if (ConfigController.flags.traderRepFlag)
                    {
                        CorrectRep();
                    }
                }

                else
                {
                    Weighting.DoRandomEvent(Weighting.weightedEvents);
                }
            }
            catch (Exception ex)
            {
                Plugin.Log.LogError($"[DoMaxLLEvent] event failed: {ex}");
                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole($"[DoMaxLLEvent] event exception: {ex.Message}");
                }
            }
        }

        public void CorrectRep()
        {
            if (FikaBridge.IAmHost()) { FikaBridge.SendRandomEventPacket(Utils.CorrectRep); }

            if (JsonHandler.CheckFilePath("TraderRep", "Flags"))
            {
                JsonHandler.ReadFlagFile("TraderRep", "Flags");

                if (ConfigController.flags.traderRepFlag)
                {
                    if (ConfigController.ServerConfig.EnableReqShop)
                    {
                        var Traders = Utils.Traders;

                        foreach (var Trader in Traders)
                        {
                            {
                                if (_originalStandings.TryGetValue(Trader, out float origStanding))
                                    Session.Profile.TradersInfo[Trader].SetStanding(origStanding);
                            }
                        }
                        _originalStandings.Clear();

                        ConfigController.flags.traderRepFlag = false;
                        JsonHandler.SaveToJson(ConfigController.flags, "TraderRep", "Flags");
                        Weighting.DoRandomEvent(Weighting.weightedEvents);
                    }
                    else
                    {
                        var Traders = Utils.TradersNoReq;

                        foreach (var Trader in Traders)
                        {
                            {
                                if (_originalStandings.TryGetValue(Trader, out float origStanding))
                                    Session.Profile.TradersInfo[Trader].SetStanding(origStanding);
                            }
                        }
                        _originalStandings.Clear();

                        ConfigController.flags.traderRepFlag = false;
                        JsonHandler.SaveToJson(ConfigController.flags, "TraderRep", "Flags");
                        Weighting.DoRandomEvent(Weighting.weightedEvents);
                    }
                }
            }
            
            else
            {
                Weighting.DoRandomEvent(Weighting.weightedEvents);
            }
        }

        public async void DoLockDownEvent()
        {
            try
            {
                var token = this.destroyCancellationToken;
                var raidTimeLeft = SPT.SinglePlayer.Utils.InRaid.RaidTimeUtil.GetRemainingRaidSeconds();
                var exfils = FindObjectsOfType<ExfiltrationPoint>();

                if (_exfilEventCount >= 1) { return; }

                if (FikaBridge.IAmHost()) { FikaBridge.SendRandomEventPacket(Utils.Lockdown); }

                if (raidTimeLeft < 900 || ROPlayer.Location == "laboratory")
                {
                    Weighting.DoRandomEvent(Weighting.weightedEvents);
                }

                else
                {
                    NotificationManagerClass.DisplayMessageNotification("撤离封锁事件: 所有撤离点已关闭，持续15分钟", ENotificationDurationType.Long, ENotificationIconType.EntryPoint);

                    if (ConfigController.DebugConfig.DebugMode) {
                        Utils.LogToServerConsole("Lockdown Event has started");
                    }

                    EventExfilPatch.IsLockdown = true;
                    _exfilLockdown = true;

                    foreach (var exfil in exfils)
                    {
                        if (!exfil.Settings.Name.Contains("Elevator"))
                        {
                            exfil.Disable();
                        }
                    }
                    _exfilEventCount++;

                    timeStart = System.DateTime.UtcNow.Second;

                    await Task.Delay(450000, token);
                    if (!token.IsCancellationRequested)
                        NotificationManagerClass.DisplayMessageNotification("撤离封锁事件: 撤离点仍关闭，剩余7.5分钟", ENotificationDurationType.Long, ENotificationIconType.EntryPoint);

                    await Task.Delay(390000, token);
                    if (!token.IsCancellationRequested)
                        NotificationManagerClass.DisplayMessageNotification("撤离封锁事件: 1分钟后解除封锁，准备撤离！", ENotificationDurationType.Long, ENotificationIconType.EntryPoint);

                    await Task.Delay(60000, token);

                    foreach (var exfil in exfils)
                    {
                        if (!exfil.Settings.Name.Contains("Elevator"))
                        {
                            exfil.Enable();
                        }
                    }

                    EventExfilPatch.IsLockdown = false;
                    _exfilLockdown = false;

                    NotificationManagerClass.DisplayMessageNotification("撤离封锁事件: 撤离点已重新开放。是时候撤了!", ENotificationDurationType.Long, ENotificationIconType.EntryPoint);

                    if (ConfigController.DebugConfig.DebugMode) {
                        Utils.LogToServerConsole("Lockdown Event has run");
                    }
                }
            }
            catch (Exception ex)
            {
                Plugin.Log.LogError($"[DoLockDownEvent] event failed: {ex}");
                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole($"[DoLockDownEvent] event exception: {ex.Message}");
                }
            }
        }

        public async void DoArtyEvent()
        {
            try
            {
                var token = this.destroyCancellationToken;
                if (FikaBridge.IAmHost()) { FikaBridge.SendRandomEventPacket(Utils.Artillery); }

                if (ROPlayer.Location != "factory4_day" && ROPlayer.Location != "factory4_night" && ROPlayer.Location != "laboratory" && !_artyEventHasRun)
                {
                    NotificationManagerClass.DisplayMessageNotification("炮击事件: 找掩体。炮击将在30秒后开始", ENotificationDurationType.Long, ENotificationIconType.EntryPoint);

                    if (ConfigController.DebugConfig.DebugMode) {
                        Utils.LogToServerConsole("Artillery Event has started");
                    }

                    await Task.Delay(20000, token);
                    if (!token.IsCancellationRequested)
                        NotificationManagerClass.DisplayMessageNotification("炮击事件: 10秒后开始炮击！快找掩体！", ENotificationDurationType.Long, ENotificationIconType.EntryPoint);

                    await Task.Delay(10000, token);

                    NotificationManagerClass.DisplayMessageNotification("炮击事件: 炮击开始", ENotificationDurationType.Long, ENotificationIconType.EntryPoint);
                    
                    ROGameWorld.ServerShellingController?.StartShellingPosition(ROPlayer.Transform.position);
                }

                else
                {
                    Weighting.DoRandomEvent(Weighting.weightedEvents);
                }
            }
            catch (Exception ex)
            {
                Plugin.Log.LogError($"[DoArtyEvent] event failed: {ex}");
                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole($"[DoArtyEvent] event exception: {ex.Message}");
                }
            }
        }

        public void FlareLogicTrain()
        {
            var trainFlareInHands = ROPlayer.HandsController.Item.TemplateId == Utils.TrainFlare;

            if (!trainFlareInHands) { return; }

            if (trainFlareInHands && Ready())
            {
                if (Input.GetKeyDown(KeyCode.Mouse0) && _mouseInputCountT < 1)
                {
                    _mouseInputCountT++;
                    RunTrain();
                }
            }
        }

        public async void RunTrain()
        {
            var token = this.destroyCancellationToken;
            FikaBridge.SendFlareEventPacket(Utils.Train);
            
            await Task.Delay(3000, token);
            Locomotive trainExfil = FindObjectOfType<Locomotive>();
            if (trainExfil == null) { return; }

            trainExfil?.Init(System.DateTime.UtcNow);
            
            NotificationManagerClass.DisplayMessageNotification("火车即将到达。准备好就上车!", ENotificationDurationType.Long, ENotificationIconType.EntryPoint);

            if (ConfigController.DebugConfig.DebugMode) {
                Utils.LogToServerConsole("Train is arriving");
            }

            await Task.Delay(210000, token);
            if (!token.IsCancellationRequested)
                NotificationManagerClass.DisplayMessageNotification("火车即将离站，剩余3.5分钟", ENotificationDurationType.Long, ENotificationIconType.EntryPoint);

            await Task.Delay(210000, token);
            
            NotificationManagerClass.DisplayMessageNotification("火车正在离站。", ENotificationDurationType.Long, ENotificationIconType.EntryPoint);
            
            if (ConfigController.DebugConfig.DebugMode) {
                Utils.LogToServerConsole("Train is leaving");
            }

            _mouseInputCountT = 0;
        }

        public void FlareLogicExfil()
        {
            var itemInHands = ROPlayer.HandsController.Item;

            // 特黄弹 → 装备撤离箱
            if (itemInHands.TemplateId == Utils.GearExfilFlare)
            {
                if (IsAirdropActive())
                {
                    _airspaceClearShown = false;
                    if (Time.time - _lastAirspaceWarningTime > 5f && _airspaceWarningCount < 5)
                    {
                        _lastAirspaceWarningTime = Time.time;
                        _airspaceWarningCount++;
                        NotificationManagerClass.DisplayMessageNotification("空域已被占用，请等待当前空投完成", ENotificationDurationType.Long, ENotificationIconType.Alert);
                    }
                    return;
                }
                _airspaceWarningCount = 0;
                // 空域已净空，提示一次
                if (!_airspaceClearShown)
                {
                    _airspaceClearShown = true;
                    NotificationManagerClass.DisplayMessageNotification("空域已净空，可以发送信号", ENotificationDurationType.Default, ENotificationIconType.Default);
                }

                if (Ready() && Input.GetKeyDown(KeyCode.Mouse0) && !_gearExfil)
                {
                    DoGearExfilEvent();
                }
                return;
            }

            // 特白弹 → PMC 紧急撤离
            if (itemInHands.TemplateId == Utils.SpecialExfilFlare)
            {
                if (Ready() && Input.GetKeyDown(KeyCode.Mouse0) && _mouseInputCountE < 1)
                {
                    _mouseInputCountE++;
                    DoPmcExfilEvent();
                }
                return;
            }
        }

        /// <summary>
        /// 检查空域是否有活跃空投（每10秒缓存一次，仅扫描 LootableContainer 避免性能问题）
        /// </summary>
        private static bool IsAirdropActive()
        {
            if (Time.time - _lastAirspaceCheck < 10f) return _airspaceOccupied;
            _lastAirspaceCheck = Time.time;
            _airspaceOccupied = false;

            foreach (var lc in UnityEngine.Object.FindObjectsOfType<LootableContainer>())
            {
                if (lc.name.ToLower().Contains("airdrop") && lc.transform.position.y > 10f)
                {
                    _airspaceOccupied = true;
                    break;
                }
            }
            return _airspaceOccupied;
        }

        public async void DoPmcExfilEvent()
        {
            var token = this.destroyCancellationToken;
            if (!_pmcExfilEventRunning)
            {
                FikaBridge.SendFlareEventPacket(Utils.PmcExfil);

                _pmcExfilEventRunning = true;

                await Task.Delay(3000, token);
                NotificationManagerClass.DisplayMessageNotification("撤离支援正在路上! 坚持两分钟等待救援到达", ENotificationDurationType.Long, ENotificationIconType.EntryPoint);
                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole("Extract event has started");
                }
                await Task.Delay(60000, token);
                if (!token.IsCancellationRequested)
                    NotificationManagerClass.DisplayMessageNotification("撤离支援: 还有1分钟到达", ENotificationDurationType.Long, ENotificationIconType.EntryPoint);

                await Task.Delay(60000, token);
                NotificationManagerClass.DisplayMessageNotification("10", ENotificationDurationType.Default, ENotificationIconType.EntryPoint);
                await Task.Delay(1000, token);
                NotificationManagerClass.DisplayMessageNotification("9", ENotificationDurationType.Default, ENotificationIconType.EntryPoint);
                await Task.Delay(1000, token);
                NotificationManagerClass.DisplayMessageNotification("8", ENotificationDurationType.Default, ENotificationIconType.EntryPoint);
                await Task.Delay(1000, token);
                NotificationManagerClass.DisplayMessageNotification("7", ENotificationDurationType.Default, ENotificationIconType.EntryPoint);
                await Task.Delay(1000, token);
                NotificationManagerClass.DisplayMessageNotification("6", ENotificationDurationType.Default, ENotificationIconType.EntryPoint);
                await Task.Delay(1000, token);
                NotificationManagerClass.DisplayMessageNotification("5", ENotificationDurationType.Default, ENotificationIconType.EntryPoint);
                await Task.Delay(1000, token);
                NotificationManagerClass.DisplayMessageNotification("4", ENotificationDurationType.Default, ENotificationIconType.EntryPoint);
                await Task.Delay(1000, token);
                NotificationManagerClass.DisplayMessageNotification("3", ENotificationDurationType.Default, ENotificationIconType.EntryPoint);
                await Task.Delay(1000, token);
                NotificationManagerClass.DisplayMessageNotification("2", ENotificationDurationType.Default, ENotificationIconType.EntryPoint);
                await Task.Delay(1000, token);
                NotificationManagerClass.DisplayMessageNotification("1", ENotificationDurationType.Default, ENotificationIconType.EntryPoint);
                await Task.Delay(1000, token);
                NotificationManagerClass.DisplayMessageNotification("救援已到达", ENotificationDurationType.Default, ENotificationIconType.EntryPoint);

                EndByExitTrigerScenario.GInterface129 exfilSession = Singleton<AbstractGame>.Instance as EndByExitTrigerScenario.GInterface129;
                exfilSession.StopSession(GamePlayerOwner.MyPlayer.ProfileId, ExitStatus.Survived, Singleton<GameWorld>.Instance.ExfiltrationController.ExfiltrationPoints.FirstOrDefault().name);

                _pmcExfilEventRunning = false;
                _mouseInputCountE = 0;
            }
        }

        public void ExfilNow()
        {
            EndByExitTrigerScenario.GInterface129 exfilSession = Singleton<AbstractGame>.Instance as EndByExitTrigerScenario.GInterface129;
            exfilSession.StopSession(GamePlayerOwner.MyPlayer.ProfileId, ExitStatus.Survived, Singleton<GameWorld>.Instance.ExfiltrationController.ExfiltrationPoints.FirstOrDefault().name);
        }

        /// <summary>
        /// 装备撤离箱：利用游戏原生空投生成空容器，玩家放入物品，150秒后锁定送达。
        /// </summary>
        public async void DoGearExfilEvent()
        {
            var token = this.destroyCancellationToken;
            try
            {
                if (_gearExfil) { Plugin.Log.LogInfo("[GearExfil] Already running"); return; }
                if (!Ready()) { Plugin.Log.LogInfo("[GearExfil] Not ready"); return; }

                var loc = ROPlayer.Location;
                if (loc == "factory4_day" || loc == "factory4_night" || loc == "laboratory" || loc == "sandbox")
                {
                    Plugin.Log.LogInfo($"[GearExfil] Map guard blocked: {loc}");
                    NotificationManagerClass.DisplayMessageNotification("此地图无法呼叫撤离箱", ENotificationDurationType.Default, ENotificationIconType.Alert);
                    return;
                }

                _gearExfil = true;
                if (FikaBridge.IAmHost()) { FikaBridge.SendRandomEventPacket(Utils.GearExfilEvent); }

                if (Utils.FindTemplates(Utils.RedFlare).FirstOrDefault() is not AmmoTemplate ammoTemplate)
                {
                    Plugin.Log.LogInfo("[GearExfil] RedFlare template not found");
                    _gearExfil = false;
                    return;
                }

                Plugin.Log.LogInfo("[GearExfil] Flare fired, waiting for airdrop...");
                var playerPos = ROPlayer.Transform.position;
                ROPlayer.HandleFlareSuccessEvent(playerPos, ammoTemplate);
                NotificationManagerClass.DisplayMessageNotification("撤离箱已呼叫，等待空投抵达...", ENotificationDurationType.Default, ENotificationIconType.Default);

                // 记录已存在的容器（空投会新增一个 LootableContainer）
                var before = new HashSet<LootableContainer>(
                    UnityEngine.Object.FindObjectsOfType<LootableContainer>());
                LootableContainer exfilCrate = null;

                await Task.Delay(5000, token); // 等飞机飞进地图

                // 每10秒检查一次新增容器，总共3分钟（18次，性能无影响）
                for (int i = 0; i < 18 && !token.IsCancellationRequested; i++)
                {
                    await Task.Delay(10000, token);
                    foreach (var c in UnityEngine.Object.FindObjectsOfType<LootableContainer>())
                    {
                        if (!before.Contains(c) && Vector3.Distance(c.transform.position, playerPos) < 300f)
                        {
                            exfilCrate = c;
                            break;
                        }
                    }
                    if (exfilCrate != null) break;
                }

                if (exfilCrate == null) { Plugin.Log.LogInfo("[GearExfil] Container not found within timeout"); _gearExfil = false; return; }

                Plugin.Log.LogInfo($"[GearExfil] Container found: {exfilCrate.name}, clearing...");
                ClearContainerItems(exfilCrate);
                Plugin.Log.LogInfo("[GearExfil] First clear done, waiting for landing...");

                Vector3 lastPos = exfilCrate.transform.position;
                int stableCount = 0;
                for (int i = 0; i < 60 && !token.IsCancellationRequested; i++)
                {
                    await Task.Delay(2000, token);
                    Vector3 curPos = exfilCrate.transform.position;
                    if (Vector3.Distance(curPos, lastPos) < 0.5f)
                    {
                        stableCount++;
                        if (stableCount >= 2) break;
                    }
                    else { stableCount = 0; }
                    lastPos = curPos;
                }

                Plugin.Log.LogInfo("[GearExfil] Landed, second clear...");
                ClearContainerItems(exfilCrate);

                _activeExfilCrate = exfilCrate;
                Plugin.Log.LogInfo("[GearExfil] Timer started: 150s");
                NotificationManagerClass.DisplayMessageNotification("撤离箱已打开！你有 2 分 30 秒存放战利品。", ENotificationDurationType.Long, ENotificationIconType.Default);

                // 150s 计时，途中提醒
                await Task.Delay(90000, token);
                if (!token.IsCancellationRequested)
                    NotificationManagerClass.DisplayMessageNotification("撤离箱: 剩余1分钟", ENotificationDurationType.Default, ENotificationIconType.Default);
                await Task.Delay(50000, token);
                if (!token.IsCancellationRequested)
                    NotificationManagerClass.DisplayMessageNotification("撤离箱: 剩余10秒", ENotificationDurationType.Default, ENotificationIconType.Default);
                await Task.Delay(10000, token);

                exfilCrate.Lock();
                NotificationManagerClass.DisplayMessageNotification("撤离箱已锁定！物品将送达仓库。", ENotificationDurationType.Long, ENotificationIconType.Default);
                Utils.SendExfilBox(exfilCrate);

                _activeExfilCrate = null;
                _gearExfil = false;
            }
            catch (Exception ex)
            {
                Plugin.Log.LogError($"[DoGearExfilEvent] failed: {ex}");
                _activeExfilCrate = null;
                _gearExfil = false;
            }
        }

        private static void ClearContainerItems(LootableContainer container)
        {
            try
            {
                var owner = container.ItemOwner;
                if (owner?.MainStorage == null) return;

                foreach (var grid in owner.MainStorage)
                {
                    if (grid?.Items == null) continue;
                    // Items 是视图，Remove 会修改权威数据源 ContainedItems
                    foreach (var item in grid.Items.ToArray())
                    {
                        try
                        {
                            var result = InteractionsHandlerClass.Remove(item, owner, false);
                            if (result.Failed)
                                result = InteractionsHandlerClass.RemoveWithoutRestrictions(item, owner);
                            if (result.Succeeded)
                                result.Value.RaiseEvents(owner, CommandStatus.Succeed);
                        }
                        catch { }
                    }
                }
            }
            catch (Exception ex)
            {
                Plugin.Log.LogInfo($"[Clear] Exception: {ex.Message}");
            }
        }

        /// <summary>
        /// 玩家死亡或断线时调用：如果存在活跃的撤离箱，自动发送箱内物品以保全战利品。
        /// </summary>
        public static void TrySendExfilCrateOnDeath()
        {
            if (_activeExfilCrate != null)
            {
                try
                {
                    _activeExfilCrate.Lock();
                    Utils.SendExfilBox(_activeExfilCrate);
                    _activeExfilCrate = null;
                    _gearExfil = false;
                    if (ConfigController.DebugConfig.DebugMode) {
                        Utils.LogToServerConsole("[TrySendExfilCrateOnDeath] Crate items sent on death.");
                    }
                }
                catch (Exception ex)
                {
                    Plugin.Log.LogError($"[TrySendExfilCrateOnDeath] failed: {ex}");
                    _activeExfilCrate = null;
                }
            }
        }

        public void CleanForNewEvent()
        {
            _pswitchs = null;
            _keydoor = null;
            _lamp = null;
            _objectsFound = false;
        }

        public void CheckForFlag()
        {
            //Check flags and adjust accordingly
            if (JsonHandler.CheckFilePath("TraderRep", "Flags"))
            {
                JsonHandler.ReadFlagFile("TraderRep", "Flags");

                if (ConfigController.flags.traderRepFlag)
                {
                    CorrectRep();
                }
            }
        }

        private IEnumerator RestoreMetabolism(float originalEnergyRate, float originalHydrationRate)
        {
            yield return new WaitForSeconds(450f);
            if (_metabolismDisabled && ROPlayer != null)
                NotificationManagerClass.DisplayMessageNotification("代谢事件: 铁胃效果剩余7.5分钟", ENotificationDurationType.Long, ENotificationIconType.Default);

            yield return new WaitForSeconds(390f);
            if (_metabolismDisabled && ROPlayer != null)
                NotificationManagerClass.DisplayMessageNotification("代谢事件: 铁胃效果将在1分钟后消退", ENotificationDurationType.Long, ENotificationIconType.Default);

            yield return new WaitForSeconds(60f);
            if (_metabolismDisabled && ROPlayer != null && ROPlayer.ActiveHealthController != null)
            {
                AccessTools.Property(typeof(ActiveHealthController), "EnergyRate").SetValue(
                    ROPlayer.ActiveHealthController, originalEnergyRate);
                AccessTools.Property(typeof(ActiveHealthController), "HydrationRate").SetValue(
                    ROPlayer.ActiveHealthController, originalHydrationRate);
                _metabolismDisabled = false;
                NotificationManagerClass.DisplayMessageNotification("代谢事件: 你的铁胃效果消退了。", ENotificationDurationType.Long, ENotificationIconType.Default);
            }
        }
        #endregion
        
        //
        //
        //

        public bool Ready()
        {
            return ROGameWorld != null && ROGameWorld.AllAlivePlayersList != null && ROGameWorld.AllAlivePlayersList.Count > 0 && !(ROPlayer is HideoutPlayer);
        }
    }
}
