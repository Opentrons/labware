# Deck Layout Rules

## Overview

This document collects all of the guidelines around recommended deck slot locations in one place. Previously, this information was scattered in multiple documents, or the logic was built into Opentrons products like Protocol Designer or the OT App.

## Deck Slot Guidelines - OT-2

OT-2 deck slots: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, trash bin.

### Modules

- Heater-Shaker

  - Recommended: Slot 1
  - Allowed: Slots 3, 4, 6, 7, 1
  - Not allowed: Slots 2, 5, 8, 9, 11

- Magnetic Module

  - Recommended: Slot 1
  - Allowed: Slots 3, 4, 6, 7, 9, 10
  - Not allowed: Slots 2, 5, 8, 11

- Magnetic Block: Not compatible with OT-2

- Plate Reader Module (Absorbance): Not compatible with OT-2

- Temperature Module

  - Recommended: Slot 3
  - Allowed: Slot 1, 4, 6, 7, 9, 10
  - Not allowed: Slots 2, 5, 8, 11

- Thermocycler Module

  - Recommended/Allowed: Slots 7, 8, 10, and 11 (All four slots)
  - Not allowed: Any other location
  - Note: Only one Thermocycler module can be added to the deck.

- Fixtures - N/A
  - The OT-2 waste bin is fixed on the deck map, taking up what would have been Slot 12.

### Labware

Note: We should default to placing the shortest labware near the front and left of the OT-2 (Slot 1 then 2 then 3 then 4 then 5, etc.), followed by progressively taller labware towards the back and right. From shortest to tallest the order should be: Well plates, then Reservoirs, then Tube racks, then Tip racks.

- Well plates

  - Recommended: Slots 1, 2, or 3
  - If needed: Slots 4, 5, or 6
  - Allowed: Any slot

- Reservoirs

  - Recommended: Slots 4, 5, or 6
  - If available: Slots 1, 2, or 3
  - If needed: Slots 7, 8, or 9
  - Allowed: Any slot

- Tube racks

  - Recommended: Slots 7, 8, or 9
  - If available: Slots 1, 4, 2, 5, 3, or 6 (Slots on the far left side are preferable to ones in the middle or left since they’re easier to access.)
  - Allowed: Any slot

- Tip racks
  - Recommended: Slots 11, 10, 9, 8, 7 (Start towards the back right and move left then to the front)
  - If available: Slots 6, 5, 4, 3, 2, 1
  - Allowed: Any slot

## Deck Slot Guidelines - Flex

Flex deck layout: D1, D2, D3, C1, C2, C3, B1, B2, B3, A1, A2, A3 (Trash bin)

### Modules

- Heater-Shaker

  - Recommended: Slot D1
  - Allowed: Slots A1, B1, C1, D1, A3, B3, C3, or D3
  - Not allowed: Slots A2, B2, C2, or D2

- Magnetic Module: Not compatible with Flex

- Magnetic Block

  - Recommended: Slot D2
  - Allowed: Slots A1, B1, C1, D1, A2, B2, C2, D2, A3, B3, C3, or D3
  - Not allowed: On staging area slots

- Plate Reader Module (Absorbance)

  - Recommended: D3
  - Allowed: Slots A3, B3, C3, or D
  - Not allowed: Slots A1, B1, C1, D1, A2, B2, C2, or D2

- Temperature Module

  - Recommended: D1
  - Allowed: A1, B1, C1, D1, A3, B3, C3, or D3
  - Not allowed: A2, B2, C2, or D2

- Thermocycler Module
  - Recommended/Allowed: A1 + B1 (Both slots)
  - Not allowed: Any other location

### Fixtures

- Staging area slots

  - Allowed: A3, B3, C3, or D3
  - Not allowed: A1, B1, C1, D1, A2, B2, C2, or D2
  - Notes: When a staging area slot is added, a new deck slot is created in the far right column in slots A4, B4, C4, or D4. The gripper can access these deck slots, but pipetting in column 4 is not possible.
  - Because the staging area slots can only be accessed by the gripper, tube racks should not be placed in these locations since the gripper cannot safely move this type of labware. All other labware types are compatible with staging area slots.
  - The trash bin cannot occupy the same deck slot as a staging area slot.

- Trash bin

  - Recommended: A3
  - Allowed: A1, B1, C1, D1, A3, B3, C3, or D3
  - Not allowed: A2, B2, C2, or D2
  - Note: The trash bin cannot occupy the same deck slot as a staging area slot.

- Waste chute
  - Recommended/Allowed: D3 (The waste chute fixture diverts waste to an off-deck receptacle and is designed to be placed exclusively in slot D3).
  - Not allowed: Any other location

### Labware

Note: We should default to placing the shortest labware near the front and left of the Flex (Slot D1 then D2 then D3 then C1 then C2, etc.), followed by progressively taller labware towards the back and right. From shortest to tallest the order should be: Well plates, then Reservoirs, then Tube racks, then Tip racks.

- Well plates

  - Recommended: Slots D1, D2, or D3
  - If needed: Slots C1, C2, C3, B1, B2, B3, A1, A2, or A3
  - Allowed: Any slot

- Reservoirs

  - Recommended: Slots C1, C2, or C3
  - If available: Slots D1, D2, or D3
  - If needed: Slots B1, B2, B3, A1, A2, or A3
  - Allowed: Any slot

- Tube racks

  - Recommended: Slots B1, B2, B3
  - If available: Slots D1, C1, D2, C2, D3, or C3 (Slots on the far left side are preferable to ones in the middle or left since they’re easier to access.)
  - Allowed: Any slot

- Tip racks

  - Recommended: Slots A3 (if trash bin is not present), A2, A1, B3, B2, B1 (Start towards the back right and move left then to the front)
  - If available: Slots C3, C2, C1, D3, D2, or D1
  - Allowed: Any slot

- Adapters
  - Opentrons Flex 96 Tip Rack Adapter
  - Recommended: A2, B2, C2, D2 (to avoid modules in columns 1 and 3)
  - Allowed: Any slot

## Reference documents

1. Confluence: https://opentrons.atlassian.net/wiki/spaces/RPDO/pages/3859939364
2. Flex product manual (See the section on Deck Fixtures in Chapter 3): https://insights.opentrons.com/hubfs/Products/Flex/Opentrons Flex manual REV2.pdf
3. OT-2 product manual: https://insights.opentrons.com/hubfs/Products/OT-2/OT-2R User Manual.pdf
