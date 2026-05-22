using Comfort.Common;
using EFT;
using EFT.Interactive;
using System;
using System.Linq;
using System.Reflection;
using SPT.Reflection.Patching;
using RaidOverhaul.Helpers;

namespace RaidOverhaul.Patches
{
    internal class KeyPatch : ModulePatch
    {
        protected override MethodBase GetTargetMethod() => typeof(GetActionsClass).GetMethod(nameof(GetActionsClass.smethod_14));

        [PatchPostfix]
        public static void Postfix(ref ActionsReturnClass __result, GamePlayerOwner owner, Door door)
        {
            if (door.DoorState != EDoorState.Locked)
            {
                return;
            }

            GetActionsClass.Class1653 doorUnlockClass = new GetActionsClass.Class1653 { owner = owner, worldInteractiveObject = door };

            if (__result != null && __result.Actions != null)
            {
                if (HasKey(Utils.SkeletonKey))
                {
                    int Position = 1;
                    if (!HasKey(door.KeyId)) { Position = 0; }
                    
                    __result.Actions.Insert(Position, new ActionsTypesClass
                    {
                        Name = "Unlock With Skeleton Key",

                        Action = new Action(() =>
                        {
                            var originalKey = door.KeyId;
                            try
                            {
                                door.KeyId = Utils.SkeletonKey;
                                doorUnlockClass.key = owner.GetKey(door);
                                doorUnlockClass.method_0();
                            }
                            finally
                            {
                                door.KeyId = originalKey;
                            }
                        }),
                        Disabled = !doorUnlockClass.worldInteractiveObject.Operatable
                    });
                }
            }
        }

        private static bool HasKey(string keyId)
        {
            // Walk equipment slots directly instead of traversing all inventory items
            var equipment = Singleton<GameWorld>.Instance.MainPlayer.Profile.Inventory.Equipment;
            foreach (var slot in equipment.GetAllSlots())
            {
                if (slot.ContainedItem?.TemplateId == keyId)
                    return true;
            }
            return false;
        }
    }
}