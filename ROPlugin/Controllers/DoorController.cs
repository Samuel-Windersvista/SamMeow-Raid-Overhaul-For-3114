using EFT;
using System;
using UnityEngine;
using EFT.Interactive;
using EFT.Communications;
using System.Reflection;
using System.Collections;
using System.Collections.Generic;
using RaidOverhaul.Helpers;
using RaidOverhaul.Configs;
using RaidOverhaul.Fika;

namespace RaidOverhaul.Controllers
{
    internal class DoorController : MonoBehaviour
    {
        private List<Switch> _switchs = null;
        private List<Door> _door = null;
        private List<KeycardDoor> _kdoor = null;
        private bool _dooreventisRunning = false;

        private static int _doorChangedCount = 0;
        private static int _doorNotChangedCount = 0;
        private static int _lampCount = 0;

        void Update()
        {
            if (!Ready() || !DJConfig.EnableDoorEvents.Value)
            {
                if (_lampCount != 0)            { _lampCount = 0; }
                if (_doorChangedCount != 0)     { _doorChangedCount = 0; }
                if (_doorNotChangedCount != 0)  { _doorNotChangedCount = 0; }

                return;
            }

            if (_switchs == null)
            {
                _switchs = new List<Switch>(FindObjectsOfType<Switch>());
            }

            if (_door == null)
            {
                _door = new List<Door>(FindObjectsOfType<Door>());
            }

            if (_kdoor == null)
            {
                _kdoor = new List<KeycardDoor>(FindObjectsOfType<KeycardDoor>());
            }

            if (!_dooreventisRunning && FikaBridge.IAmHost())
            {
                StaticManager.Instance.StartCoroutine(DoorEvents());

                _dooreventisRunning = true;
            }

        }

        private IEnumerator DoorEvents()
        {
            yield return new WaitForSeconds(UnityEngine.Random.Range(ConfigController.EventConfig.DoorEventRangeMinimumServer, ConfigController.EventConfig.DoorEventRangeMaximumServer) * 60f);

            if (Ready() && FikaBridge.IAmHost())
            {
                Weighting.DoRandomEvent(Weighting.weightedDoorMethods);
            }

            else
            {
                _switchs = null;
                _door = null;
                _kdoor = null;
            }

            _dooreventisRunning = false;
            yield break;
        }

        #region Door Event Controller

        public void PowerOn()
        {
            if (Plugin.ROPlayer.Location != "laboratory" && Plugin.ROPlayer.Location != "rezervbase" && Plugin.ROPlayer.Location != "bigmap" && Plugin.ROPlayer.Location != "interchange")
            {
                if (ConfigController.DebugConfig.DebugMode) {
                    Plugin.Log.LogInfo("No switches available on this map, returning.");
                }
                return;
            }

            if (_switchs == null || _switchs.Count <= 0)
            {
                if (ConfigController.DebugConfig.DebugMode) {
                    Plugin.Log.LogInfo("No switches left to open, returning.");
                }
                return;
            }

            System.Random random = new System.Random();

            int selection = random.Next(_switchs.Count);
            Switch _switch = _switchs[selection];

            if (_switch.DoorState == EDoorState.Shut)
            {
                FikaBridge.SendSwitchStateChangePacket(_switch.Id);
                typeof(Switch).GetMethod("Open", BindingFlags.Instance | BindingFlags.Public).Invoke(_switch, null);

                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole("A random switch has been thrown.");
                }

                _switchs.RemoveAt(selection);
            }

            else
            {
                _door.RemoveAt(selection);
            }
        }

        public void DoUnlock()
        {
            if (_door == null || _door.Count <= 0)
            {
                if (ConfigController.DebugConfig.DebugMode) {
                    Plugin.Log.LogInfo("No locked doors available, returning.");
                }
                return;
            }

            System.Random random = new System.Random();

            int selection = random.Next(_door.Count);
            Door door = _door[selection];

            if (door.gameObject.layer != LayerMaskClass.InteractiveLayer)
            {
                if (ConfigController.DebugConfig.DebugMode) {
                    Plugin.Log.LogInfo("Chosen door isn't on the interactive layer, returning.");
                }
                return;
            }

            if (door.DoorState == EDoorState.Locked && door.Operatable && door.enabled)
            {
                FikaBridge.SendDoorStateChangePacket(door.Id);
                typeof(Door).GetMethod("Unlock", BindingFlags.Instance | BindingFlags.Public).Invoke(door, null);
                typeof(Door).GetMethod("Open", BindingFlags.Instance | BindingFlags.Public).Invoke(door, null);

                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole("A random door has been unlocked.");
                }

                _door.RemoveAt(selection);
            }

            else
            {
                _door.RemoveAt(selection);
            }
        }

        public void DoKUnlock()
        {
            if (Plugin.ROPlayer.Location != "laboratory" && Plugin.ROPlayer.Location != "interchange")
            {
                if (ConfigController.DebugConfig.DebugMode) {
                    Plugin.Log.LogInfo("No keycard doors available on this map, returning.");
                }
                return;
            }

            if (_kdoor == null || _kdoor.Count <= 0)
            {
                if (ConfigController.DebugConfig.DebugMode) {
                    Plugin.Log.LogInfo("No keycard doors left to open, returning.");
                }
                return;
            }

            System.Random random = new System.Random();

            int selection = random.Next(_kdoor.Count);
            KeycardDoor kdoor = _kdoor[selection];

            if (kdoor.DoorState == EDoorState.Locked)
            {
                FikaBridge.SendKeycardDoorStateChangePacket(kdoor.Id);
                typeof(KeycardDoor).GetMethod("Unlock", BindingFlags.Instance | BindingFlags.Public).Invoke(kdoor, null);
                typeof(KeycardDoor).GetMethod("Open", BindingFlags.Instance | BindingFlags.Public).Invoke(kdoor, null);

                if (ConfigController.DebugConfig.DebugMode) {
                    Utils.LogToServerConsole("A random keycard door has been unlocked.");
                }

                _kdoor.RemoveAt(selection);
            }

            else
            {
                _kdoor.RemoveAt(selection);
            }
        }
        #endregion

        #region Random Raid Start Events

        public static void RandomizeDefaultDoors()
        {
            if (DJConfig.EnableRaidStartEvents.Value && Plugin.ROPlayer.Location != "laboratory")
            {
                FindObjectsOfType<Door>().ExecuteForEach(door =>
                {

                    if (!door.Operatable || !door.enabled)
                    {
                        _doorNotChangedCount++;
                        return;
                    }

                    if (door.DoorState != EDoorState.Shut && door.DoorState != EDoorState.Open)
                    {
                        _doorNotChangedCount++;
                        return;
                    }

                    if (door.DoorState == EDoorState.Locked)
                    {
                        _doorNotChangedCount++;
                        return;
                    }

                    if (door.gameObject.layer != LayerMaskClass.InteractiveLayer)
                    {
                        _doorNotChangedCount++;
                        return;
                    }

                    if (UnityEngine.Random.Range(0, 100) < 50 && (door.DoorState == EDoorState.Shut))
                    {
                        FikaBridge.SendRaidStartDoorStateChangePacket(door.Id);
                        typeof(Door).GetMethod("Open", BindingFlags.Instance | BindingFlags.Public).Invoke(door, null);
                        _doorChangedCount++;
                    }

                    if (UnityEngine.Random.Range(0, 100) < 50 && (door.DoorState == EDoorState.Open))
                    {
                        FikaBridge.SendRaidStartDoorStateChangePacket(door.Id);
                        typeof(Door).GetMethod("Close", BindingFlags.Instance | BindingFlags.Public).Invoke(door, null);
                        _doorChangedCount++;
                    }
                });

                if (ConfigController.DebugConfig.DebugMode) {
                    NotificationManagerClass.DisplayMessageNotification($"[{_doorChangedCount}] total Doors have had their states changed. [{_doorNotChangedCount}] haven't been modified.", ENotificationDurationType.Long, ENotificationIconType.Default);
                    Utils.LogToServerConsole($"[{_doorChangedCount}] total Doors have had their states changed. [{_doorNotChangedCount}] haven't been modified.");
                }
            }
        }

        public static void RandomizeLampState()
        {
            if (DJConfig.EnableRaidStartEvents.Value && Plugin.ROPlayer.Location != "laboratory")
            {
                FindObjectsOfType<LampController>().ExecuteForEach(lamp =>
                {
                    if (UnityEngine.Random.Range(0, 100) < 25)
                    {
                        FikaBridge.SendRaidStartLampStateChangePacket(lamp.Id);
                        lamp.Switch(Turnable.EState.Off);
                        lamp.enabled = false;
                        _lampCount++;
                    }
                });

                if (ConfigController.DebugConfig.DebugMode) {
                    NotificationManagerClass.DisplayMessageNotification($"[{_lampCount}] total Lamps have been modified.", ENotificationDurationType.Long, ENotificationIconType.Default);
                    Utils.LogToServerConsole($"[{_lampCount}] total Lamps have been modified.");
                }
            }
        }
        #endregion

        public bool Ready()
        {
            return Plugin.ROGameWorld != null && Plugin.ROGameWorld.AllAlivePlayersList != null && Plugin.ROGameWorld.AllAlivePlayersList.Count > 0 && !(Plugin.ROPlayer is HideoutPlayer);
        }
    }
}
