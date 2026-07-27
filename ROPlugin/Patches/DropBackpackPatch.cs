using EFT;
using System;
using System.Reflection;
using SPT.Reflection.Patching;
using RaidOverhaul.Configs;
using RaidOverhaul.Controllers;

namespace RaidOverhaul.Patches
{
    internal class OnDeadPatch : ModulePatch
    {
        protected override MethodBase GetTargetMethod() =>
            typeof(Player).GetMethod("OnDead", BindingFlags.Instance | BindingFlags.Public);

        [PatchPostfix]
        private static void PatchPostFix(ref Player __instance)
        {
            if (DJConfig.DropBackPack.Value && DJConfig.DropBackPackChance.Value > new Random().NextDouble())
            {
                __instance.DropBackpack();
            }

            // 玩家死亡时保全撤离箱内物品
            EventController.TrySendExfilCrateOnDeath();
        }
    }
}