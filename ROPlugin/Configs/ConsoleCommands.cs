using EFT.UI;
using EFT.InventoryLogic;
using System;
using System.Linq;
using RaidOverhaul.Helpers;

namespace RaidOverhaul.Configs
{
    internal static class ConsoleCommands
    {
        public static void RegisterCC()
        {
            ConsoleScreen.Processor.RegisterCommand("DoHealEvent",          new Action(Plugin.ECScript.DoHealPlayer));
            ConsoleScreen.Processor.RegisterCommand("DoDamageEvent",        new Action(Plugin.ECScript.DoDamageEvent));
            ConsoleScreen.Processor.RegisterCommand("DoArmorEvent",         new Action(Plugin.ECScript.DoArmorRepair));
            ConsoleScreen.Processor.RegisterCommand("DoAirdropEvent",       new Action(Plugin.ECScript.DoAirdropEvent));
            ConsoleScreen.Processor.RegisterCommand("DoFunnyEvent",         new Action(Plugin.ECScript.DoFunny));
            ConsoleScreen.Processor.RegisterCommand("DoBlackoutEvent",      new Action(Plugin.ECScript.DoBlackoutEvent));
            ConsoleScreen.Processor.RegisterCommand("DoSkillEvent",         new Action(Plugin.ECScript.DoSkillEvent));
            ConsoleScreen.Processor.RegisterCommand("DoMetabolismEvent",    new Action(Plugin.ECScript.DoMetabolismEvent));
            ConsoleScreen.Processor.RegisterCommand("DoMalfEvent",          new Action(Plugin.ECScript.DoMalfEvent));
            ConsoleScreen.Processor.RegisterCommand("DoLLEvent",            new Action(Plugin.ECScript.DoLLEvent));
            ConsoleScreen.Processor.RegisterCommand("DoBerserkEvent",       new Action(Plugin.ECScript.DoBerserkEvent));
            ConsoleScreen.Processor.RegisterCommand("DoWeightEvent",        new Action(Plugin.ECScript.DoWeightEvent));
            ConsoleScreen.Processor.RegisterCommand("DoMaxLLEvent",         new Action(Plugin.ECScript.DoMaxLLEvent));
            ConsoleScreen.Processor.RegisterCommand("DoRepCorrect",         new Action(Plugin.ECScript.CorrectRep));
            ConsoleScreen.Processor.RegisterCommand("DoLockdownEvent",      new Action(Plugin.ECScript.DoLockDownEvent));
            ConsoleScreen.Processor.RegisterCommand("DoArtilleryEvent",     new Action(Plugin.ECScript.DoArtyEvent));
            ConsoleScreen.Processor.RegisterCommand("RunTrain",             new Action(Plugin.ECScript.RunTrain));
            ConsoleScreen.Processor.RegisterCommand("DoPmcExfil",           new Action(Plugin.ECScript.DoPmcExfilEvent));
            ConsoleScreen.Processor.RegisterCommand("ExfilNow",             new Action(Plugin.ECScript.ExfilNow));
            ConsoleScreen.Processor.RegisterCommand("GetWeaponIds",         new Action(GetAllWeaponIDs));
            ConsoleScreen.Processor.RegisterCommand("GetAllIds",            new Action(GetAllItemIDs));
            ConsoleScreen.Processor.RegisterCommand("DoGearExfil",       new Action(Plugin.ECScript.DoGearExfilEvent));
        }
        
        private static void GetAllWeaponIDs()
        {
            var weapons = Plugin.Session.Profile.Inventory?.AllRealPlayerItems;
            weapons = weapons.Where(x => x is Weapon);

            foreach (var weapon in weapons)
            {
                Plugin.Log.LogInfo($"Template ID: {weapon.TemplateId}, locale name: {weapon.LocalizedName()}");
                Utils.LogToServerConsole($"Template ID: {weapon.TemplateId}, locale name: {weapon.LocalizedName()}");
            }
        }
        
        private static void GetAllItemIDs()
        {
            var items = Plugin.Session.Profile.Inventory?.AllRealPlayerItems;
            items = items.Where(x => x is Item);

            foreach (var item in items)
            {
                Plugin.Log.LogInfo($"Template ID: {item.TemplateId}, locale name: {item.LocalizedName()}");
                Utils.LogToServerConsole($"Template ID: {item.TemplateId}, locale name: {item.LocalizedName()}");
            }
        }
    }
}