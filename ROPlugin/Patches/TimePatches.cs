using EFT;
using TMPro;
using System;
using System.Reflection;
using System.Threading.Tasks;
using System.Reflection.Emit;
using System.Collections.Generic;
using HarmonyLib;
using EFT.UI.Map;
using EFT.Weather;
using EFT.UI.Matchmaker;
using EFT.UI.BattleTimer;
using SPT.Reflection.Patching;

namespace RaidOverhaul.Patches
{
    public struct RaidTime
    {
        internal static bool inverted = false;

        private static DateTime inverseTime
        {
            get
            {
                DateTime result = DateTime.Now.AddHours(12);
                return result.Day > DateTime.Now.Day
                       ? result.AddDays(-1)
                       : result.Day < DateTime.Now.Day
                       ? result.AddDays(1) : result;
            }
        }

        public static DateTime GetCurrTime() => DateTime.Now;
        public static DateTime GetInverseTime() => inverseTime;
        public static DateTime GetDateTime() => inverted ? GetInverseTime() : GetCurrTime();
    }

    public class GameWorldPatch : ModulePatch
    {

        protected override MethodBase GetTargetMethod() => typeof(GameWorld).GetMethod("OnGameStarted", BindingFlags.Instance | BindingFlags.Public);

        [PatchPostfix]
        static void Postfix(GameWorld __instance)
        {
            DateTime time = RaidTime.GetDateTime();
            __instance.GameDateTime.Reset(time, time, 1);
        }
    }

    public class GlobalsPatch : ModulePatch
    {
        protected override MethodBase GetTargetMethod() => typeof(TarkovApplication).GetMethod("InternalStartGame", BindingFlags.Instance | BindingFlags.Public);

        [PatchPostfix]
        static async void Postfix(TarkovApplication __instance)
        {
            while (__instance.GetClientBackEndSession() == null || __instance.GetClientBackEndSession().BackEndConfig == null)
                await Task.Yield();

            BackendConfigSettingsClass globals = __instance.GetClientBackEndSession().BackEndConfig.Config;
            globals.AllowSelectEntryPoint = true;
        }
    }

    public class EnableEntryPointPatch : ModulePatch
    {
        protected override MethodBase GetTargetMethod() => typeof(EntryPointView).GetMethod("Show", BindingFlags.Instance | BindingFlags.Public);

        [PatchPrefix]
        static void Prefix(ref bool allowSelection) => allowSelection = true;
    }

    public class UIPanelPatch : ModulePatch
    {
        protected override MethodBase GetTargetMethod() => typeof(LocationConditionsPanel).GetMethod("method_1", BindingFlags.Instance | BindingFlags.Public);

        [PatchPostfix]
        static void Postfix(
            ref TextMeshProUGUI ____currentPhaseTime,
            ref TextMeshProUGUI ____nextPhaseTime,
            LocationConditionsPanel __instance)
        {
            string curTime = RaidTime.GetCurrTime().ToString("HH:mm:ss");
            string invTime = RaidTime.GetInverseTime().ToString("HH:mm:ss");

            ____nextPhaseTime.text = invTime;
            ____currentPhaseTime.text = curTime;

            // Factory 地图检测：通过 Traverse 反射获取 LocationConditionsPanel 的 location_0 字段
            // 工厂的 day/night 是两个独立 Location（factory4_day / factory4_night），需要追加 [日间]/[夜间] 标签
            if (IsFactoryLocation(__instance))
            {
                DateTime cur = RaidTime.GetCurrTime();
                bool curIsDay = cur.Hour >= 6 && cur.Hour < 18;
                ____currentPhaseTime.text = curTime + (curIsDay ? " [日间]" : " [夜间]");
                ____nextPhaseTime.text = invTime + (curIsDay ? " [夜间]" : " [日间]");
            }
        }

        private static bool IsFactoryLocation(LocationConditionsPanel panel)
        {
            try
            {
                var location = Traverse.Create(panel).Field("location_0").GetValue();
                if (location != null)
                {
                    string id = Traverse.Create(location).Property("Id").GetValue<string>();
                    return id == "factory4_day" || id == "factory4_night";
                }
            }
            catch { }
            return false;
        }
    }

    public class TimerUIPatch : ModulePatch
    {
        protected override MethodBase GetTargetMethod() => typeof(TimerPanel).GetMethod("SetTimerText", BindingFlags.Instance | BindingFlags.Public);

        [PatchPrefix]
        static void Prefix(ref TimeSpan timeSpan) => timeSpan = new TimeSpan(RaidTime.GetDateTime().Ticks);
    }

    /// <summary>
    /// 工厂地图的时间面板补丁。工厂地图的 day/night 是两个独立 Location（factory4_day / factory4_night），
    /// 本质上是白图和夜图，不是两个时间窗口。本补丁用系统时间替换硬编码时间（与 GameWorldPatch 保持一致），
    /// 并追加 [日间] / [夜间] 标识让玩家可以区分。
    /// </summary>
    public class FactoryTimerPanelPatch : ModulePatch
    {

        protected override MethodBase GetTargetMethod()
        {
            return AccessTools.FirstMethod(typeof(LocationConditionsPanel), x => x.Name == nameof(LocationConditionsPanel.Set) && x.GetParameters()[0].Name == "session");
        }

        [PatchPostfix]
        static void Postfix(RaidSettings raidSettings, bool takeFromCurrent, MatchMakerAcceptScreen __instance)
        {
            TextMeshProUGUI timePanel;

            try 
            {
                timePanel = __instance.transform.Find("TimePanel").gameObject.transform.Find("Time").gameObject.GetComponent<TextMeshProUGUI>();
            }
            catch (Exception) { return; }

            if (raidSettings.SelectedLocation.Id == "factory4_day") {
                // 使用真实系统时间，与 GameWorldPatch 设置的 Raid 时间一致
                SetTimePanelText(timePanel, RaidTime.GetDateTime().ToString("HH:mm:ss") + " [日间]");
            }

            if (raidSettings.SelectedLocation.Id == "factory4_night") {
                // 使用真实系统时间，与 GameWorldPatch 设置的 Raid 时间一致
                SetTimePanelText(timePanel, RaidTime.GetDateTime().ToString("HH:mm:ss") + " [夜间]");
            }
        }

        static void SetTimePanelText(TextMeshProUGUI timePanel, string text)
        {
            try {
                timePanel.text = text;
            } catch(Exception) { }
        }
    }
/*
    public class ExitTimerUIPatch : ModulePatch
    {
        protected override MethodBase GetTargetMethod() => typeof(MainTimerPanel).GetMethod("UpdateTimer", BindingFlags.Instance | BindingFlags.Public);

        [PatchTranspiler]
        static IEnumerable<CodeInstruction> Transpile(IEnumerable<CodeInstruction> instructions)
        {
            int shift = 0;

            instructions.ExecuteForEach((inst) =>
            {
                if (shift == 2)
                    inst.opcode = OpCodes.Ret;
                if (shift >= 3)
                    inst.opcode = OpCodes.Nop;
                shift++;
            });

            return instructions;
        }
    }
*/
    public class WatchPatch : ModulePatch
    {
        protected override MethodBase GetTargetMethod() => typeof(Watch).GetProperty("DateTime_0", BindingFlags.Instance | BindingFlags.Public).GetGetMethod(true);

        [PatchPostfix]
        static void Postfix(ref DateTime __result)
        {
            __result = RaidTime.GetDateTime();
        }
    }
}