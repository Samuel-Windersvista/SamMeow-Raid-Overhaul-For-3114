using System;
using System.Linq;
using System.Collections.Generic;
using RaidOverhaul.Controllers;
using RaidOverhaul.Configs;

namespace RaidOverhaul.Helpers
{
    public static class Weighting
    {
        private static readonly Random _rng = new Random();
        public static List<(Action, int)> weightedEvents;
        public static List<(Action, int)> weightedDoorMethods;

        public static void InitWeightings()
        {
            InitDoorWeighting();
            InitEventWeighting();
        }

        public static void DoRandomEvent(List<(Action, int)> weighting)
        {
            // Shuffle the list to randomize the order
            weighting = weighting.OrderBy(_ => Guid.NewGuid()).ToList();

            // Calculate total weight
            int totalWeight = weighting.Sum(pair => pair.Item2);

            // Generate a random number between 1 and totalWeight
            int randomNum = _rng.Next(1, totalWeight + 1);

            // Find the method to call based on the random number
            foreach (var (method, weight) in weighting)
            {
                randomNum -= weight;
                if (randomNum <= 0)
                {
                    // Call the selected method
                    method();
                    break;
                }
            }
        }

        private static void InitDoorWeighting()
        {
            var _switchWeighting = DJConfig.DoorEventsToEnable.Value.HasFlag(DJConfig.DoorEvents.PowerOn) ? ConfigController.EventConfig.DoorEvents.SwitchWeights : 0;
            var _doorWeighting = DJConfig.DoorEventsToEnable.Value.HasFlag(DJConfig.DoorEvents.DoorUnlock) ? ConfigController.EventConfig.DoorEvents.LockedDoorWeights : 0;
            var _keycardWeighting = DJConfig.DoorEventsToEnable.Value.HasFlag(DJConfig.DoorEvents.KDoorUnlock) ? ConfigController.EventConfig.DoorEvents.KeycardWeights : 0;

            weightedDoorMethods = new List<(Action, int)>
            {
                (Plugin.DCScript.PowerOn,     _switchWeighting),
                (Plugin.DCScript.DoUnlock,    _doorWeighting),
                (Plugin.DCScript.DoKUnlock,   _keycardWeighting)
            };
        }

        private static void InitEventWeighting()
        {
            var _damageWeighting = DJConfig.RandomEventsToEnable.Value.HasFlag(DJConfig.RaidEvents.Damage) ? ConfigController.EventConfig.RaidEvents.DamageEventWeights : 0;
            var _airdropWeighting = DJConfig.RandomEventsToEnable.Value.HasFlag(DJConfig.RaidEvents.Airdrop) ? ConfigController.EventConfig.RaidEvents.AirdropEventWeights : 0;
            var _blackoutWeighting = DJConfig.RandomEventsToEnable.Value.HasFlag(DJConfig.RaidEvents.Blackout) ? ConfigController.EventConfig.RaidEvents.BlackoutEventWeights : 0;
            var _jokeWeighting = DJConfig.RandomEventsToEnable.Value.HasFlag(DJConfig.RaidEvents.NoJokesHere) ? ConfigController.EventConfig.RaidEvents.JokeEventWeights : 0;
            var _healWeighting = DJConfig.RandomEventsToEnable.Value.HasFlag(DJConfig.RaidEvents.Heal) ? ConfigController.EventConfig.RaidEvents.HealEventWeights : 0;
            var _armorWeighting = DJConfig.RandomEventsToEnable.Value.HasFlag(DJConfig.RaidEvents.ArmorRepair) ? ConfigController.EventConfig.RaidEvents.ArmorEventWeights : 0;
            var _skillWeighting = DJConfig.RandomEventsToEnable.Value.HasFlag(DJConfig.RaidEvents.Skill) ? ConfigController.EventConfig.RaidEvents.SkillEventWeights : 0;
            var _metWeighting = DJConfig.RandomEventsToEnable.Value.HasFlag(DJConfig.RaidEvents.Metabolism) ? ConfigController.EventConfig.RaidEvents.MetabolismEventWeights : 0;
            var _malfWeighting = DJConfig.RandomEventsToEnable.Value.HasFlag(DJConfig.RaidEvents.Malfunction) ? ConfigController.EventConfig.RaidEvents.MalfEventWeights : 0;
            var _traderWeighting = DJConfig.RandomEventsToEnable.Value.HasFlag(DJConfig.RaidEvents.Trader) ? ConfigController.EventConfig.RaidEvents.TraderEventWeights : 0;
            var _berserkWeighting = DJConfig.RandomEventsToEnable.Value.HasFlag(DJConfig.RaidEvents.Berserk) ? ConfigController.EventConfig.RaidEvents.BerserkEventWeights : 0;
            var _weightWeightingLOL = DJConfig.RandomEventsToEnable.Value.HasFlag(DJConfig.RaidEvents.Weight) ? ConfigController.EventConfig.RaidEvents.WeightEventWeights : 0;
            var _maxLLWeighting = DJConfig.RandomEventsToEnable.Value.HasFlag(DJConfig.RaidEvents.ShoppingSpree) ? ConfigController.EventConfig.RaidEvents.MaxLLEventWeights : 0;
            var _exfilWeighting = DJConfig.RandomEventsToEnable.Value.HasFlag(DJConfig.RaidEvents.ExfilLockdown) ? ConfigController.EventConfig.RaidEvents.ExfilEventWeights : 0;
            var _artyWeighting = DJConfig.RandomEventsToEnable.Value.HasFlag(DJConfig.RaidEvents.Artillery) ? ConfigController.EventConfig.RaidEvents.ArtilleryEventWeights : 0;

            weightedEvents = new List<(Action, int)>
            {
                (Plugin.ECScript.DoDamageEvent,     _damageWeighting),
                (Plugin.ECScript.DoAirdropEvent,    _airdropWeighting),
                (Plugin.ECScript.DoBlackoutEvent,   _blackoutWeighting),
                (Plugin.ECScript.DoFunny,           _jokeWeighting),
                (Plugin.ECScript.DoHealPlayer,      _healWeighting),
                (Plugin.ECScript.DoArmorRepair,     _armorWeighting),
                (Plugin.ECScript.DoSkillEvent,      _skillWeighting),
                (Plugin.ECScript.DoMetabolismEvent, _metWeighting),
                (Plugin.ECScript.DoMalfEvent,       _malfWeighting),
                (Plugin.ECScript.DoLLEvent,         _traderWeighting),
                (Plugin.ECScript.DoBerserkEvent,    _berserkWeighting),
                (Plugin.ECScript.DoWeightEvent,     _weightWeightingLOL),
                (Plugin.ECScript.DoMaxLLEvent,      _maxLLWeighting),
                (Plugin.ECScript.DoLockDownEvent,   _exfilWeighting),
                (Plugin.ECScript.DoArtyEvent,       _artyWeighting)
            };
        }
    }
}
