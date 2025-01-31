from typing import List

from pydantic import BaseModel

from api.models.chat_response import ChatResponse


class FakeResponse(BaseModel):
    key: str
    chat_response: ChatResponse
    description: str


reagent_transfer: ChatResponse = ChatResponse(
    # ignore E501 line too long
    reply="```python\nfrom opentrons import protocol_api\n\nmetadata = {\n    'protocolName': 'Reagent Transfer Protocol',\n    'author': 'User',\n    'description': 'Simple reagent transfer using P1000 Single-Channel GEN2 pipettes'\n}\nrequirements = {\"robotType\": \"OT-2\", \"apiLevel\": \"2.19\"}\n\ndef run(protocol: protocol_api.ProtocolContext):\n    # Load labware\n    source_plate = protocol.load_labware('thermoscientificnunc_96_wellplate_1300ul', 9)\n    destination_plate = protocol.load_labware('opentrons_96_flat_bottom_adapter_nest_wellplate_200ul_flat', 10)\n    tiprack_1000ul_filter = protocol.load_labware('opentrons_96_filtertiprack_1000ul', 8)\n    tiprack_1000ul = protocol.load_labware('opentrons_96_tiprack_1000ul', 3)\n\n    # Load pipettes\n    p1000_left = protocol.load_instrument('p1000_single_gen2', mount=\"left\", tip_racks=[tiprack_1000ul_filter])\n    p1000_right = protocol.load_instrument('p1000_single_gen2', mount=\"right\", tip_racks=[tiprack_1000ul])\n\n    # Transfer reagents using left pipette\n    transfer_vol_1 = 196\n    source_wells_1 = [source_plate.wells_by_name()[well] for well in ['A7', 'A6', 'A5', 'A2', 'A3']]\n    dest_wells_1 = [destination_plate.wells_by_name()[well] for well in ['A5', 'A9', 'A1', 'A10', 'A2']]\n    p1000_left.transfer(transfer_vol_1, source_wells_1, dest_wells_1, new_tip=\"always\")\n\n    # Transfer reagents using right pipette\n    transfer_vol_2 = 8\n    source_wells_2 = [source_plate.wells_by_name()[well] for well in ['A9', 'A12', 'A6', 'A10', 'A3']]\n    dest_wells_2 = [destination_plate.wells_by_name()[well] for well in ['A7', 'A11', 'A6', 'A3', 'A9']]\n    p1000_right.transfer(transfer_vol_2, source_wells_2, dest_wells_2, new_tip=\"once\")\n```",  # noqa: E501
    fake=True,
)

reagent_transfer_flex: ChatResponse = ChatResponse(
    reply="```python\nfrom opentrons import protocol_api\n\nmetadata = {\n    'protocolName': 'Flex Reagent Transfer Protocol',\n    'author': 'User',\n    'description': 'Transfer reagent using Flex 1-Channel 1000 uL Pipette'\n}\nrequirements = {\"robotType\": \"Flex\", \"apiLevel\": \"2.19\"}\n\ndef run(protocol: protocol_api.ProtocolContext):\n    # Load trash\n    trash = protocol.load_trash_bin(\"A3\")\n\n    # Load labware\n    source_labware = protocol.load_labware('opentrons_96_pcr_adapter_nest_wellplate_100ul_pcr_full_skirt', 'D1')\n    destination_labware = protocol.load_labware('opentrons_96_aluminumblock_biorad_wellplate_200ul', 'C2')\n    tiprack = protocol.load_labware('opentrons_flex_96_filtertiprack_1000ul', 'C1')\n\n    # Load pipette\n    pipette = protocol.load_instrument('flex_1channel_1000', 'left', tip_racks=[tiprack])\n\n    # Transfer reagents\n    transfer_vol = 117.0\n    src_well = source_labware.wells_by_name()['A1']\n    dest_wells = [destination_labware.wells_by_name()[well] for well in ['E12', 'G12', 'B9', 'A6', 'D7']]\n\n    pipette.transfer(transfer_vol, src_well, dest_wells, new_tip=\"always\")\n```",  # noqa: E501
    fake=True,
)

pcr: ChatResponse = ChatResponse(
    reply="```python\nfrom opentrons import protocol_api\nimport math\n\nmetadata = {\n    'protocolName': 'PCR Preparation Protocol',\n    'author': 'User',\n    'description': 'PCR preparation using thermocycler and temperature modules'\n}\nrequirements = {\"robotType\": \"OT-2\", \"apiLevel\": \"2.19\"}\n\ndef run(protocol: protocol_api.ProtocolContext):\n    # Modules\n    thermocycler = protocol.load_module('thermocyclerModuleV2')\n    temp_mod_sample = protocol.load_module('temperature module gen2', '1')\n    temp_mod_mastermix = protocol.load_module('temperature module gen2', '3')\n\n    # Labware\n    sample_plate = temp_mod_sample.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt')\n    mastermix_plate = temp_mod_mastermix.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt')\n    destination_plate = thermocycler.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt')\n    tiprack_20ul = protocol.load_labware('opentrons_96_filtertiprack_20ul', '4')\n\n    # Pipette\n    p20_multi = protocol.load_instrument('p20_multi_gen2', mount=\"left\", tip_racks=[tiprack_20ul])\n\n    # Commands\n    total_samples = 64\n    thermocycler.open_lid()\n    thermocycler.set_block_temperature(6)\n    thermocycler.set_lid_temperature(55)\n    temp_mod_sample.set_temperature(4)\n    temp_mod_mastermix.set_temperature(10)\n\n    # Calculate the number of columns needed\n    number_of_columns = math.ceil(total_samples / 8)\n    \n    # Transfer mastermix\n    mastermix_source_columns = mastermix_plate.columns()[:number_of_columns]\n    destination_columns = destination_plate.columns()[:number_of_columns]\n    p20_multi.transfer(7, mastermix_source_columns, destination_columns, new_tip='once')\n\n    # Transfer samples and mix\n    sample_source_columns = sample_plate.columns()[:number_of_columns]\n    p20_multi.transfer(5, sample_source_columns, destination_columns, mix_after=(9, 12), new_tip='always', blow_out=True, blowout_location='destination well')\n\n    thermocycler.close_lid()\n    \n    # Thermocycler profiles\n    block_max_volume = 12  # Total volume of sample and mastermix\n    thermocycler.execute_profile(steps=[{'temperature': 74, 'hold_time_seconds': 65}], repetitions=1, block_max_volume=block_max_volume)\n    thermocycler.execute_profile(steps=[{'temperature': 60, 'hold_time_seconds': 7},\n                                        {'temperature': 84, 'hold_time_seconds': 19},\n                                        {'temperature': 57, 'hold_time_seconds': 44}],\n                                 repetitions=13, block_max_volume=block_max_volume)\n    thermocycler.execute_profile(steps=[{'temperature': 75, 'hold_time_seconds': 480}], repetitions=1, block_max_volume=block_max_volume)\n    \n    thermocycler.set_block_temperature(4, hold_time_minutes=0)\n    thermocycler.open_lid()\n    temp_mod_mastermix.deactivate()\n    temp_mod_sample.deactivate()\n```",  # noqa: E501
    fake=True,
)

pcr_flex: ChatResponse = ChatResponse(
    reply="```python\nfrom opentrons import protocol_api\nimport math\n\nmetadata = {\n    'protocolName': 'PCR Preparation with Temperature Control',\n    'author': 'User',\n    'description': 'PCR preparation using thermocycler and temperature modules on Flex robot'\n}\nrequirements = {\"robotType\": \"Flex\", \"apiLevel\": \"2.19\"}\n\ndef run(protocol: protocol_api.ProtocolContext):\n    # Load modules\n    thermocycler = protocol.load_module('thermocyclerModuleV2')\n    temp_mod_sample = protocol.load_module('temperature module gen2', 'D1')\n    temp_mod_mastermix = protocol.load_module('temperature module gen2', 'D3')\n\n    # Load adapters onto temperature modules\n    sample_adapter = temp_mod_sample.load_adapter('opentrons_96_well_aluminum_block')\n    mastermix_adapter = temp_mod_mastermix.load_adapter('opentrons_96_well_aluminum_block')\n\n    # Load labware\n    sample_plate = sample_adapter.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt')\n    mastermix_plate = mastermix_adapter.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt')\n    destination_plate = thermocycler.load_labware('opentrons_96_wellplate_200ul_pcr_full_skirt')\n    tiprack_1000ul = protocol.load_labware('opentrons_flex_96_filtertiprack_1000ul', 'C1')\n    tiprack_50ul = protocol.load_labware('opentrons_flex_96_filtertiprack_50ul', 'C2')\n\n    # Load pipettes\n    pipette_1000ul = protocol.load_instrument('flex_8channel_1000', 'left', tip_racks=[tiprack_1000ul])\n    pipette_50ul = protocol.load_instrument('flex_8channel_50', 'right', tip_racks=[tiprack_50ul])\n\n    # Commands\n    total_samples = 72\n    number_of_columns = math.ceil(total_samples / 8)\n\n    thermocycler.set_block_temperature(6)\n    thermocycler.set_lid_temperature(55)\n    thermocycler.open_lid()\n    temp_mod_sample.set_temperature(37)\n    temp_mod_mastermix.set_temperature(10)\n\n    # Transfer mastermix\n    mastermix_source_columns = mastermix_plate.columns()[:number_of_columns]\n    destination_columns = destination_plate.columns()[:number_of_columns]\n    pipette_50ul.transfer(15, mastermix_source_columns, destination_columns, new_tip='once')\n\n    # Transfer samples and mix\n    sample_source_columns = sample_plate.columns()[:number_of_columns]\n    pipette_1000ul.transfer(10, sample_source_columns, destination_columns, mix_after=(9, 25), new_tip='always', blow_out=True, blowout_location='destination well')\n\n    thermocycler.close_lid()\n\n    # Thermocycler profiles\n    block_max_volume = 25  # Total volume of sample and mastermix\n    thermocycler.execute_profile(steps=[{'temperature': 74, 'hold_time_seconds': 65}], repetitions=1, block_max_volume=block_max_volume)\n    thermocycler.execute_profile(steps=[{'temperature': 60, 'hold_time_seconds': 7},\n                                        {'temperature': 84, 'hold_time_seconds': 19},\n                                        {'temperature': 57, 'hold_time_seconds': 44}],\n                                 repetitions=25, block_max_volume=block_max_volume)\n    thermocycler.execute_profile(steps=[{'temperature': 75, 'hold_time_seconds': 480}], repetitions=1, block_max_volume=block_max_volume)\n\n    thermocycler.set_block_temperature(4, hold_time_minutes=0)\n    thermocycler.open_lid()\n    temp_mod_mastermix.deactivate()\n    temp_mod_sample.deactivate()\n```",  # noqa: E501
    fake=True,
)

no_markdown: ChatResponse = ChatResponse(reply="👀 at me I am a response without markdown! 😊 99.99μl", fake=True)

empty_reply: ChatResponse = ChatResponse(reply="", fake=True)


ReagentTransfer = FakeResponse(key="reagent transfer", chat_response=reagent_transfer, description="OT2 Reagent Transfer Protocol")
ReagentTransferFlex = FakeResponse(
    key="reagent transfer flex", chat_response=reagent_transfer_flex, description="Flex Reagent Transfer Protocol"
)
PCR = FakeResponse(key="PCR", chat_response=pcr, description="OT2 PCR Preparation Protocol")
PCRFlex = FakeResponse(key="PCR Flex", chat_response=pcr_flex, description="Flex PCR Preparation Protocol")
NoMarkdown = FakeResponse(key="no markdown", chat_response=no_markdown, description="Response without markdown")
EmptyReply = FakeResponse(key="empty reply", chat_response=empty_reply, description="Reply field has empty string ''")

fake_responses: List[FakeResponse] = [ReagentTransfer, ReagentTransferFlex, PCR, PCRFlex, NoMarkdown, EmptyReply]
fake_keys: List[str] = [response.key.lower() for response in fake_responses]


def get_fake_response(key: str) -> FakeResponse:
    """Get a fake response by key. Raises ValueError if not found."""
    for response in fake_responses:
        if response.key.lower() == key.lower():
            return response
    raise ValueError(f"Fake response with key {key} not found")
