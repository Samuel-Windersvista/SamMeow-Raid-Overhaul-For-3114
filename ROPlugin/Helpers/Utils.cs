using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Collections;
using System.Threading.Tasks;
using System.Collections.Generic;
using Comfort.Common;
using HarmonyLib;
using BepInEx.Logging;
using Newtonsoft.Json;
using SPT.Common.Http;
using UnityEngine;
using EFT;
using EFT.Weather;
using EFT.Interactive;
using EFT.CameraControl;
using EFT.InventoryLogic;
using RaidOverhaul.Controllers;

namespace RaidOverhaul.Helpers
{
    public static class Utils
    {
        public static FieldInfo FogField;
        public static FieldInfo LighteningThunderField;
        public static FieldInfo RainField;
        public static FieldInfo TemperatureField;

        public static readonly List<string> Traders = new List<string> {
            "54cb50c76803fa8b248b4571",     //Prapor
            "54cb57776803fa99248b456e",     //Therapist 
            "579dc571d53a0658a154fbec",     //Fence
            "58330581ace78e27b8b10cee",     //Skier 
            "5935c25fb3acc3127c3d8cd9",     //Peacekeeper 
            "5a7c2eca46aef81a7ca2145d",     //Mechanic 
            "5ac3b934156ae10c4430e83c",     //Ragman 
            "5c0647fdd443bc2504c2d371",     //Jaeger 
            "66f0eaa93f6cc015bc1f3acb"      //Req Shop
        };

        public static readonly List<string> TradersNoReq = new List<string> {
            "54cb50c76803fa8b248b4571",     //Prapor
            "54cb57776803fa99248b456e",     //Therapist 
            "579dc571d53a0658a154fbec",     //Fence
            "58330581ace78e27b8b10cee",     //Skier 
            "5935c25fb3acc3127c3d8cd9",     //Peacekeeper 
            "5a7c2eca46aef81a7ca2145d",     //Mechanic 
            "5ac3b934156ae10c4430e83c",     //Ragman 
            "5c0647fdd443bc2504c2d371"      //Jaeger
        };

        public static readonly List<string> Currency = new List<string> {
            "5449016a4bdc2d6f028b456f",     //Roubles
            "5696686a4bdc2da3298b456a",     //USD 
            "569668774bdc2da2298b4568",     //Euros
            "668b3c71042c73c6f9b00704",     //Slips 
            "66292e79a4d9da25e683ab55"      //Forms
        };

        public static readonly string ReqID = "66f0eaa93f6cc015bc1f3acb";
        public static readonly string BtrID = "656f0f98d80a697f855d34b1";
        public static readonly string SkeletonKey = "66a2fc926af26cc365283f23";
        public static readonly string VipKeycard = "66a2fc9886fbd5d38c5ca2a6";
        public static readonly string ExfilCrate = "67c957ce411e6263333a1c38";
        public static readonly string SpecialExfilFlare = "67cda57f8f59300db5c0ec5b";
        public static readonly string GearExfilFlare = "67cde89a0b1c2d3e4f5a6b7c";
        public static readonly string TrainFlare = "67cde31eea2d15e888fa7dee";
        public static readonly string RedFlare = "624c09cfbc2e27219346d955";
        public static readonly string RealismKey = "RealismMod";
        public static readonly string ROStandaloneKey = "DJ.ROStandalone";
        public static readonly string Heal = "Heal";
        public static readonly string Damage = "Damage";
        public static readonly string Repair = "Repair";
        public static readonly string Airdrop = "Airdrop";
        public static readonly string Jokes = "Jokes";
        public static readonly string Blackout = "Blackout";
        public static readonly string Skill = "Skill";
        public static readonly string Metabolism = "Metabolism";
        public static readonly string Malf = "Malf";
        public static readonly string LoyaltyLevel = "LoyaltyLevel";
        public static readonly string Berserk = "Berserk";
        public static readonly string Weight = "Weight";
        public static readonly string MaxLoyaltyLevel = "MaxLoyaltyLevel";
        public static readonly string CorrectRep = "CorrectRep";
        public static readonly string Lockdown = "Lockdown";
        public static readonly string GearExfilEvent = "GearExfilEvent";
        public static readonly string Train = "Train";
        public static readonly string PmcExfil = "PmcExfil";
        public static readonly string Artillery = "Artillery";
	    private static readonly Dictionary<string, ItemTemplate> templates = [];
        private static readonly JsonConverter[] _defaultJsonConverters = new JsonConverter[0];

        public static T Get<T>(string url) {
            var req = RequestHandler.GetJson(url);

            if (string.IsNullOrEmpty(req)) {
                throw new InvalidOperationException("The response from the server is null or empty.");
            }

            return JsonConvert.DeserializeObject<T>(req);
        }
        
        public static void LogToServerConsole(string message) {
            Plugin.Log.Log( LogLevel.Info, message);
            string info = JsonConvert.SerializeObject(message);
            RequestHandler.PostJson("/RaidOverhaul/LogToServer", info);
        }

        public static EquipmentSlot[] _armbandFAS = {
            EquipmentSlot.Pockets,
            EquipmentSlot.TacticalVest,
            EquipmentSlot.ArmBand
        };

        public static EquipmentSlot[] _armbandAAS = {
            EquipmentSlot.TacticalVest,
            EquipmentSlot.ArmorVest,
            EquipmentSlot.Headwear,
            EquipmentSlot.FaceCover,
            EquipmentSlot.Eyewear,
            EquipmentSlot.ArmBand
        };

        public static void LoadLegionSettings()
        {
            if (File.Exists(Plugin.legionJsonPath)) {
                try
                {
                    string legionSettingsJson = File.ReadAllText(Plugin.legionJsonPath);
                    Plugin.legionText = new TextAsset(legionSettingsJson);
                    Plugin.Log.LogInfo("Legion settings loaded successfully");
                }
                catch (Exception ex)
                {
                    Plugin.Log.LogError($"Error loading Legion settings from {Plugin.legionJsonPath}: {ex.Message}");
                }
            }
            else {
                Plugin.Log.LogError($"Legion settings file not found at {Plugin.legionJsonPath}");
            }
        }

        public static void GetWeatherFields()
        {
            FogField = AccessTools.Field(typeof(WeatherDebug), "Fog");
            LighteningThunderField = AccessTools.Field(typeof(WeatherDebug), "LightningThunderProbability");
            RainField = AccessTools.Field(typeof(WeatherDebug), "Rain");
            TemperatureField = AccessTools.Field(typeof(WeatherDebug), "Temperature");
        }

                public static bool IsDay(DateTime time)
        {
            if (time.Hour > 5 && time.Hour < 21)
            {
                return true;
            }
            else
            {
                return false;
            }
        }

        //
        //
        //

        private static void AddTemplatesToArray()
        {
            if (!Singleton<ItemFactoryClass>.Instantiated) { return; }

            var mongoTemplates = Singleton<ItemFactoryClass>.Instance.ItemTemplates;
            
            if (templates.Count == mongoTemplates.Count) { return; }
            foreach (var keyValuePair in mongoTemplates) { templates.Add(keyValuePair.Key.ToString(), keyValuePair.Value); }
        }

        public static ItemTemplate[] FindTemplates(string templateToFind)
        {
            AddTemplatesToArray();
            if (templates.TryGetValue(templateToFind, out var template)) { return [template]; }
            return [.. templates.Values.Where(t => t.ShortNameLocalizationKey.Localized().IndexOf(templateToFind, StringComparison.OrdinalIgnoreCase) >= 0
                                                || t.NameLocalizationKey.Localized().IndexOf(templateToFind, StringComparison.OrdinalIgnoreCase) >= 0)];
        }

        /// <summary>
        /// 将 LootableContainer 中所有网格的物品通过 trader service 发送到仓库。
        /// </summary>
        public static void SendExfilBox(LootableContainer exfilCrate)
        {
            var owner = exfilCrate.ItemOwner;
            if (owner?.MainStorage == null) { Plugin.Log.LogInfo("[SendExfil] No MainStorage"); return; }

            var allItems = new List<Item>();
            foreach (var grid in owner.MainStorage)
            {
                if (grid?.Items != null)
                    allItems.AddRange(grid.Items);
            }

            Plugin.Log.LogInfo($"[SendExfil] {allItems.Count} items in grids");

            var flatItems = Singleton<ItemFactoryClass>.Instance.TreeToFlatItems(allItems);
            Plugin.Log.LogInfo($"[SendExfil] {flatItems?.Count() ?? 0} flat items after TreeToFlatItems");

            // 走自定义路由 → MailSendService → 征用处消息送达
            RequestHandler.PutJson("/RaidOverhaul/SendExfilItems", new
            {
                items = flatItems
            }.ToJson(_defaultJsonConverters));
        }
    }
}
