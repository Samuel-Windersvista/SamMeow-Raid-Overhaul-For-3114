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

                NotificationManagerClass.DisplayMessageNotification("Heal Event: On your feet you ain't dead yet.", ENotificationDurationType.Long, ENotificationIconType.Default);
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

                NotificationManagerClass.DisplayMessageNotification("Heart Attack Event: Better get to a medic quick, you don't have long left.", ENotificationDurationType.Long, ENotificationIconType.Alert);
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

                NotificationManagerClass.DisplayMessageNotification("Armor Repair Event: All equipped armor repaired... nice!", ENotificationDurationType.Long, ENotificationIconType.Default);
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

                    NotificationManagerClass.DisplayMessageNotification("Aidrop Event: Incoming Airdrop!", ENotificationDurationType.Long, ENotificationIconType.Quest);

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

                    NotificationManagerClass.DisplayMessageNotification("Heart Attack Event: Nice knowing ya, you've got 10 seconds", ENotificationDurationType.Long, ENotificationIconType.Alert);

                    await Task.Delay(10000, token);

                    NotificationManagerClass.DisplayMessageNotification("jk", ENotificationDurationType.Long, ENotificationIconType.Quest);

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

                NotificationManagerClass.DisplayMessageNotification("Blackout Event: All power switches and lights disabled for 10 minutes", ENotificationDurationType.Long, ENotificationIconType.Alert);

                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole("Blackout Event: All power switches and lights disabled for 10 minutes");
                }

                await Task.Delay(600000, token);

                foreach (Switch pSwitch in _pswitchs)
                {
                    typeof(Switch).GetMethod("Unlock", BindingFlags.Instance | BindingFlags.Public).Invoke(pSwitch, null);
                }

                foreach (LampController lamp in _lamp)
                {
                    lamp.Switch(Turnable.EState.On);
                    lamp.enabled = true;
                }

                NotificationManagerClass.DisplayMessageNotification("Blackout Event over", ENotificationDurationType.Long, ENotificationIconType.Quest);

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
                    NotificationManagerClass.DisplayMessageNotification("Skill Event: You've advanced a skill to the next level!", ENotificationDurationType.Long, ENotificationIconType.Quest);
                }
                else
                {
                    if (level <= 0) { return; }

                    selectedSkill.SetLevel(level - 1);
                    _skillEventCount++;
                    NotificationManagerClass.DisplayMessageNotification("Skill Event: You've lost a skill level, unlucky!", ENotificationDurationType.Long, ENotificationIconType.Quest);
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
                        NotificationManagerClass.DisplayMessageNotification("Metabolism Event: You've got an iron stomach, No hunger or hydration drain!", ENotificationDurationType.Long, ENotificationIconType.Quest);
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

                        NotificationManagerClass.DisplayMessageNotification("Metabolism Event: Your metabolism has slowed. Decreased hunger and hydration drain!", ENotificationDurationType.Long, ENotificationIconType.Quest);
                    }
                    else if (chance >= 67 && chance <= 100f)
                    {
                        AccessTools.Property(typeof(ActiveHealthController), "EnergyRate").SetValue(
                            ROPlayer.ActiveHealthController,
                            ROPlayer.ActiveHealthController.EnergyRate * 1.20f);

                        AccessTools.Property(typeof(ActiveHealthController), "HydrationRate").SetValue(
                            ROPlayer.ActiveHealthController,
                            ROPlayer.ActiveHealthController.HydrationRate * 1.20f);

                        NotificationManagerClass.DisplayMessageNotification("Metabolism Event: Your metabolism has fastened. Increased hunger and hydration drain!", ENotificationDurationType.Long, ENotificationIconType.Quest);
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

                        NotificationManagerClass.DisplayMessageNotification("Malfunction Event: Be careful not to jam up!", ENotificationDurationType.Long, ENotificationIconType.Alert);

                        if (ConfigController.DebugConfig.DebugMode) {
                            Utils.LogToServerConsole("Malfunction Event has started");
                        }

                        await Task.Delay(300000, token);
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

                        NotificationManagerClass.DisplayMessageNotification("Malfunction Event: Your weapon has had time to cool off, shouldn't have any more troubles!", ENotificationDurationType.Long, ENotificationIconType.Default);

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
                        NotificationManagerClass.DisplayMessageNotification("Trader Event: A random Trader has gained a little more respect for you.", ENotificationDurationType.Default, ENotificationIconType.Achievement);

                        if (ConfigController.DebugConfig.DebugMode) {
                            Utils.LogToServerConsole("Trader Rep Gain Event has run");
                        }
                    }

                    else if (chance is >= 50 && chance is <= 100)
                    {
                        if (Session.Profile.TradersInfo[Trader].Standing >= 0.05)
                        {
                            Session.Profile.TradersInfo[Trader].SetStanding(Session.Profile.TradersInfo[Trader].Standing - 0.05);
                            NotificationManagerClass.DisplayMessageNotification("Trader Event: A random Trader has lost a little faith in you.", ENotificationDurationType.Default, ENotificationIconType.Achievement);

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
                        NotificationManagerClass.DisplayMessageNotification("Trader Event: A random Trader has gained a little more respect for you.", ENotificationDurationType.Default, ENotificationIconType.Achievement);

                        if (ConfigController.DebugConfig.DebugMode) {
                            Utils.LogToServerConsole("Trader Rep Gain Event has run");
                        }
                    }

                    else if (chance is >= 50 && chance is <= 100)
                    {
                        if (Session.Profile.TradersInfo[Trader].Standing >= 0.05)
                        {
                            Session.Profile.TradersInfo[Trader].SetStanding(Session.Profile.TradersInfo[Trader].Standing - 0.05);
                            NotificationManagerClass.DisplayMessageNotification("Trader Event: A random Trader has lost a little faith in you.", ENotificationDurationType.Default, ENotificationIconType.Achievement);

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

                        NotificationManagerClass.DisplayMessageNotification("Berserk Event: You're seeing red, I feel bad for any scavs and PMCs in your way!", ENotificationDurationType.Long, ENotificationIconType.Alert);

                        if (ConfigController.DebugConfig.DebugMode) {
                            Utils.LogToServerConsole("Berserk Event has started");
                        }

                        await Task.Delay(180000, token);
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

                        NotificationManagerClass.DisplayMessageNotification("Berserk Event: Your vision has cleared up, I guess you got all your rage out!", ENotificationDurationType.Long, ENotificationIconType.Alert);

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

                            NotificationManagerClass.DisplayMessageNotification("Weight Event: Better hunker down until you get your stamina back!", ENotificationDurationType.Long, ENotificationIconType.Alert);

                            if (ConfigController.DebugConfig.DebugMode) {
                                Utils.LogToServerConsole("Weight Event has started");
                            }

                            await Task.Delay(180000, token);
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

                            NotificationManagerClass.DisplayMessageNotification("Weight Event: You're rested and ready to get back out there!", ENotificationDurationType.Long, ENotificationIconType.Alert);

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

                            NotificationManagerClass.DisplayMessageNotification("Weight Event: You feel light on your feet, stock up on everything you can!", ENotificationDurationType.Long, ENotificationIconType.Alert);

                            if (ConfigController.DebugConfig.DebugMode) {
                                Utils.LogToServerConsole("Weight Event has started");
                            }

                            await Task.Delay(180000, token);
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

                            NotificationManagerClass.DisplayMessageNotification("Weight Event: You've lost your extra energy, hope you didn't fill your backpack too much!", ENotificationDurationType.Long, ENotificationIconType.Alert);

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

                            NotificationManagerClass.DisplayMessageNotification("Shopping Spree Event: All Traders have maxed out standing. Better get to them in the next ten minutes!", ENotificationDurationType.Default, ENotificationIconType.Mail);

                            if (ConfigController.DebugConfig.DebugMode) {
                                Utils.LogToServerConsole("Shopping Spree Event has started");
                            }

                            await Task.Delay(600000, token);

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

                            NotificationManagerClass.DisplayMessageNotification("Shopping Spree Event: All Traders standing has been set back to normal. This is a fickle business after all.", ENotificationDurationType.Default, ENotificationIconType.Mail);

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

                            NotificationManagerClass.DisplayMessageNotification("Shopping Spree Event: All Traders have maxed out standing. Better get to them in the next ten minutes!", ENotificationDurationType.Default, ENotificationIconType.Mail);

                            if (ConfigController.DebugConfig.DebugMode) {
                                Utils.LogToServerConsole("Shopping Spree Event has started");
                            }

                            await Task.Delay(600000, token);

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

                            NotificationManagerClass.DisplayMessageNotification("Shopping Spree Event: All Traders standing has been set back to normal. This is a fickle business after all.", ENotificationDurationType.Default, ENotificationIconType.Mail);

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
                    NotificationManagerClass.DisplayMessageNotification("Lockdown Event: All extracts are unavailable for 15 minutes", ENotificationDurationType.Long, ENotificationIconType.EntryPoint);

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

                    await Task.Delay(600000, token);

                    foreach (var exfil in exfils)
                    {
                        if (!exfil.Settings.Name.Contains("Elevator"))
                        {
                            exfil.Enable();
                        }
                    }

                    EventExfilPatch.IsLockdown = false;
                    _exfilLockdown = false;

                    NotificationManagerClass.DisplayMessageNotification("Lockdown Event: Extracts are available again. Time to get out of there!", ENotificationDurationType.Long, ENotificationIconType.EntryPoint);

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
                    NotificationManagerClass.DisplayMessageNotification("Artillery Event: Get to cover. Shelling will commence in 30 seconds", ENotificationDurationType.Long, ENotificationIconType.EntryPoint);

                    if (ConfigController.DebugConfig.DebugMode) {
                        Utils.LogToServerConsole("Artillery Event has started");
                    }

                    await Task.Delay(30000, token);

                    NotificationManagerClass.DisplayMessageNotification("Artillery Event: Shelling has started", ENotificationDurationType.Long, ENotificationIconType.EntryPoint);
                    
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
            
            NotificationManagerClass.DisplayMessageNotification("Train is arriving. Get out if you're ready!", ENotificationDurationType.Long, ENotificationIconType.EntryPoint);

            if (ConfigController.DebugConfig.DebugMode) {
                Utils.LogToServerConsole("Train is arriving");
            }

            await Task.Delay(420000, token);
            
            NotificationManagerClass.DisplayMessageNotification("Train is leaving the station.", ENotificationDurationType.Long, ENotificationIconType.EntryPoint);
            
            if (ConfigController.DebugConfig.DebugMode) {
                Utils.LogToServerConsole("Train is leaving");
            }

            _mouseInputCountT = 0;
        }

        public void FlareLogicExfil()
        {
            var specialFlareInHands = ROPlayer.HandsController.Item.TemplateId == Utils.SpecialExfilFlare;

            if (!specialFlareInHands) { return; }

            if (specialFlareInHands && Ready())
            {
                if (Input.GetKeyDown(KeyCode.Mouse0) && _mouseInputCountE < 1)
                {
                    _mouseInputCountE++;
                    DoPmcExfilEvent();
                }
            }
        }

        public async void DoPmcExfilEvent()
        {
            var token = this.destroyCancellationToken;
            if (!_pmcExfilEventRunning)
            {
                FikaBridge.SendFlareEventPacket(Utils.PmcExfil);

                _pmcExfilEventRunning = true;

                await Task.Delay(3000, token);
                NotificationManagerClass.DisplayMessageNotification("Extract is on it's way! Hold out for two minutes for help to arrive", ENotificationDurationType.Long, ENotificationIconType.EntryPoint);
                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole("Extract event has started");
                }
                await Task.Delay(120000, token);
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
                NotificationManagerClass.DisplayMessageNotification("Help has arrived", ENotificationDurationType.Default, ENotificationIconType.EntryPoint);

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
            yield return new WaitForSeconds(900f);
            if (_metabolismDisabled && ROPlayer != null && ROPlayer.ActiveHealthController != null)
            {
                AccessTools.Property(typeof(ActiveHealthController), "EnergyRate").SetValue(
                    ROPlayer.ActiveHealthController, originalEnergyRate);
                AccessTools.Property(typeof(ActiveHealthController), "HydrationRate").SetValue(
                    ROPlayer.ActiveHealthController, originalHydrationRate);
                _metabolismDisabled = false;
                NotificationManagerClass.DisplayMessageNotification("Metabolism Event: Your iron stomach has worn off.", ENotificationDurationType.Long, ENotificationIconType.Default);
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
