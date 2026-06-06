using EFT;
using System.Reflection;
using EFT.Interactive;
using EFT.Communications;
using SPT.Reflection.Patching;

namespace RaidOverhaul.Patches
{
    internal class EventExfilPatch : ModulePatch
    {
        internal static bool IsLockdown = false;

        internal static bool awaitDrop = false;

        protected override MethodBase GetTargetMethod() => typeof(ExfiltrationRequirement).GetMethod("Met", BindingFlags.Instance | BindingFlags.Public);

        [PatchPostfix]
        private static void Postfix(Player player, ref bool __result)
        {
            if (player.IsYourPlayer)
            {
                if (IsLockdown)
                {
                    NotificationManagerClass.DisplayMessageNotification("封锁期间无法撤离", ENotificationDurationType.Long, ENotificationIconType.Alert);
                }
            }
            __result = true;
        }
    }
}