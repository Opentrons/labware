For more details about this release, please see the full [technical change
log][]. For a list of currently known issues, please see the [Opentrons issue tracker][].

[technical change log]: https://github.com/Opentrons/opentrons/releases
[opentrons issue tracker]: https://github.com/Opentrons/opentrons/issues?q=is%3Aopen+is%3Aissue+label%3Abug

By installing and using Opentrons software, you agree to the Opentrons End-User License Agreement (EULA). You can view the EULA at [opentrons.com/eula](https://opentrons.com/eula).

---

## Opentrons App Changes in 8.3.0

Welcome to the v8.3.0 release of the Opentrons App! This release adds support for Evosep Evotips on the Flex, as well as other features.

### New Features

- Use Evosep Evotips in Python API version 2.22 protocols for protein sample purification. Only available with the Flex 96-channel pipette.
- Change the app or Flex touchscreen language to Mandarin in Settings.
- Load a newly modified Flex 8-Channel EM 1000 µL pipette equipped with a PEEK motor component to automate emulsion applications.

### Improved Features

- Improvements to the Flex error recovery feature help protocols recover from detected stalls and collisions, saving you valuable time and resources.

---

## Opentrons App Changes in 8.2.0

Welcome to the v8.2.0 release of the Opentrons App! This release adds support for the Opentrons Absorbance Plate Reader Module, as well as other features.

### New Features

- Run protocols that use the Absorbance Plate Reader and check the status of the module on the robot details screen for your Flex.
- Run protocols that use the new Opentrons Tough PCR Auto-Sealing Lid with the Thermocycler Module GEN2. Stacks of these lids appear in a consolidated view when setting up labware.

### Improved Features

- Error recovery now works in more situations and has more options.
  - Recover from gripper errors.
  - Recover from failure to drop tips.
  - Indicate that an error was improperly detected and skip similar errors later in the run.
  - Choose from more options of where to drop tips as part of recovery.
  - Disable error recovery entirely, if your application requires it. Runs will fail on any error.

### Bug Fixes

- Fixed an app crash when performing certain error recovery steps with Python API version 2.15 protocols.

### Known Issues

- If you attach an Absorbance Plate Reader to _any_ Flex on your local network, you must update all copies of the Opentrons App on the same network to at least v8.1.0.

---

## Opentrons App Changes in 8.1.0

Welcome to the v8.1.0 release of the Opentrons App!

There are no new features in the Opentrons App in v8.1.0, but it is required for updating the robot software to support the latest production version of Flex robots.

### Bug Fixes

- Prevented Flex from showing the first-run screen when powering on a robot that's already set up.

---

## Opentrons App Changes in 8.0.0

Welcome to the v8.0.0 release of the Opentrons App!

### New Features

- Recover from errors during a protocol run on Flex. If certain types of errors occur, you will have the option to manually correct the error and resume your protocol. Follow detailed recovery instructions on the touchscreen or in the app.
- Perform quick transfers on Flex. Set up a new quick transfer directly on the touchscreen, specifying a tip rack and up to two labware for pipetting — no protocol file or coding required! You can save and reuse up to 20 quick transfers on a particular Flex robot.
- Use CSV files as runtime parameters. When setting up a protocol in the app, choose any file on your computer. Or on Flex, select from files already stored on the robot or on an attached USB drive. See the Python API documentation for more information on adding CSV capability to your protocols.

### Improved Features

- Run protocols using the latest version of the Python API (2.20), which adds more partial tip pickup configurations (Flex and OT-2 GEN2 pipettes) and the ability to detect whether a well contains liquid (Flex pipettes only).
- Tap or click on any labware on the deck map to see adapters and modules that are stacked below it.
- Lists of liquids now separately show the total volume and per-well volume (when it is the same in each well containing that liquid).
- Improved instructions for what to do when a Flex protocol completes or is canceled with liquid-filled tips attached to the pipette.

### Known Issues

- Stored labware offsets can't be applied to protocols that require selecting a CSV file as a runtime parameter value. Write the protocol in such a way that it passes analysis with or without the CSV file, or run Labware Position Check after confirming parameter values.
- Error recovery can't perform partial tip pickup, because it doesn't account for the pipette nozzle configuration of 8- and 96-channel pipettes. If a recovery step requires partial tip pickup, cancel the protocol instead.
- Downloading robot logs via USB may take up to 2 minutes on macOS, and may fail entirely on Windows. Use an Ethernet or Wi-Fi connection to download logs if needed.

---

## Opentrons App Changes in 7.5.0

Welcome to the v7.5.0 release of the Opentrons App!

There are no changes to the Opentrons App in v7.5.0, but it is required for updating the robot software to support the [Opentrons Flex HEPA/UV Module](https://opentrons.com/products/opentrons-flex-hepa-uv-module) and the latest Flex Gripper model (serial numbers beginning `GRPV13`).

---

## Opentrons App Changes in 7.3.1

Welcome to the v7.3.1 release of the Opentrons App!

There are no changes to the Opentrons App in v7.3.1, but it is required for updating the robot software to improve some features.

### Known Issue

- Robots that have completed a run won't appear as available until you clear the run completion notification. This appears as a banner on the protocol run screen in the app, or as a splash screen on the Flex touchscreen.

---

## Opentrons App Changes in 7.3.0

Welcome to the v7.3.0 release of the Opentrons App! This release adds support for Python protocols with runtime parameters, letting you change the behavior of a protocol each time you run it.

Note: After updating, the app will prompt you to reanalyze all previously imported protocols. This is a one-time step and should not affect protocol behavior.

### New Features

Runtime Parameters

- Available runtime parameters are shown on the protocol details screen.
- Both the Opentrons App and touchscreen let you enter new parameter values during run setup.
- The app highlights changed parameter values so you can confirm them before starting the run.
- The run preview (before the run) and run log (after the run) reflect changes to steps based on your chosen parameter values.

Modules in Deck Configuration

- You can now specify what slots modules occupy on Flex in deck configuration.
- When moving, Flex will avoid modules specified in deck configuration but not loaded in the protocol.
- Deck configuration must be compatible with the protocol's requirements before you start a run.

### Improved Features

- Lists of robots are now sorted alphabetically.

### Removals

- Removed the "Use older protocol analysis method" advanced setting for OT-2. If you need this type of analysis, use `opentrons_simulate` on the command line.

### Bug Fixes

- All run log steps now appear in the same font size.
- The app now properly sends custom labware definitions, along with the corresponding Python protocol, to Flex robots connected via USB.

### Known Issues

- Previously saved labware offset data may not be available when setting up a run via a USB connection from a Windows computer. Re-run Labware Position Check or use a Wi-Fi connection instead.
- If you apply labware offset data for a particular type of labware, and then load a different type of labware in its place via a runtime parameter, the new labware type will have default offsets (0.0 on all axes). Re-run Labware Position Check to set offsets for the new labware.

---

## Opentrons App Changes in 7.2.2

Welcome to the v7.2.2 release of the Opentrons App!

There are no changes to the Opentrons App in v7.2.2, but it is required for updating the robot software to improve some features.

---

## Opentrons App Changes in 7.2.1

Welcome to the v7.2.1 release of the Opentrons App!

### Bug Fixes

- Fixed a memory leak that could cause the app to crash.

---

## Opentrons App Changes in 7.2.0

Welcome to the v7.2.0 release of the Opentrons App!

The Linux version of the Opentrons App now requires Ubuntu 20.04 or newer.

### New Features

- Added a warning in case you need to manually remove tips from a pipette after power cycling the robot.

### Improved Features

- Commands involving the trash bin or waste chute now appear in the run preview.
- The app will prompt you to reanalyze protocols that haven't been analyzed in such a long time that intervening changes to the app could affect their behavior.

### Bug Fixes

- The OT-2 now consistently applies tip length calibration. There used to be a height discrepancy between Labware Position Check and protocol runs. If you previously compensated for the inconsistent pipette height with labware offsets, re-run Labware Position Check to avoid pipette crashes.
- The OT-2 now accurately calculates the position of the Thermocycler. If you previously compensated for the incorrect position with labware offsets, re-run Labware Position Check to avoid pipette crashes.

### Known Issues

- It's possible to start conflicting instrument detachment workflows when controlling one robot from multiple computers. Verify that the robot is idle before starting instrument detachment.
- Robots may fail to reconnect after renaming them over a USB connection on Windows.

---

## Opentrons App Changes in 7.1.1

Welcome to the v7.1.1 release of the Opentrons App!

### Bug Fixes

- The app properly displays Flex 1-Channel 1000 µL pipettes.

---

## Opentrons App Changes in 7.1.0

Welcome to the v7.1.0 release of the Opentrons App! This release includes new deck and pipette functionality for Opentrons Flex, a new workflow for dropping tips after a protocol is canceled, and other improvements.

### New Features

- Specify the deck configuration of Flex, including the movable trash bin, waste chute, and staging area slots.
- Resolve conflicts between the hardware a protocol requires and the current deck configuration as part of run setup.
- Run protocols that use the Flex 96-Channel Pipette, including partial tip pickup.
- Choose where to dispense liquid and drop tips held by a pipette when a protocol is canceled.

### Improved Features

- Labware Position Check on Flex uses the pipette calibration probe, instead of a tip, for greater accuracy.

### Bug Fixes

- Labware Position Check no longer tries to check the same labware in the same position twice, which was leading to errors.

---

## Opentrons App Changes in 7.0.2

Welcome to the v7.0.2 release of the Opentrons App!

### Bug Fixes

- Fixes an issue where robot system updates over USB were stalling
- Fixes an issue where app protocol analysis would fail if you had Python 3.10 installed on your computer and installed the opentrons package there

---

## Opentrons App Changes in 7.0.1

Welcome to the v7.0.1 release of the Opentrons App! This release builds on the major release that added support for Opentrons Flex.

### Improved Features

- Pipettes move higher during Labware Position Check to avoid crashes in all deck slots, not just those with labware loaded in the protocol.

### Bug Fixes

- The app no longer blocks running valid protocols due to "not valid JSON" or "apiLevel not declared" errors.
- Robot commands, like turning the lights on or off, no longer take a long time to execute.

---

## Opentrons App Changes in 7.0.0

Welcome to the v7.0.0 release of the Opentrons App! This release adds support for the Opentrons Flex robot, instruments, modules, and labware.

### New Features

Opentrons Flex features

- Connect to Opentrons Flex robots via Wi-Fi, Ethernet, or USB.
- Send a protocol to Opentrons Flex. Protocols are stored on the Flex robot and can be run from the touchscreen.
- Run protocols that automatically move labware with the Flex Gripper, including onto and off of the new Magnetic Block.
- Attach, detach, and run automated calibration for Flex pipettes and the Flex Gripper.

General app features

- Manually move labware around the deck during protocols. The app shows animated instructions for which labware to move, and lets you resume the protocol when movement is complete.
- See when your protocol will pause. During a run, marks on the protocol timeline show all pauses that require user attention, including labware movement.

### Improved Features

- The app loads various pages faster.

---

## Opentrons App Changes in 6.3.1

Welcome to the v6.3.1 release of the Opentrons App!

There are no changes to the Opentrons App in v6.3.1, but it is required for updating the OT-2 software to fix some issues.

---

## Opentrons App Changes in 6.3.0

Welcome to the v6.3.0 release of the Opentrons App!

### New Features

Liquid Setup

- See a summary of the initial locations of liquids in a list or deck map view.
- Drill down to view exact volumes for individual wells when setting up a protocol run.
- Works for all protocols created with Protocol Designer, and for Python protocols that use the liquid setup methods introduced in v2.14 of the Python API.
- Supports custom liquid colors set in Protocol Designer or the Python API.

Calibration Dashboard: Manage your robot's Deck Calibration, Pipette Offset Calibrations, and Tip Length Calibrations all in one place.

Run Progress Monitor: The run log has been redesigned to give you a better sense of the progress of your protocol and to make way for future improvements.

### Improved Features

- The pipette attachment and calibration wizards have been redesigned to better match the rest of the app.
- Labware Position Check can now check a single piece of labware that will occupy multiple deck slots over the course of a protocol.
- Labware Offset data is now available in more places, including when choosing which robot to run a protocol on.
- The Protocols page will remember your sorting preference when you navigate away from the page.
- Renamed some buttons and menu commands to "Start setup" to make it clearer that the robot will not immediately start moving when you click on them.

### Bug Fixes

- Loading the module controls before starting a protocol no longer resets the state of the Heater-Shaker.

### Known Issues

- When a protocol reaches a pause step, the Run Preview may incorrectly highlight the following step as the current step.

---

## Opentrons App Changes in 6.2.1

Welcome to the v6.2.1 release of the Opentrons App!

## Bug Fixes

- Fixed a problem where certain kinds of robot errors would block you from accessing the robot's settings.

## Improved Features

- The device details page now loads faster.

---

## Opentrons App Changes in 6.2.0

Welcome to the v6.2.0 release of the Opentrons App! This release focuses on adding support for the Thermocycler Module GEN2.

### New Features

- Thermocycler GEN2 support: analyze, upload, and run protocols that include the Thermocycler GEN2
- Added a privacy preference for sharing anonymous robot logs with Opentrons.

---

## Opentrons App Changes in 6.1.0

Welcome to the v6.1.0 release of the Opentrons App! This release focuses on adding support for the [Opentrons Heater-Shaker Module](https://shop.opentrons.com/heater-shaker-module/).

### New Features

Heater-Shaker support

- Access guided setup instructions for attaching the Heater-Shaker to the deck
- Analyze, upload, and run protocols that include the Heater-Shaker
- View the status of a Heater-Shaker connected to an OT-2 and control its heater, shaker, and labware latch
- Update the Heater-Shaker's firmware from the module card

Module cards now show if a Heater-Shaker or Thermocycler has an error

### Improved Features

- Improvements to the run log, including properly listing labware that is on top of a module
- Clarification of what data is deleted when performing a factory reset of protocol run history

### Bug Fixes

- Labware Position Check now suggests the most recent Labware Offset data
- Tip Length Calibration no longer silently fails when the chosen pipette is not attached
- Stops the update modal from staying onscreen indefinitely after a robot software update has finished
- Fixes a bug that prevented changing pipette settings when the All Pipette Config feature flag was on
- Interface fixes and improvements

---

## Opentrons App Changes in 6.0.1

Welcome to the v6.0.1 release of the Opentrons App! This release focuses on a visual redesign of the app that offers more ways to manage protocols even when you're not connected to a robot.

This release also includes updates to the robot operating system, so be sure to update any OT-2s before running protocols with this version of the app.

### New Features

Updated design: A more polished and modern design, built around the new, always-accessible Protocols, Labware, and Devices sections.

Protocols section

- Import multiple protocols and manage them all in one place.
- In-app protocol analysis lets you import Python and JSON protocol files without connecting to a robot.
- View deck setup, required hardware, and protocol metadata — before, during, or after a run.

Labware section

- Browse labware definitions from the Opentrons Labware Library right in the app.
- Import custom labware and manage it alongside standard labware.

Devices section

- New view for currently available and recently connected robots.
- See recently run protocols on a robot, including those run from other computers.
- Run a protocol directly from the robot details page.
- Easily change a robot's name from the new robot settings page.

### 6.0.0 to 6.0.1

The 6.0.1 hotfix release fixes two issues:

- The app's "Override Path to Python" advanced setting now works properly on Windows
- It's once again possible to save changes made to pipette settings

### Improved Features

Labware Position Check

- When re-running a protocol, the app will now automatically recommend stored Labware Offset data (from the last 20 runs on that robot) that applies to the same labware and deck slot.
- When running Labware Position Check, you will see live offset values as you jog the pipette.

---

## Opentrons App Changes in 5.0.2

Welcome to the v5.0.2 release of the Opentrons App!

The 5.0.2 release reshapes the way you upload and set up protocols to run on your OT-2. Read below to find out about the new features in 5.0.0.

### New Features

- A completely revamped protocol upload experience that will walk you through setting up your OT-2 for the run
- A new way to check the positioning of your labware prior to a run, where you can apply offsets to each labware individually
- More visibility into the progress of protocol execution on the robot
- Quick and easy re-running of your last used protocol

### 5.0.1 to 5.0.2

The 5.0.2 hotfix release fixes three issues:

1. If you use `load_labware_from_definition` in your Python protocol, you are now able to use Labware Position Check.
2. User-defined labware labels, if present, are now displayed in "Labware Setup"
3. Certain types of protocol upload failures will now show an error message instead of silently failing.

### 5.0.0 to 5.0.1

The 5.0.1 hotfix release contains a small fix to the Labware Position Check to appropriately handle protocols that load pipettes, but never pick up tips with that pipette.

### Known Issues

- Your last run protocol will not be saved through robot reboots
- When you load multiple instances of the same module type in a protocol, the USB port numbers shown in "Module Setup" are incorrect.

---

## Opentrons App Changes in 4.7.0

The 4.7.0 release is primarily focused on bug fixes on the robot software side. You shouldn't notice any big changes with this upgrade.

### New Features

None in the Opentrons App.

### Bug Fixes

None in the Opentrons App.

---

## Opentrons App Changes in 4.6.2

The 4.6.2 release is primarily focused on bug fixes on the robot software side and behind the scenes changes in the app for future work. You shouldn't notice any big changes with this upgrade.

### New Features

None in the Opentrons App.

### Bug Fixes

None in the Opentrons App.

#### 4.6.1 to 4.6.2

The 4.6.2 hotfix release contains a small bug fix for an issue where the OT-2's max speed settings within a protocol will be ignored. It does not affect the software running in the Opentrons App.

#### 4.6.0 to 4.6.1

The 4.6.1 hotfix release contains a small configuration change to fix an issue with installing the `opentrons` PyPI package on computers running Python 3.8 and later. It does not affect the software running in the Opentrons App.

---

## Opentrons App Changes in 4.5.0

This release of the app is focused on quality of life improvements as we continue large behind-the-scenes improvements.

### New Features

- Protocol uploads have been made substantially faster! (See OT-2 release notes for more details.)

### Bug Fixes

- Fixed issues with the run timer reading `00:00` in the middle of a paused protocol ([#7740][])

[#7740]: https://github.com/Opentrons/opentrons/issues/7740

---

## Opentrons App Changes in 4.4.0

This is a quiet release on the app front as we make some behind-the-scenes improvements to how the app is built, so we don't have any changes to report here. There are changes to the OT-2 software, though, so make sure you update your app so it can get your robot fully up to date!

---

## Opentrons App Changes in 4.3.1

We've improved module functionality with Opentrons App 4.3.0. The app now supports protocols with two Temperature Modules or two Magnetic Modules for Python API Protocols. All connected modules display their USB port connection (including limited USB port information for hubs). We've also updated how modules are displayed on the Run tab.

### New Features

- Support for 2 Temperature Modules or 2 Magnetic Modules
- The USB port to which each module is attached is now displayed in the protocol info screen

### Bug Fixes

- Fix an issue where robots would sometimes not reappear after an update when connected via USB ([#7608](https://github.com/Opentrons/opentrons/issues/7608))

---

## Opentrons App Changes in 4.2.1

### Changes

- There are no app side changes to this release.

---

## Opentrons App Changes in 4.2.0

### Changes

- Do not automatically resume when the user decides not to confirm cancelling a protocol. If you click the "cancel" button and then click "Go back", the protocol will be paused until you click resume.

### Bug Fixes

- Fix several issues that prevented changing the settings of an attached pipette.
- You will now be asked whether you have a calibration block in pre-protocol tip length calibration if you have not saved your answer.

---

## Opentrons App Changes in 4.1.1

There are no changes to the Opentrons App in 4.1.1; it is a bugfix release for an issue with installing Python packages on the OT-2.

---

## Opentrons App Changes in 4.1.0

Opentrons App 4.1.0 brings some new features to robot calibration.

### OT-2 Calibration Changes

- You can now choose any standard or custom tiprack of appropriate volume to use when calibrating your pipette
- You can now jog in Z when calibrating to deck markings
- Downloading robot logs will now download a third file which contains logs from the robot's web server

### Bug Fixes

- Fixed an issue that prevented calibration of labware in slots 10 and 11 while using a single channel pipette ([#6886](https://github.com/opentrons/opentrons/issues/6886))
- Protocol upload should be much faster

---

## Opentrons App Changes in 4.0.0

Opentrons App 4.0.0 is a major software release, bringing an entirely overhauled robot calibration process for the OT-2; a full switch to Opentrons Protocol API Version 2; and many look and feel improvements.

**After you install this update, you must calibrate your OT-2's pipette offsets and tip lengths before running a protocol**. This will take approximately fifteen minutes, but you will not be able to run a protocol until your OT-2 is calibrated.

### OT-2 Calibration Changes

In Opentrons App and Robot Software 4.0.0, the calibration process for the OT-2 is different and improved from major version 3. With these changes, you'll calibrate less often; the calibration processes are shorter, easier, and more reliable; and you can finally use different kinds of tips on the same pipette in the same protocol accurately.

For more in-depth information on the changes, [click here](https://support.opentrons.com/en/articles/3499692-how-calibration-works-on-the-ot-2).

### Full Use of Python Protocol API Version 2

We released Python Protocol API Version 2 almost a year ago, and have been continuously improving it since, with 8 new intermediate API levels, each containing bugfixes, improvements, or support for new hardware. It's ready to be the only way Python protocols are written for the OT-2. Accordingly, in 4.0.0 and subsequent releases, **the OT-2 will not accept Python Protocol API Version 1 protocols**.

### Look and Feel Changes

In 4.0.0, the Opentrons App has some major changes to the Robots tab and the Pipettes & Modules page. These changes present information about the new calibration data more concisely in a better-organized way. We hope you like it!
