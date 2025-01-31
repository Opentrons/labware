For more details about this release, please see the full [technical change
log][]. For a list of currently known issues, please see the [Opentrons issue tracker][].

[technical change log]: https://github.com/Opentrons/opentrons/releases
[opentrons issue tracker]: https://github.com/Opentrons/opentrons/issues?q=is%3Aopen+is%3Aissue+label%3Abug

By installing and using Opentrons software, you agree to the Opentrons End-User License Agreement (EULA). You can view the EULA at [opentrons.com/eula](https://opentrons.com/eula).

---

## Opentrons Robot Software Changes in 8.3.0

Welcome to the v8.3.0 release of the Opentrons robot software! This release adds support for Evosep Evotips on the Flex, as well as other features.

### New Features

- Use Evosep Evotips in Python API version 2.22 protocols for protein sample purification. Only available with the Flex 96-channel pipette.

- Load a newly modified Flex 8-Channel EM 1000 µL pipette equipped with a PEEK motor component to automate emulsion applications.

### Improved Features

- Improvements to the Flex error recovery feature help protocols recover from detected stalls and collisions, saving you valuable time and resources.

---

## Opentrons Robot Software Changes in 8.2.0

Welcome to the v8.2.0 release of the Opentrons robot software! This release adds support for the Opentrons Absorbance Plate Reader Module.

### New Features

- Create and run Python protocols that use the Opentrons Absorbance Plate Reader.

### Improved Features

- Liquid presence detection no longer checks for liquid before every aspiration in a `mix()` command.

### Bug Fixes

- Error recovery no longer causes an `AssertionError` when a Python protocol changes the pipette speed.

### Known Issues

- You can't downgrade the robot software with an Absorbance Plate Reader attached. Disconnect the module first if you need to downgrade.

---

## Opentrons Robot Software Changes in 8.1.0

Welcome to the v8.1.0 release of the Opentrons robot software!

### Hardware Support

- Latest production version of Flex robots

---

## Opentrons Robot Software Changes in 8.0.0

Welcome to the v8.0.0 release of the Opentrons robot software!

### New Features

- Create, store, and run quick transfers on Flex.
- Define and use CSV runtime parameters in Python protocols.
- Detect the presence or absence of liquid in a well (Flex pipettes only), and continue or pause the protocol based on the result.
- Automatically pause Flex protocol runs when detecting overpressure, allowing for error recovery and run resumption.

### Improved Features

- Provides more partial tip pickup configurations. All multi-channel pipettes now support single and partial column pickup, and the Flex 96-channel pipette now supports row pickup.
- Improves homing behavior when a Flex protocol completes or is canceled with liquid-filled tips attached to the pipette.

### Known Issues

- During single-tip or partial-column pickup with a multi-channel pipette, tips in adjacent columns may cling to empty nozzles. Pick up tips row by row, rather than column by column, to avoid this.
- Protocol analysis and `opentrons_simulate` do not raise an error when a protocol tries to detect liquid with a pipette nozzle configuration that doesn't contain a pressure sensor (single-tip pickup with A12 or H1). Avoid using the A12 and H1 nozzles for single-tip pickup if you need to detect liquid presence within wells.
- `opentrons_simulate` describes motion to wells only with respect to the primary channel, regardless of the current pipette nozzle configuration.

---

## Opentrons Robot Software Changes in 7.5.0

Welcome to the v7.5.0 release of the Opentrons robot software!

### Hardware Support

- [Opentrons Flex HEPA/UV Module](https://opentrons.com/products/opentrons-flex-hepa-uv-module)
- Latest Flex Gripper model (serial numbers beginning `GRPV13`)

### Bug Fixes

- Fixed certain string runtime parameter values being misinterpreted as an incorrect type.
- The `opentrons_execute` command-line tool and `opentrons.execute` Python API functions now take the deck configuration of Flex into account when planning gantry movement.

### Known Issue

- The HEPA/UV Module's buttons may not respond properly after its safety shutoff is activated. This happens when the module is removed from the top of Flex while its lights are on. Power cycle the module to restore normal behavior. The module is safe to use even if you do not power cycle it.

---

## Opentrons Robot Software Changes in 7.3.1

Welcome to the v7.3.1 release of the Opentrons robot software!

### Improved Features

- Updated values for how much a tip overlaps with the pipette nozzle when the pipette picks up tips, in order to make protocols more reliable. These new values only apply to JSON protocols and Python protocols specifying API version 2.19.

---

## Opentrons Robot Software Changes in 7.3.0

Welcome to the v7.3.0 release of the Opentrons robot software!

### New Features

- Runtime parameters: read, write, and use parameters in Python protocol runs.

### Improved Features

- Automatic tip tracking is now available for all nozzle configurations.
- Flex no longer shows unnecessary pipette calibration warnings.
- Python protocols can once again set labware offsets outside of Labware Position Check.

### Changed Features

- Calling `GET /runs/{id}/commands` for a JSON protocol no longer returns a full list of queued commands. Use protocol analysis to get a full list of commands.

### Bug Fixes

- Fixed an edge case where capitalizing part of a labware load name could cause unexpected behavior or collisions.
- Fixed Python packages installed  on the OT-2 with `pip` not being found by `import` statements.

---

## Opentrons Robot Software Changes in 7.2.2

Welcome to the v7.2.2 release of the Opentrons robot software!

### Improved Features

- Improved the low-volume performance of recently produced Flex 96-Channel Pipettes.

### Bug Fixes

- Restores the ability to use the speaker and camera on OT-2.
- Restores the ability to use the camera on Flex.

---

## Opentrons Robot Software Changes in 7.2.1

Welcome to the v7.2.1 release of the Opentrons robot software!

### Bug Fixes

- Fixed an issue where OT-2 tip length calibrations created before v4.1.0 would cause a "missing calibration data" error that you could only resolve by resetting calibration.
- Fixed collision prediction being too conservative in certain conditions on Flex, leading to errors even when collisions wouldn't take place.
- Flex now properly homes after an instrument collision.
- `opentrons_simulate` now outputs entries for commands that drop tips in the default trash container in protocols that specify Python API version 2.16 or newer.

---

## Opentrons Robot Software Changes in 7.2.0

Welcome to the v7.2.0 release of the Opentrons robot software!

This update may take longer than usual if your robot has a lot of long protocols and runs stored on it. Allow *approximately 20 minutes* for your robot to restart. This delay will only happen once.

If you don't care about preserving your labware offsets and run history, you can avoid the delay by clearing your runs and protocols before starting this update. Go to **Robot Settings** > **Device Reset** and select **Clear protocol run history**.

### Improved Features

- The robot software now runs Python 3.10. Many built-in Python packages were updated to match. If you have installed your own Python packages on the robot, re-install them to ensure compatibility.
- Added error handling when dispensing. The `/runs/commands`, `/maintenance_runs/commands`, and `/protocols` HTTP API endpoints now return an error if you try to dispense more than you've aspirated.
- Improved performance of the `/runs/commands` endpoints. They are now significantly faster when requesting a small number of commands from a stored run.

### Bug Fixes

- The OT-2 now consistently applies tip length calibration. There used to be a height discrepancy between Labware Position Check and protocol runs. If you previously compensated for the inconsistent pipette height with labware offsets, re-run Labware Position Check to avoid pipette crashes.
- The OT-2 now accurately calculates the position of the Thermocycler. If you previously compensated for the incorrect position with labware offsets, re-run Labware Position Check to avoid pipette crashes.
- The Flex Gripper will no longer pick up large labware that could collide with tips held by an adjoining pipette.
- Flex now properly configures itself when connected by Ethernet directly to a computer.

### Removals

- Removed the `notify_server` Python package and `/notifications/subscribe` WebSocket endpoint, as they were never fully used. (See pull request [#14280](https://github.com/Opentrons/opentrons/pull/14280) for details.)

### Known Issues

- Downgrading an OT-2 to an earlier software version will delete tip length calibrations created with version 7.2.0. If you need to downgrade, re-run all pipette calibrations afterward.

---

## Opentrons Robot Software Changes in 7.1.1

Welcome to the v7.1.1 release of the Opentrons robot software!

### Bug Fixes

- Fixed an issue with the pipette definition for Flex 1-Channel 1000 µL pipettes.

---

## Opentrons Robot Software Changes in 7.1.0

Welcome to the v7.1.0 release of the Opentrons robot software! This release includes support for deck configuration on Opentrons Flex, partial tip pickup with the Flex 96-Channel Pipette, and other improvements.

### New Features

- Pick up either a column of 8 tips or all 96 tips with the Flex 96-Channel Pipette.
- Specify the deck configuration of Flex, including the movable trash bin, waste chute, and staging area slots.
- Use the Flex Gripper to drop labware into the waste chute, or use Flex pipettes to dispense liquid or drop tips into the waste chute.
- Manually prepare a pipette for aspiration, when required for your application.

### Improved Features

- The Ethernet port on Flex now supports direct connection to a computer.
- Improves aspirate, dispense, and mix behavior with volumes set to zero.
- The `opentrons_simulate` command-line tool now works with all Python API versions.

### Known Issues

JSON protocols created or modified with Protocol Designer v6.0.0 or higher can't be simulated with `opentrons_simulate`.

---

## Opentrons Robot Software Changes in 7.0.2

The 7.0.2 hotfix release does not contain any changes to the robot software.

### Known Issues

JSON protocols created or modified with Protocol Designer v6.0.0 or higher can't be simulated with the `opentrons_simulate` command-line tool.

---

## Opentrons Robot Software Changes in 7.0.1

Welcome to the v7.0.1 release of the Opentrons robot software! This release builds on the major release that added support for Opentrons Flex.

This update may take longer than usual if you are updating from v6.x. Allow **approximately 15 minutes** for your robot to restart. This delay will only happen once.

### Known Issues

JSON protocols created or modified with Protocol Designer v6.0.0 or higher can't be simulated with the `opentrons_simulate` command-line tool.

---

## Opentrons Robot Software Changes in 7.0.0

Welcome to the v7.0.0 release of the Opentrons robot software! This release adds support for the Opentrons Flex robot, instruments, modules, and labware.

This update may take longer than usual. Allow **approximately 15 minutes** for your robot to restart. This delay will only happen once.

### New Features

Flex touchscreen

- Robot dashboard: Quickly access recently run protocols.
- Manage protocols: Organize, view details, set up, and run protocols directly from the touchscreen.
- Manage instruments: View information about connected pipettes and the gripper. Attach, detach, or recalibrate instruments.
- Robot settings: Customize the behavior of your Flex, including the LED and touchscreen displays.

Flex features

- Analyze and run protocols that use the Flex robot, Flex pipettes, and Flex tip racks.
- Move labware around the deck automatically with the Flex Gripper.
- Use the Flex Gripper to move labware onto or off of the Magnetic Block.

Python API features

- Manually move labware around, off of, or onto the deck without ending your protocol.
- Load adapters separately from labware (to allow moving labware onto or off of the adapter).
- Use coordinate or numeric deck slot names interchangeably.
- Set 50 µL pipettes to a low-volume mode for handling very small quantities of liquid.

### Improved Features

- The API relaxes placement restrictions for the Heater-Shaker Module on Flex.
- Pipettes drop tips in multiple locations above the fixed trash, to prevent tips from stacking up.

### Bug Fixes

- Fixed a problem with empty files being stored in the robot's database if the robot is power cycled at the wrong time.
- The API no longer raises an error when dropping tips into labware other than the fixed trash.
- All API versions now properly track tips, including starting at a well other than A1.

### Known Issues

Some protocols can't be simulated with the `opentrons_simulate` command-line tool:

- JSON protocols created or modified with Protocol Designer v6.0.0 or higher.
- Python protocols specifying an `apiLevel` of 2.14 or higher.

---

## OT-2 Software Changes in 6.3.1

Welcome to the v6.3.1 release of the OT-2 software! This hotfix release addresses a few problems.

### Improved Features
- Changed the Thermocycler GEN2 plate ejection behavior to prevent plates from getting stuck after PCR cycles or being ejected too forcefully.

### Bug Fixes

- Specifying Python API version 2.14 no longer prevents ``set_block_temperature`` from executing a hold time.


---

## OT-2 Software Changes in 6.3.0

Welcome to the v6.3.0 release of the OT-2 software!

### Improved Features

- The `/calibrations` endpoint now accepts `DELETE` requests.

### Bug Fixes

- Fixed a problem where labware offsets would sometimes be ignored for labware atop a Temperature Module.
- Calls to the `/commands` endpoint with `waitUntilComplete=true` no longer time out after 30 seconds if you don't specify a timeout interval.
- Fixed improper pagination and cursor placement for the `/commands` endpoint.

### Known Issues

Some protocols can't be simulated with the `opentrons_simulate` command-line tool:

- JSON protocols created or modified with Protocol Designer v6.0.0 or higher
- Python protocols specifying an `apiLevel` of 2.14

---
## OT-2 Software Changes in 6.2.1

Welcome to the v6.2.1 release of the OT-2 software! This hotfix release addresses a few problems.

### Bug Fixes

- When you upload a protocol or set up a run, the OT-2 is now less likely to show connection errors.
- When you upload a protocol file larger than 2 megabytes, you will no longer get an error saying "Protocol run could not be created on the robot."
- When you run a Thermocycler GEN2 for 50 days without a power cycle, it will no longer miscalculate hold times.
- When you upload a Python protocol that aspirates or dispenses with an effective volume of 0 µL, it will no longer get stuck analyzing forever.

---

## OT-2 Software Changes in 6.2.0

Welcome to the v6.2.0 release of the OT-2 software! This release focuses on adding support for the Thermocycler Module GEN2.

### New Features

Thermocycler GEN2 support

- Lid temperature is now available when querying module status
- Pipettes properly move to avoid the GEN2 module

### Bug Fixes

- Fixed a bug that could cause hardware modules to become unresponsive

---

## OT-2 Software Changes in 6.1.0

Welcome to the v6.1.0 release of the OT-2 software! This release adds support for the Opentrons Heater-Shaker Module.

### New Features

Heater-Shaker support

- The OT-2 can run JSON and Python protocols that control the Heater-Shaker Module
- Implements restrictions on module and labware placement around the Heater-Shaker
- When possible, the OT-2 will automatically move its pipettes or the Heater-Shaker's labware latch to shake safely and avoid crashes
- The OT-2 can update the firmware on an attached Heater-Shaker

### Bug Fixes

- Improved tip pickup and drop behavior
- Fixed issues when running Thermocycler profiles
- Fixed a bug that prevented pipetting to arbitrary deck coordinates

---

## OT-2 Software Changes in 6.0.1

Welcome to the v6.0.1 release of the OT-2 software!

In conjunction with [changes in the Opentrons App](https://github.com/Opentrons/opentrons/blob/edge/app-shell/build/release-notes.md), the 6.0 release reshapes the way your OT-2 stores runs and protocols.

### New Features

- The OT-2 will retain the past 20 protocol runs on the robot, even across reboots.
- Supports renaming robots via the Opentrons App.

### 6.0.0 to 6.0.1

The 6.0.1 hotfix release fixes one robot software bug:

- Protocol uploads to the OT-2 work again when the robot's "Use older protocol analysis method" advanced setting is enabled

As noted below, the 6.0.0 release fixed various protocol analysis bugs. **If you have been using the "Use older protocol analysis method" setting, we recommend you turn it off.** You might no longer need it, and your protocols will upload to your OT-2 faster with the setting disabled!

### Bug Fixes

- The `opentrons` Python module is now compatible with Python 3.10.
- Protocols will correctly fail analysis when attempting to place a Thermocycler in a slot that conflicts with already-placed labware.
- Improved handling of loading multiple modules of the same type.
- Fixed various pipette bugs in protocol analysis.
- Fixed [a bug](https://github.com/Opentrons/opentrons/issues/10126) where a robot would be undiscoverable if it happened to have the same name as another device on the network.

### Known Issues

- Sometimes module load order is affected by the order in which you power the modules on. We strongly suggest connecting and powering on modules in the order they will be used in the protocol.

---

## OT-2 Software Changes in 5.0.2

Welcome to the v5.0.2 release of the Opentrons OT-2 software!

This release is a complete refactor of how the OT-2 communicates with the Opentrons app, and features a number of changes to how protocols are loaded and stored on the robot.

### New Features

- A modern, http-based interface has replaced the RPC endpoints for communicating with the Opentrons App
- More thorough information about a protocol is returned to the Opentrons App to enable the display of live protocol status
- The most recent protocol analysis and run are stored on the robot to enable easy, quick re-running via the Opentrons App
- A new way to use labware offsets in Jupyter notebook and SSH sessions

### 5.0.1 to 5.0.2

The 5.0.2 hotfix release contains three fixes in the robot software:

1. The robot now understands how to use labware loaded via `load_labware_from_definition` during Labware Position Check.
2. User-defined labware labels are now returned to the Opentrons App from protocol analyses and runs.
3. Protocol file uploads now permit uppercase .json and .py extensions.

### 5.0.0 to 5.0.1

The 5.0.1 hotfix release does not contain any changes to the robot software

### Known Issues

- Your last run protocol will not be saved through robot reboots.
- When you load multiple instances of the same module type in a protocol, the USB port numbers shown in "Module Setup" are incorrect.

---

## OT-2 Software Changes in 4.7.0

The 4.7.0 release of the OT-2 Software fixes a handful of regressions and bugs.

### New Features

- This is primarily a bug fix release.

### Bug Fixes

- Fixed an issue where pipette offset and tip length calibration would sometimes not be saved correctly.
- Fixed issues around attach pipette behavior.
- Fixed error reporting from the Thermocycler in the instance that the module goes into an unrecoverable state.

---

## OT-2 Software Changes in 4.6.2

### New Features

- The `opentrons_simulate` command-line application can now estimate protocol duration using the `-e` option. This feature is experimental, but very cool!

### Bug Fixes

- If a protocol is canceled mid-run while there is a tip on a pipette, the tip will be dropped prior to resetting the plunger to avoid contaminating the pipette internals with liquids.
- Fixed a movement planning issue that could cause multi-channel pipettes to collide with the deck when changing pipettes.
- Fixed an issue that could cause the protocol to proceed before an awaited temperature module target was actually hit.
- Fixed a few issues with the faster protocol analysis method added in the 4.5.0 release.
- Fixed type annotations of the `ProtocolContext` classes.

#### 4.6.1 to 4.6.2

The 4.6.2 hotfix release contains a small bug fix for an issue where the OT-2's max speed settings within a protocol will be ignored.

#### 4.6.0 to 4.6.1

The 4.6.1 hotfix release contains a small configuration change to fix an issue with installing the `opentrons` PyPI package on computers running Python 3.8 and later. It does not affect the software running on your OT-2.

### Known Issues

In 4.6.0 and previous releases, the OT-2 will only use TLS 1.0 for WPA2 Enterprise association. Some RADIUS servers have disabled this version of TLS; it must be enabled to connect the OT-2 to a RADIUS-secured network.

Since version 4.5.0, if a thermocycler encounters an error, the robot will be unable to recognize the error state. If your thermocycler starts blinking its yellow LED, you should cancel your protocol. See issue [8393][] for more details.

[8393]: https://github.com/Opentrons/opentrons/issues/8393

---

## OT-2 Software Changes in 4.5.0

The 4.5.0 release of the OT-2 Software improves the speed of protocol uploads and fixes a handful of regressions and bugs.

### New Features

The OT-2 now uses a faster analysis method on protocol upload

- Thanks to everyone who beta tested this feature over the last few months!
- You may revert to the old analysis method with the **Use Older Protocol Analysis Method** in your OT-2's advanced settings
- If you encounter any issues (e.g. protocol run errors not caught during upload) please reach out to Opentrons Support or [open an issue][] in GitHub so we can continue to improve this feature

### Bug Fixes

- Fixed a regression that prevented use of OT-2 Modules in Jupyter notebook ([#8009][])
- Fixed an uncaught import error on macOS and Windows ([#8154][], thanks to [Maksim Rakitin][] for the fix!)
- Fixed a crash caused by invalid calibration data ([#7962][])

### Known Issues

In 4.5.0 and previous releases, the OT-2 will only use TLS 1.0 for WPA2 Enterprise association. Some RADIUS servers have disabled this version of TLS; it must be enabled to connect the OT-2 to a RADIUS-secured network.

[#7962]: https://github.com/Opentrons/opentrons/issues/7962
[#8009]: https://github.com/Opentrons/opentrons/issues/8009
[#8154]: https://github.com/Opentrons/opentrons/issues/8154
[maksim rakitin]: https://github.com/mrakitin
[open an issue]: https://github.com/Opentrons/opentrons/issues

---

## OT-2 Software Changes in 4.4.0

### New Features

- Triggering a `move_to` to a labware will now count the labware as "used" in the protocol, allowing it to show up in the calibration list ([#7812][])
- Various documentation and error message improvements

### Bug Fixes

- A new Protocol API version was added - `2.11` - to ensure that liquid handling commands like `aspirate` and `dispense` will reject if the source or destination labware is a tip rack (thanks to [@andeecode] for reporting [#7552][]!)
- The robot's built-in HTTP server now sends the correct headers for CORS (thanks to [Benedict Diederich][] for reporting [#7599]!)
- Added guards to prevent resumptions from a delay overriding higher priority pauses ([#7773][])
- Fixed several memory leaks in module handling that could lead to spurious error logs and other issues ([#7641][] and [#7690][])

### Known Issues

In 4.4.0 and previous releases, the OT-2 will only use TLS 1.0 for WPA2 Enterprise association. Some RADIUS servers have disabled this version of TLS; it must be enabled to connect the OT-2 to a RADIUS-secured network.

[@andeecode]: https://github.com/andeecode
[benedict diederich]: https://github.com/beniroquai
[#7552]: https://github.com/Opentrons/opentrons/issues/7552
[#7599]: https://github.com/Opentrons/opentrons/issues/7599
[#7641]: https://github.com/Opentrons/opentrons/issues/7641
[#7690]: https://github.com/Opentrons/opentrons/issues/7690
[#7773]: https://github.com/Opentrons/opentrons/issues/7773
[#7812]: https://github.com/Opentrons/opentrons/issues/7812

---

## OT-2 Software Changes in 4.3.1

OT-2 software 4.3.0 brings a major new feature: the ability to use multiple modules of the same type in a protocol. For instance, you can use two Opentrons Temperature modules in a protocol at the same time. There are also several bugfixes.

### New Features

- The OT-2 now supports the use of two Magnetic Modules or two Temperature Modules in the same Python API protocol. See our Help Center article on [using modules of the same type](https://support.opentrons.com/en/articles/5167312-using-modules-of-the-same-type-on-the-ot-2) for an overview of how this feature should be configured.
- New API level: 2.10. This API level contains a bugfix for an issue where pipettes would move diagonally when accessing the same well one after another ([#7156](https://github.com/Opentrons/opentrons/issues/7156)). The fix is only applied when API Level 2.10 is requested in a protocol to avoid changing the behavior of existing protocols.

### Bugfixes

- Fixes an issue causing slow protocol uploads in protocols using Thermocycler Modules or Temperature Modules ([#7506](https://github.com/Opentrons/opentrons/issues/7506))
- Fixes an issue where labware could not have a 0 column. You can now once again create custom labware with a column 0 ([#7531](https://github.com/Opentrons/opentrons/issues/7531))
- Fixes an issue where tip length calibration would not be applied during labware calibration, so calibrating labware would cause incorrect movement during protocol runes ([#7765](https://github.com/Opentrons/opentrons/issues/7765))

### Known Issues

In 4.3.1 and previous releases, the OT-2 will only use TLS 1.0 for WPA2 Enterprise association. Some RADIUS servers have disabled this version of TLS; it must be enabled to connect the OT-2 to a RADIUS-secured network.

---

## OT-2 Software Changes in 4.2.1

This is a hotfix to prevent crashing in the Z axis with one pipette. You must re-calibrate your pipette offset and your labware before proceeding to a run if you are
experiencing this issue.

### Bugfixes

- Fixed an issue where tip length calibration was not being accessed correctly during a protocol run, and labware calibration. If you performed pipette calibration in 4.2.0, you will need to re-do that calibration upon this update.

### Known Issues

In 4.2.1 and previous releases, the OT-2 will only use TLS 1.0 for WPA2 Enterprise association. Some RADIUS servers have disabled this version of TLS; it must be enabled to connect the OT-2 to a RADIUS-secured network.

---

## OT-2 Software Changes in 4.2.0

### Bugfixes

- Fixed an issue where the pipette or pipette mount would not descend far enough to access the mounting screws when changing the pipette
- Fixed an issue that would cause the left and right pipettes to be at different heights, even after executing pipette calibration. If you are experiencing this issue, you should recalibrate your pipettes after updating.
- Fixed an issue where the OT-2 would be unable to connect to Wi-Fi networks using 802.1x Fast Migration.

### Known Issues

In 4.2.0 and previous releases, the OT-2 will only use TLS 1.0 for WPA2 Enterprise association. Some RADIUS servers have disabled this version of TLS; it must be enabled to connect the OT-2 to a RADIUS-secured network.

---

## OT-2 Software Changes in 4.1.1

This is a hotfix for an issue with package installation; it does not include any behavioral changes for the OT-2.

### Bugfixes

- Fixed an issue where the version of the pyserial dependency in the `opentrons` package metadata did not match the version installed on the OT-2, which would cause installation of Python packages that depend on the `opentrons` package to the robot to fail ([#7250](https://github.com/Opentrons/opentrons/pull/7250))

---

## OT-2 Software Changes in 4.1.0

Opentrons Robot Software 4.1.0 brings support for some new robot calibration features and some bugfixes. It also brings a new Protocol API level.

### Calibration Changes

- You can now choose any standard or custom tiprack of appropriate volume to use when calibrating your pipette
- You can now jog in Z when calibrating to deck markings

### Protocol API Level 2.9

- In Python Protocol API Level 2.9, we added accessors for well properties that had previously been undocumented. To see more details, see [the documentation](http://docs.opentrons.com/v2/new_labware.html#new-labware-well-properties).

## Bug Fixes

- Fixed an issue that prevented calibration of labware in slots 10 and 11 while using a single channel pipette ([#6886](https://github.com/opentrons/opentrons/issues/6886))
- Protocol upload should be much faster

---

## OT-2 Software Changes in 4.0.0

Opentrons Robot Software 4.0.0 is a major software release, bringing an entirely overhauled robot calibration process for the OT-2; a full switch to Opentrons Protocol API Version 2; and improvements to the OT-2's HTTP API.

**After you install this update, you must calibrate your OT-2's pipette offsets and tip lengths before running a protocol.** This will take approximately fifteen minutes, but you will not be able to run a protocol until your OT-2 is calibrated.

In addition, **after you install this update, Opentrons Apps on version 3.21.2 or earlier will not be able to interact with this OT-2 beyond downgrading its software**. This is due to the HTTP API changes described below. Opentrons App Version 4.0.0 is designed to work with the changes, but 3.21.2 and previous cannot interact with an OT-2 on Robot Software 4.0.0 other than downgrading its software.

### OT-2 Calibration Changes

In Opentrons App and Robot Software 4.0.0, the calibration process for the OT-2 is different and improved from major version 3. With these changes, you'll calibrate less often; the calibration processes are shorter, easier, and more reliable; and you can finally use different kinds of tips on the same pipette in the same protocol accurately.

For more in-depth information on the changes, [click here](https://support.opentrons.com/en/articles/3499692-how-calibration-works-on-the-ot-2).

### Full Use of Python Protocol API Version 2

We released Python Protocol API Version 2 almost a year ago, and have been continuously improving it since, with 8 new intermediate API levels, each containing bugfixes, improvements, or support for new hardware. It's ready to be the only way Python protocols are written for the OT-2. Accordingly, in 4.0.0 and subsequent releases, **the OT-2 will not accept Python Protocol API Version 1 protocols**.

### HTTP API Changes

Robot Software 4.0.0 is a big step forward in a well-defined, stable, HTTP API for the OT-2. This API is what the Opentrons App uses to communicate with the OT-2, and documentation for it is available on the OT-2's IP address, port 31950 at `/docs`. In Robot Software 4.0.0, interaction with this API now requires use of the `Opentrons-Version` header, set to either `*` (to accept any version) or `2`.

We consider the HTTP API a core part of the OT-2's API, and changes to it will be documented in release notes just like Python Protocol API changes.

### Other Changes

New Python Protocol API version: 2.8

- You can now specify blow out locations in `transfer`, `consolidate`, and `distribute` to be the source well, destination well, or trash
- `transfer`, `consolidate`, and `distribute` will now do nothing if passed a 0 transfer volume.
- `Well` now has the method `from_center_cartesian`, which allows you to calculate positions relative to the well center in X, Y, and Z
- For more information, see [the Python Protocol API documentation](https://docs.opentrons.com/v2/versioning.html#version-2-8)

Protocol Designer protocols will now always be executed with API Version 2.8 behaviors. Future changes to the behavior executed in Protocol Designer protocols will be communicated here
