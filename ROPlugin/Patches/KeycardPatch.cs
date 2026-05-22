using EFT;
using EFT.Interactive;
using EFT.InventoryLogic;
using System.Reflection;
using SPT.Reflection.Patching;
using Diz.LanguageExtensions;
using RaidOverhaul.Helpers;

namespace RaidOverhaul.Patches
{
    internal class KeycardPatch : ModulePatch
    {
        protected override MethodBase GetTargetMethod() { return typeof(KeycardDoor).GetMethod("UnlockOperation", BindingFlags.Public | BindingFlags.Instance); }

        [PatchPrefix]
        private static bool PatchPrefix(
            ref GStruct457<GClass3424> __result,
            KeyComponent key,
            Player player,
            KeycardDoor __instance)
        {
            // Let the original method handle non-VIP keycard attempts
            if (key.Template.KeyId != Utils.VipKeycard)
            {
                return true;
            }

            // VIP Keycard logic — intercept only for universal keycards
            Error canInteract = player.MovementContext.CanInteract;
            if (canInteract != null)
            {
                __result = canInteract;
                return false;
            }

            key.NumberOfUsages++;
            if (key.NumberOfUsages >= key.Template.MaximumNumberOfUsage && key.Template.MaximumNumberOfUsage > 0)
            {
                var discardResult = InteractionsHandlerClass.Discard(
                    key.Item,
                    (TraderControllerClass)key.Item.Parent.GetOwner(),
                    false
                );

                if (discardResult.Failed)
                {
                    __result = discardResult.Error;
                    return false;
                }
                __result = new GClass3424(key, discardResult.Value, true);
                return false;
            }
            __result = new GClass3424(key, null, true);
            return false;
        }
    }
}