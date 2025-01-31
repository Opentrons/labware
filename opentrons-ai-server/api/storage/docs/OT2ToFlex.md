# Adapting OT-2 to Flex

## Metadata and Requirements:

- **API Level**: Flex requires an `apiLevel` of 2.15 or higher. If the OT-2 protocol specified `apiLevel` in the `metadata` dictionary, move it to the `requirements` dictionary. Ensure it is not specified in both places to avoid errors.

- **Robot Type**: Specify `"robotType": "Flex"` in the `requirements` dictionary. If `robotType` is omitted, the API assumes the protocol is designed for the OT-2.

### Example Conversion:

#### Original OT-2 Code:

```python
from opentrons import protocol_api

metadata = {
    "protocolName": "My Protocol",
    "description": "This protocol uses the OT-2",
    "apiLevel": "2.19"
}
```

#### Updated Flex Code:

```python
from opentrons import protocol_api

metadata = {
    "protocolName": "My Protocol",
    "description": "This protocol uses the Flex",
}

requirements = {
    "robotType": "Flex",
    "apiLevel": "2.19"
}
```

## Pipettes and Tip Rack Load Names:

- Flex uses different pipettes and tip racks with unique load names. When converting, load Flex pipettes of the same or larger capacity than the OT-2 pipettes.

- Using smaller capacity tips than in the OT-2 protocol may require further adjustments to avoid running out of tips, resulting in more steps and longer execution times.

### Example Conversion:

#### Original OT-2 Code:

```python
def run(protocol: protocol_api.ProtocolContext):
    tips = protocol.load_labware("opentrons_96_tiprack_300ul", 1)
    left_pipette = protocol.load_instrument(
        "p300_single_gen2", "left", tip_racks=[tips]
    )
```

#### Updated Flex Code:

```python
def run(protocol: protocol_api.ProtocolContext):
    tips = protocol.load_labware("opentrons_flex_96_tiprack_1000ul", "D1")
    left_pipette = protocol.load_instrument(
        "flex_1channel_1000", "left", tip_racks=[tips]
    )
```

## Trash Container:

- OT-2 protocols have a fixed trash in slot 12. For Flex protocols using API version 2.16 or later, load a trash bin in slot A3 to match the OT-2 fixed trash position:

  ```python
  trash = protocol.load_trash_bin("A3")
  ```

  **Note**: Load the trash before any commands that may require discarding tips; otherwise, the robot cannot find it.

## Deck Slot Labels:

- Update numeric labels for deck slots (matching OT-2) to coordinate labels (matching Flex). This is optional but recommended for clarity.

### Deck Slot Correspondence:

The correspondence between deck labels is based on the relative locations of the slots:

```
- 10 to A1
- 11 to A2
- Trash to A3
- 7 to B1
- 8 to B2
- 9 to B3
- 4 to C1
- 5 to C2
- 6 to C3
- 1 to D1
- 2 to D2
- 3 to D3
```

**Slots A4, B4, C4, and D4 on Flex have no equivalent on OT-2.**

## Module Load Names:

- If your OT-2 protocol uses older generations of the Temperature Module or Thermocycler Module, update the load names you pass to `load_module()` to ones compatible with Flex:

  - Temperature Module: `"temperature module gen2"`
  - Thermocycler Module: `"thermocycler module gen2"` or `"thermocyclerModuleV2"`

- The Heater-Shaker Module (`heaterShakerModuleV1`) is compatible with both Flex and OT-2.

- **Magnetic Module**: Not compatible with Flex. For protocols that load `magnetic module`, `magdeck`, or `magnetic module gen2`, you need to modify the protocol to use the Magnetic Block and Flex Gripper instead. This requires reworking some protocol steps to achieve similar results.

### Main Difference:

- **OT-2**: Pipettes an entire plate's worth of liquid from the Heater-Shaker to the Magnetic Module and then engages the module.

- **Flex**: The gripper moves the plate to the Magnetic Block in one step, eliminating the need for pipetting between modules.

### Example Conversion for Magnetic Module:

#### Original OT-2 Code:

```python
hs_mod.set_and_wait_for_shake_speed(2000)
protocol.delay(minutes=5)
hs_mod.deactivate_shaker()

for i in sample_plate.wells():
    # Mix, transfer, and blow-out all samples
    pipette.pick_up_tip()
    pipette.aspirate(100, hs_plate[i])
    pipette.dispense(100, hs_plate[i])
    pipette.aspirate(100, hs_plate[i])
    pipette.air_gap(10)
    pipette.dispense(pipette.current_volume, mag_plate[i])
    pipette.aspirate(50, hs_plate[i])
    pipette.air_gap(10)
    pipette.dispense(pipette.current_volume, mag_plate[i])
    pipette.blow_out(mag_plate[i].bottom(0.5))
    pipette.drop_tip()

mag_mod.engage()
```

#### Updated Flex Code:

```python
hs_mod.set_and_wait_for_shake_speed(2000)
protocol.delay(minutes=5)
hs_mod.deactivate_shaker()

# Move entire plate using the gripper
hs_mod.open_labware_latch()
protocol.move_labware(sample_plate, mag_block, use_gripper=True)
```

## Flex vs. OT-2 Pipettes:

When converting pipettes, consider the volume ranges:

### OT-2 Pipettes:

- **P20 Single-Channel GEN2**: 1–20 µL, `p20_single_gen2`
- **P20 Multi-Channel GEN2**: 1–20 µL, `p20_multi_gen2`
- **P300 Single-Channel GEN2**: 20–300 µL, `p300_single_gen2`
- **P300 Multi-Channel GEN2**: 20–300 µL, `p300_multi_gen2`
- **P1000 Single-Channel GEN2**: 100–1000 µL, `p1000_single_gen2`

### Flex Pipettes:

- **Flex 1-Channel Pipette**: 1–50 µL, `flex_1channel_50`
- **Flex 1-Channel Pipette**: 5–1000 µL, `flex_1channel_1000`
- **Flex 8-Channel Pipette**: 1–50 µL, `flex_8channel_50`
- **Flex 8-Channel Pipette**: 5–1000 µL, `flex_8channel_1000`
- **Flex 96-Channel Pipette**: 5–1000 µL, `flex_96channel_1000`

## Tip Racks:

### OT-2 Tip Racks:

- `geb_96_tiprack_1000ul`
- `geb_96_tiprack_10ul`
- `opentrons_96_filtertiprack_1000ul`
- `opentrons_96_filtertiprack_10ul`
- `opentrons_96_filtertiprack_200ul`
- `opentrons_96_filtertiprack_20ul`
- `opentrons_96_tiprack_1000ul`
- `opentrons_96_tiprack_10ul`
- `opentrons_96_tiprack_20ul`
- `opentrons_96_tiprack_300ul`

### Flex Tip Racks:

- `opentrons_flex_96_filtertiprack_1000ul`
- `opentrons_flex_96_filtertiprack_200ul`
- `opentrons_flex_96_filtertiprack_50ul`
- `opentrons_flex_96_tiprack_1000ul`
- `opentrons_flex_96_tiprack_200ul`
- `opentrons_flex_96_tiprack_50ul`

**Note**: When converting, match the pipette and tip rack volumes to ensure the protocol functions correctly.

## Additional Notes:

- **Trash Bin**: Remember to load the trash bin before any commands that may require discarding tips.

- **Deck Slots**: Adjust deck slot labels to match the Flex coordinate system for clarity, although numeric labels are still valid.

- **Verification**: After adapting the protocol, verify that the new design achieves similar results, especially if significant changes were made (e.g., replacing the Magnetic Module with the Magnetic Block).
