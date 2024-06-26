"""Map for protocol files available for testing."""

from automation.data.protocol import Protocol


class Protocols:
    """Describe protocols available for testing."""

    # The name of the property must match the file_stem property
    # and be in protocol_files.names

    ##########################################################################################################
    # Begin JSON Protocols ###################################################################################
    ##########################################################################################################

    OT2_S_v6_P1000S_None_SimpleTransfer: Protocol = Protocol(
        file_stem="OT2_S_v6_P1000S_None_SimpleTransfer",
        file_extension="json",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )

    OT2_S_v6_P20S_P300M_TransferReTransferLiquid: Protocol = Protocol(
        file_stem="OT2_S_v6_P20S_P300M_TransferReTransferLiquid",
        file_extension="json",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )
    OT2_X_v6_P20S_None_SimpleTransfer: Protocol = Protocol(
        file_stem="OT2_X_v6_P20S_None_SimpleTransfer",
        file_extension="json",
        robot="OT2",
        app_error=True,
        robot_error=True,
        app_analysis_error="Cannot aspirate more than pipette max volume",
        robot_analysis_error="?",
    )

    OT2_S_v6_P300M_P20S_HS_Smoke620release: Protocol = Protocol(
        file_stem="OT2_S_v6_P300M_P20S_HS_Smoke620release",
        file_extension="json",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )

    OT2_X_v6_P300M_P20S_HS_MM_TM_TC_AllMods: Protocol = Protocol(
        file_stem="OT2_X_v6_P300M_P20S_HS_MM_TM_TC_AllMods",
        file_extension="json",
        robot="OT2",
        app_error=True,
        robot_error=True,
        app_analysis_error="Heater-Shaker cannot open its labware latch while it is shaking.",
        robot_analysis_error="?",
    )

    OT2_S_v4_P300M_P20S_MM_TM_TC1_PD40: Protocol = Protocol(
        file_stem="OT2_S_v4_P300M_P20S_MM_TM_TC1_PD40",
        file_extension="json",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )

    OT2_X_v4_P300M_P20S_MM_TC1_TM_e2eTests: Protocol = Protocol(
        file_stem="OT2_X_v4_P300M_P20S_MM_TC1_TM_e2eTests",
        file_extension="json",
        robot="OT2",
        app_error=True,
        robot_error=True,
        app_analysis_error="Cannot aspirate more than pipette max volume",
        robot_analysis_error="?",
    )

    OT2_S_v6_P300M_P20S_MixTransferManyLiquids: Protocol = Protocol(
        file_stem="OT2_S_v6_P300M_P20S_MixTransferManyLiquids",
        file_extension="json",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )

    OT2_S_v6_P300M_P300S_HS_HS_NormalUseWithTransfer: Protocol = Protocol(
        file_stem="OT2_S_v6_P300M_P300S_HS_HS_NormalUseWithTransfer",
        file_extension="json",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )

    OT2_S_v3_P300SGen1_None_Gen1PipetteSimple: Protocol = Protocol(
        file_stem="OT2_S_v3_P300SGen1_None_Gen1PipetteSimple",
        file_extension="json",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )

    OT2_S_v4_P300S_None_MM_TM_TM_MOAMTemps: Protocol = Protocol(
        file_stem="OT2_S_v4_P300S_None_MM_TM_TM_MOAMTemps",
        file_extension="json",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )

    Flex_X_v8_P1000_96_HS_GRIP_TC_TM_GripperCollisionWithTips: Protocol = Protocol(
        file_stem="Flex_X_v8_P1000_96_HS_GRIP_TC_TM_GripperCollisionWithTips",
        file_extension="json",
        robot="Flex",
        app_error=True,
        robot_error=False,
        app_analysis_error="Gripper collision with tips",
    )

    ############################################################################################################
    # Begin Python Protocols ###################################################################################
    ############################################################################################################

    OT2_S_v2_12_NO_PIPETTES_Python310SyntaxRobotAnalysisOnlyError: Protocol = Protocol(
        file_stem="OT2_S_v2_12_NO_PIPETTES_Python310SyntaxRobotAnalysisOnlyError",
        file_extension="py",
        robot="OT2",
        app_error=False,
        robot_error=True,
        robot_analysis_error="?",
    )

    OT2_X_v2_13_None_None_PythonSyntaxError: Protocol = Protocol(
        file_stem="OT2_X_v2_13_None_None_PythonSyntaxError",
        file_extension="py",
        robot="OT2",
        app_error=True,
        robot_error=True,
        app_analysis_error="No module named 'superspecialmagic'",
        robot_analysis_error="?",
    )

    OT2_S_v2_11_P10S_P300M_MM_TC1_TM_Swift: Protocol = Protocol(
        file_stem="OT2_S_v2_11_P10S_P300M_MM_TC1_TM_Swift",
        file_extension="py",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )

    OT2_S_v2_7_P20S_None_Walkthrough: Protocol = Protocol(
        file_stem="OT2_S_v2_7_P20S_None_Walkthrough",
        file_extension="py",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )

    OT2_S_v2_16_P300M_P20S_aspirateDispenseMix0Volume: Protocol = Protocol(
        file_stem="OT2_S_v2_16_P300M_P20S_aspirateDispenseMix0Volume",
        file_extension="py",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )

    OT2_S_v2_12_P300M_P20S_FailOnRun: Protocol = Protocol(
        file_stem="OT2_S_v2_12_P300M_P20S_FailOnRun",
        file_extension="py",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )
    OT2_S_v2_13_P300M_P20S_HS_TC_TM_SmokeTestV3: Protocol = Protocol(
        file_stem="OT2_S_v2_13_P300M_P20S_HS_TC_TM_SmokeTestV3",
        file_extension="py",
        robot="OT2",
        app_error=False,
        robot_error=False,
        custom_labware=["cpx_4_tuberack_100ul"],
    )

    OT2_S_v2_14_P300M_P20S_HS_TC_TM_SmokeTestV3: Protocol = Protocol(
        file_stem="OT2_S_v2_14_P300M_P20S_HS_TC_TM_SmokeTestV3",
        file_extension="py",
        robot="OT2",
        app_error=False,
        robot_error=False,
        custom_labware=["cpx_4_tuberack_100ul"],
    )

    OT2_S_v2_15_P300M_P20S_HS_TC_TM_SmokeTestV3: Protocol = Protocol(
        file_stem="OT2_S_v2_15_P300M_P20S_HS_TC_TM_SmokeTestV3",
        file_extension="py",
        robot="OT2",
        app_error=False,
        robot_error=False,
        custom_labware=["cpx_4_tuberack_100ul"],
    )

    OT2_S_v2_16_P300M_P20S_HS_TC_TM_SmokeTestV3: Protocol = Protocol(
        file_stem="OT2_S_v2_16_P300M_P20S_HS_TC_TM_SmokeTestV3",
        file_extension="py",
        robot="OT2",
        app_error=False,
        robot_error=False,
        custom_labware=["cpx_4_tuberack_100ul"],
    )

    OT2_S_v2_17_P300M_P20S_HS_TC_TM_SmokeTestV3: Protocol = Protocol(
        file_stem="OT2_S_v2_17_P300M_P20S_HS_TC_TM_SmokeTestV3",
        file_extension="py",
        robot="OT2",
        app_error=False,
        robot_error=False,
        custom_labware=["cpx_4_tuberack_100ul"],
    )

    OT2_S_v2_13_P300M_P20S_MM_TC_TM_Smoke620Release: Protocol = Protocol(
        file_stem="OT2_S_v2_13_P300M_P20S_MM_TC_TM_Smoke620Release",
        file_extension="py",
        robot="OT2",
        app_error=False,
        robot_error=False,
        custom_labware=["cpx_4_tuberack_100ul"],
    )

    OT2_S_v2_4_P300M_None_MM_TM_Zymo: Protocol = Protocol(
        file_stem="OT2_S_v2_4_P300M_None_MM_TM_Zymo",
        file_extension="py",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )

    OT2_X_v2_11_P300S_TC1_TC2_ThermocyclerMoamError: Protocol = Protocol(
        file_stem="OT2_X_v2_11_P300S_TC1_TC2_ThermocyclerMoamError",
        file_extension="py",
        robot="OT2",
        app_error=True,
        robot_error=True,
        app_analysis_error="DeckConflictError [line 19]: thermocyclerModuleV2 in slot 7 prevents thermocyclerModuleV1 from using slot 7.",  # noqa: E501
        robot_analysis_error="?",
    )

    OT2_X_v2_7_P300S_TwinningError: Protocol = Protocol(
        file_stem="OT2_X_v2_7_P300S_TwinningError",
        file_extension="py",
        robot="OT2",
        app_error=True,
        robot_error=True,
        app_analysis_error="AttributeError [line 24]: 'InstrumentContext' object has no attribute 'pair_with'",
        robot_analysis_error="?",
    )

    OT2_S_v2_2_P300S_None_MM1_MM2_EngageMagHeightFromBase: Protocol = Protocol(
        file_stem="OT2_S_v2_2_P300S_None_MM1_MM2_EngageMagHeightFromBase",
        file_extension="py",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )

    OT2_S_v2_3_P300S_None_MM1_MM2_TM_Mix: Protocol = Protocol(
        file_stem="OT2_S_v2_3_P300S_None_MM1_MM2_TM_Mix",
        file_extension="py",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )

    OT2_S_v2_16_P300M_P20S_HS_TC_TM_aspirateDispenseMix0Volume: Protocol = Protocol(
        file_stem="OT2_S_v2_16_P300M_P20S_HS_TC_TM_aspirateDispenseMix0Volume",
        file_extension="py",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )

    OT2_S_v2_15_P300M_P20S_HS_TC_TM_dispense_changes: Protocol = Protocol(
        file_stem="OT2_S_v2_15_P300M_P20S_HS_TC_TM_dispense_changes",
        file_extension="py",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )

    OT2_S_v2_16_P300M_P20S_HS_TC_TM_dispense_changes: Protocol = Protocol(
        file_stem="OT2_S_v2_16_P300M_P20S_HS_TC_TM_dispense_changes",
        file_extension="py",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )

    OT2_S_v2_17_P300M_P20S_HS_TC_TM_dispense_changes: Protocol = Protocol(
        file_stem="OT2_S_v2_17_P300M_P20S_HS_TC_TM_dispense_changes",
        file_extension="py",
        robot="OT2",
        app_error=True,
        robot_error=False,
        app_analysis_error="ValueError [line 15]: Cannot dispense more than pipette max volume",  # noqa: E501
    )

    OT2_S_v2_14_NO_PIPETTES_TC_VerifyThermocyclerLoadedSlots: Protocol = Protocol(
        file_stem="OT2_S_v2_14_NO_PIPETTES_TC_VerifyThermocyclerLoadedSlots",
        file_extension="py",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )

    OT2_S_v2_15_NO_PIPETTES_TC_VerifyThermocyclerLoadedSlots: Protocol = Protocol(
        file_stem="OT2_S_v2_15_NO_PIPETTES_TC_VerifyThermocyclerLoadedSlots",
        file_extension="py",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )

    OT2_S_v2_16_NO_PIPETTES_TC_VerifyThermocyclerLoadedSlots: Protocol = Protocol(
        file_stem="OT2_S_v2_16_NO_PIPETTES_TC_VerifyThermocyclerLoadedSlots",
        file_extension="py",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )

    OT2_S_v2_17_NO_PIPETTES_TC_VerifyThermocyclerLoadedSlots: Protocol = Protocol(
        file_stem="OT2_S_v2_17_NO_PIPETTES_TC_VerifyThermocyclerLoadedSlots",
        file_extension="py",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )

    OT2_X_v2_16_None_None_HS_HeaterShakerConflictWithTrashBin1: Protocol = Protocol(
        file_stem="OT2_X_v2_16_None_None_HS_HeaterShakerConflictWithTrashBin1",
        file_extension="py",
        robot="OT2",
        app_error=True,
        robot_error=False,
        app_analysis_error="DeckConflictError [line 19]: trash_bin in slot 12 prevents heater_shaker in slot 11 from using slot 11.",  # noqa: E501
    )

    OT2_X_v2_16_None_None_HS_HeaterShakerConflictWithTrashBin2: Protocol = Protocol(
        file_stem="OT2_X_v2_16_None_None_HS_HeaterShakerConflictWithTrashBin2",
        file_extension="py",
        robot="OT2",
        app_error=True,
        robot_error=False,
        app_analysis_error="DeckConflictError [line 19]: trash_bin in slot 12 prevents heater_shaker in slot 11 from using slot 11.",  # noqa: E501
    )

    OT2_S_v2_16_NO_PIPETTES_verifyDoesNotDeadlock: Protocol = Protocol(
        file_stem="OT2_S_v2_16_NO_PIPETTES_verifyDoesNotDeadlock",
        file_extension="py",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )

    OT2_S_v2_16_P300S_None_verifyNoFloatingPointErrorInPipetting: Protocol = Protocol(
        file_stem="OT2_S_v2_16_P300S_None_verifyNoFloatingPointErrorInPipetting",
        file_extension="py",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )

    Flex_S_v2_15_P1000_96_GRIP_HS_TM_QuickZymoMagbeadRNAExtraction: Protocol = Protocol(
        file_stem="Flex_S_v2_15_P1000_96_GRIP_HS_TM_QuickZymoMagbeadRNAExtraction",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
        custom_labware=["opentrons_ot3_96_tiprack_1000ul_rss"],
    )
    Flex_S_v2_15_P1000_96_GRIP_HS_MB_TM_OmegaHDQDNAExtraction: Protocol = Protocol(
        file_stem="Flex_S_v2_15_P1000_96_GRIP_HS_MB_TM_OmegaHDQDNAExtraction",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
        custom_labware=["opentrons_ot3_96_tiprack_1000ul_rss"],
    )
    Flex_S_v2_15_P1000_96_GRIP_HS_MB_TM_MagMaxRNAExtraction: Protocol = Protocol(
        file_stem="Flex_S_v2_15_P1000_96_GRIP_HS_MB_TM_MagMaxRNAExtraction",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
        custom_labware=["opentrons_ot3_96_tiprack_200ul_rss"],
    )
    Flex_S_v2_15_P1000_96_GRIP_HS_MB_TC_TM_IlluminaDNAPrep96PART3: Protocol = Protocol(
        file_stem="Flex_S_v2_15_P1000_96_GRIP_HS_MB_TC_TM_IlluminaDNAPrep96PART3",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
        custom_labware=["opentrons_ot3_96_tiprack_200ul_rss", "opentrons_ot3_96_tiprack_50ul_rss"],
    )
    Flex_S_v2_15_P1000_96_GRIP_HS_MB_TC_TM_IDTXgen96Part1to3: Protocol = Protocol(
        file_stem="Flex_S_v2_15_P1000_96_GRIP_HS_MB_TC_TM_IDTXgen96Part1to3",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
        custom_labware=["opentrons_ot3_96_tiprack_50ul_rss", "opentrons_ot3_96_tiprack_200ul_rss"],
    )
    Flex_S_v2_15_P1000M_P50M_GRIP_HS_MB_TC_TM_IlluminaDNAEnrichmentv4: Protocol = Protocol(
        file_stem="Flex_S_v2_15_P1000M_P50M_GRIP_HS_MB_TC_TM_IlluminaDNAEnrichmentv4",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
    )
    Flex_S_v2_15_P1000M_P50M_GRIP_HS_MB_TC_TM_IlluminaDNAEnrichment: Protocol = Protocol(
        file_stem="Flex_S_v2_15_P1000M_P50M_GRIP_HS_MB_TC_TM_IlluminaDNAEnrichment",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
    )
    Flex_S_v2_15_P1000M_P50M_GRIP_HS_MB_TC_TM_IlluminaDNAPrep24x: Protocol = Protocol(
        file_stem="Flex_S_v2_15_P1000M_P50M_GRIP_HS_MB_TC_TM_IlluminaDNAPrep24x",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
    )
    Flex_S_v2_15_P1000S_None_SimpleNormalizeLongRight: Protocol = Protocol(
        file_stem="Flex_S_v2_15_P1000S_None_SimpleNormalizeLongRight",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
        custom_labware=["opentrons_ot3_96_tiprack_200ul_rss"],
    )
    Flex_S_v2_15_P50M_P1000M_KAPALibraryQuantLongv2: Protocol = Protocol(
        file_stem="Flex_S_v2_15_P50M_P1000M_KAPALibraryQuantLongv2",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
    )

    Flex_X_v2_16_NO_PIPETTES_TrashBinInCol2: Protocol = Protocol(
        file_stem="Flex_X_v2_16_NO_PIPETTES_TrashBinInCol2",
        file_extension="py",
        robot="Flex",
        app_error=True,
        robot_error=False,
        app_analysis_error="InvalidTrashBinLocationError [line 15]: Invalid location for trash bin: C2. Valid slots: Any slot in column 1 or 3.",  # noqa: E501
    )

    Flex_X_v2_16_NO_PIPETTES_TrashBinInStagingAreaCol3: Protocol = Protocol(
        file_stem="Flex_X_v2_16_NO_PIPETTES_TrashBinInStagingAreaCol3",
        file_extension="py",
        robot="Flex",
        app_error=True,
        robot_error=False,
        app_analysis_error="ProtocolCommandFailedError [line 21]: Error 4000 GENERAL_ERROR (ProtocolCommandFailedError): IncompatibleAddressableAreaError: Cannot use Trash Bin in C3, not compatible with one or more of the following fixtures: Slot C4",  # noqa: E501
        expected_test_failure=True,
        expected_test_reason="Analysis does not throw error when modules or fixtures are in staging area column 3.",  # noqa: E501
    )

    Flex_X_v2_16_NO_PIPETTES_TrashBinInStagingAreaCol4: Protocol = Protocol(
        file_stem="Flex_X_v2_16_NO_PIPETTES_TrashBinInStagingAreaCol4",
        file_extension="py",
        robot="Flex",
        app_error=True,
        robot_error=False,
        app_analysis_error="ValueError [line 15]: Staging areas not permitted for trash bin.",  # noqa: E501
    )

    Flex_X_v2_16_P1000_96_DropTipsWithNoTrash: Protocol = Protocol(
        file_stem="Flex_X_v2_16_P1000_96_DropTipsWithNoTrash",
        file_extension="py",
        robot="Flex",
        app_error=True,
        robot_error=False,
        app_analysis_error="NoTrashDefinedError [line 24]: Error 4000 GENERAL_ERROR (NoTrashDefinedError): No trash container has been defined in this protocol.",  # noqa: E501
    )

    Flex_X_v2_16_NO_PIPETTES_TM_ModuleInStagingAreaCol3: Protocol = Protocol(
        file_stem="Flex_X_v2_16_NO_PIPETTES_TM_ModuleInStagingAreaCol3",
        file_extension="py",
        robot="Flex",
        app_error=True,
        robot_error=False,
        app_analysis_error="InvalidModuleError [line 19]: Error 4000 GENERAL_ERROR (InvalidModuleError): Cannot use temperature module in C3, not compatible with one or more of the following fixtures: Slot C4",  # noqa: E501
        expected_test_failure=True,
        expected_test_reason="Analysis does not throw error when modules or fixtures are in staging area column 3.",  # noqa: E501
    )

    Flex_X_v2_16_NO_PIPETTES_TM_ModuleInStagingAreaCol4: Protocol = Protocol(
        file_stem="Flex_X_v2_16_NO_PIPETTES_TM_ModuleInStagingAreaCol4",
        file_extension="py",
        robot="Flex",
        app_error=True,
        robot_error=False,
        app_analysis_error="ValueError [line 15]: Cannot load a module onto a staging slot.",  # noqa: E501
    )

    Flex_X_v2_16_P1000_96_TM_ModuleAndWasteChuteConflict: Protocol = Protocol(
        file_stem="Flex_X_v2_16_P1000_96_TM_ModuleAndWasteChuteConflict",
        file_extension="py",
        robot="Flex",
        app_error=True,
        robot_error=False,
        app_analysis_error="ProtocolCommandFailedError [line 25]: Error 4000 GENERAL_ERROR (ProtocolCommandFailedError): IncompatibleAddressableAreaError: Cannot use Waste Chute, not compatible with one or more of the following fixtures: Slot D3",  # noqa: E501
    )

    Flex_X_v2_16_NO_PIPETTES_AccessToFixedTrashProp: Protocol = Protocol(
        file_stem="Flex_X_v2_16_NO_PIPETTES_AccessToFixedTrashProp",
        file_extension="py",
        robot="Flex",
        app_error=True,
        robot_error=False,
        app_analysis_error="APIVersionError [line 15]: Fixed Trash is not supported on Flex protocols in API Version 2.16 and above.",  # noqa: E501
    )

    Flex_X_v2_16_P1000_96_GRIP_DropLabwareIntoTrashBin: Protocol = Protocol(
        file_stem="Flex_X_v2_16_P1000_96_GRIP_DropLabwareIntoTrashBin",
        file_extension="py",
        robot="Flex",
        app_error=True,
        robot_error=False,
        app_analysis_error="ProtocolCommandFailedError [line 20]: Error 4000 GENERAL_ERROR (ProtocolCommandFailedError): IncompatibleAddressableAreaError: Cannot use Slot C3, not compatible with one or more of the following fixtures: Trash Bin in C3",  # noqa: E501
    )

    Flex_X_v2_16_P300MGen2_None_OT2PipetteInFlexProtocol: Protocol = Protocol(
        file_stem="Flex_X_v2_16_P300MGen2_None_OT2PipetteInFlexProtocol",
        file_extension="py",
        robot="Flex",
        app_error=True,
        robot_error=False,
        app_analysis_error="ProtocolCommandFailedError [line 22]: Error 4000 GENERAL_ERROR (ProtocolCommandFailedError): InvalidSpecificationForRobotTypeError: Cannot load a Gen2 pipette on a Flex.",  # noqa: E501
    )

    Flex_X_v2_16_NO_PIPETTES_MM_MagneticModuleInFlexProtocol: Protocol = Protocol(
        file_stem="Flex_X_v2_16_NO_PIPETTES_MM_MagneticModuleInFlexProtocol",
        file_extension="py",
        robot="Flex",
        app_error=True,
        robot_error=False,
        app_analysis_error="ValueError [line 15]: A magneticModuleType cannot be loaded into slot C1",  # noqa: E501
    )

    Flex_X_v2_16_NO_PIPETTES_TM_ModuleInCol2: Protocol = Protocol(
        file_stem="Flex_X_v2_16_NO_PIPETTES_TM_ModuleInCol2",
        file_extension="py",
        robot="Flex",
        app_error=True,
        robot_error=False,
        app_analysis_error="ValueError [line 15]: A temperatureModuleType cannot be loaded into slot C2",  # noqa: E501
    )

    Flex_S_v2_16_P1000_96_GRIP_HS_MB_TC_TM_DeckConfiguration1NoFixtures: Protocol = Protocol(
        file_stem="Flex_S_v2_16_P1000_96_GRIP_HS_MB_TC_TM_DeckConfiguration1NoFixtures",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
    )

    Flex_S_v2_16_P1000_96_GRIP_DeckConfiguration1NoModules: Protocol = Protocol(
        file_stem="Flex_S_v2_16_P1000_96_GRIP_DeckConfiguration1NoModules",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
    )

    Flex_S_v2_16_P1000_96_GRIP_DeckConfiguration1NoModulesNoFixtures: Protocol = Protocol(
        file_stem="Flex_S_v2_16_P1000_96_GRIP_DeckConfiguration1NoModulesNoFixtures",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
    )

    Flex_S_v2_16_P1000_96_GRIP_HS_MB_TC_TM_DeckConfiguration1: Protocol = Protocol(
        file_stem="Flex_S_v2_16_P1000_96_GRIP_HS_MB_TC_TM_DeckConfiguration1",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
    )

    Flex_S_v2_16_P1000_96_GRIP_HS_MB_TC_TM_Smoke: Protocol = Protocol(
        file_stem="Flex_S_v2_16_P1000_96_GRIP_HS_MB_TC_TM_Smoke",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
    )

    Flex_S_v2_15_NO_PIPETTES_TC_verifyThermocyclerLoadedSlots: Protocol = Protocol(
        file_stem="Flex_S_v2_15_NO_PIPETTES_TC_verifyThermocyclerLoadedSlots",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
    )

    Flex_S_v2_16_NO_PIPETTES_TC_verifyThermocyclerLoadedSlots: Protocol = Protocol(
        file_stem="Flex_S_v2_16_NO_PIPETTES_TC_verifyThermocyclerLoadedSlots",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
    )

    Flex_S_v2_17_NO_PIPETTES_TC_verifyThermocyclerLoadedSlots: Protocol = Protocol(
        file_stem="Flex_S_v2_17_NO_PIPETTES_TC_verifyThermocyclerLoadedSlots",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
    )

    Flex_X_v2_16_NO_PIPETTES_TC_TrashBinAndThermocyclerConflict: Protocol = Protocol(
        file_stem="Flex_X_v2_16_NO_PIPETTES_TC_TrashBinAndThermocyclerConflict",
        file_extension="py",
        robot="Flex",
        app_error=True,
        robot_error=False,
        app_analysis_error="IncompatibleAddressableAreaError [line 15]: Cannot use Trash Bin in C3, not compatible with one or more of the following fixtures: Thermocycler in C3",  # noqa: E501
    )

    Flex_X_v2_16_P1000_96_TC_pipetteCollisionWithThermocyclerLidClips: Protocol = Protocol(
        file_stem="Flex_X_v2_16_P1000_96_TC_pipetteCollisionWithThermocyclerLidClips",
        file_extension="py",
        robot="Flex",
        app_error=True,
        robot_error=False,
        app_analysis_error="IncompatibleAddressableAreaError [line 15]: Cannot use Slot C3, not compatible with one or more of the following fixtures: Thermocycler in C3",  # noqa: E501
    )

    Flex_X_v2_16_P1000_96_TC_pipetteCollisionWithThermocyclerLid: Protocol = Protocol(
        file_stem="Flex_X_v2_16_P1000_96_TC_pipetteCollisionWithThermocyclerLid",
        file_extension="py",
        robot="Flex",
        app_error=True,
        robot_error=False,
        app_analysis_error="IncompatibleAddressableAreaError [line 15]: Cannot use Slot C3, not compatible with one or more of the following fixtures: Thermocycler in C3",  # noqa: E501
    )

    Flex_S_v2_16_P1000_96_TC_PartialTipPickupSingle: Protocol = Protocol(
        file_stem="Flex_S_v2_16_P1000_96_TC_PartialTipPickupSingle",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
    )

    Flex_S_v2_16_P1000_96_TC_PartialTipPickupColumn: Protocol = Protocol(
        file_stem="Flex_S_v2_16_P1000_96_TC_PartialTipPickupColumn",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
    )

    Flex_X_v2_16_P1000_96_TC_PartialTipPickupTryToReturnTip: Protocol = Protocol(
        file_stem="Flex_X_v2_16_P1000_96_TC_PartialTipPickupTryToReturnTip",
        file_extension="py",
        robot="Flex",
        app_error=True,
        robot_error=False,
        app_analysis_error="ValueError [line 15]: Cannot return tip in partial tip pickup mode.",  # noqa: E501
    )

    Flex_X_v2_16_P1000_96_TC_PartialTipPickupThermocyclerLidConflict: Protocol = Protocol(
        file_stem="Flex_X_v2_16_P1000_96_TC_PartialTipPickupThermocyclerLidConflict",
        file_extension="py",
        robot="Flex",
        app_error=True,
        robot_error=False,
        app_analysis_error="IncompatibleAddressableAreaError [line 15]: Cannot use Slot C3, not compatible with one or more of the following fixtures: Thermocycler in C3",  # noqa: E501
    )

    Flex_S_v2_16_P1000_96_GRIP_HS_MB_TC_TM_TriggerPrepareForMountMovement: Protocol = Protocol(
        file_stem="Flex_S_v2_16_P1000_96_GRIP_HS_MB_TC_TM_TriggerPrepareForMountMovement",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
    )

    Flex_S_v2_18_NO_PIPETTES_GoldenRTP: Protocol = Protocol(
        file_stem="Flex_S_v2_18_NO_PIPETTES_GoldenRTP",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
    )

    Flex_X_v2_18_NO_PIPETTES_DescriptionTooLongRTP: Protocol = Protocol(
        file_stem="Flex_X_v2_18_NO_PIPETTES_DescriptionTooLongRTP",
        file_extension="py",
        robot="Flex",
        app_error=True,
        robot_error=True,
    )

    Flex_S_v2_18_P1000_96_TipTrackingBug: Protocol = Protocol(
        file_stem="Flex_S_v2_18_P1000_96_TipTrackingBug",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
    )

    Flex_X_v2_18_NO_PIPETTES_ReservedWord: Protocol = Protocol(
        file_stem="Flex_X_v2_18_NO_PIPETTES_ReservedWord",
        file_extension="py",
        robot="Flex",
        app_error=True,
        robot_error=True,
    )

    OT2_X_v2_18_None_None_duplicateRTPVariableName: Protocol = Protocol(
        file_stem="OT2_X_v2_18_None_None_duplicateRTPVariableName",
        file_extension="py",
        robot="OT2",
        app_error=True,
        robot_error=True,
    )

    OT2_S_v2_18_None_None_duplicateChoiceValue: Protocol = Protocol(
        file_stem="OT2_S_v2_18_None_None_duplicateChoiceValue",
        file_extension="py",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )

    OT2_X_v2_18_None_None_StrRTPwith_unit: Protocol = Protocol(
        file_stem="OT2_X_v2_18_None_None_StrRTPwith_unit",
        file_extension="py",
        robot="OT2",
        app_error=True,
        robot_error=True,
    )

    OT2_X_v2_18_None_None_NoRTPdisplay_name: Protocol = Protocol(
        file_stem="OT2_X_v2_18_None_None_NoRTPdisplay_name",
        file_extension="py",
        robot="OT2",
        app_error=True,
        robot_error=True,
    )

    OT2_S_v2_18_NO_PIPETTES_GoldenRTP_OT2: Protocol = Protocol(
        file_stem="OT2_S_v2_18_NO_PIPETTES_GoldenRTP_OT2",
        file_extension="py",
        robot="OT2",
        app_error=False,
        robot_error=False,
    )

    ##########################################################################################################
    # Begin Protocol Library Protocols #######################################################################
    ##########################################################################################################
    pl_96_ch_demo_rtp_with_hs: Protocol = Protocol(
        file_stem="pl_96_ch_demo_rtp_with_hs", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_96_ch_demo_rtp: Protocol = Protocol(
        file_stem="pl_96_ch_demo_rtp", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_AMPure_XP_48x_v8: Protocol = Protocol(
        file_stem="pl_AMPure_XP_48x_v8", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_BacteriaInoculation_Flex_6plates: Protocol = Protocol(
        file_stem="pl_BacteriaInoculation_Flex_6plates",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
        custom_labware=["Omni_Plate_with_Tilt_Adapter", "Omni_Tray_Single_Well_Plate"],
    )
    pl_BCApeptideassay: Protocol = Protocol(
        file_stem="pl_BCApeptideassay", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_Bradford_proteinassay: Protocol = Protocol(
        file_stem="pl_Bradford_proteinassay", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_cherrypicking_csv_airgap: Protocol = Protocol(
        file_stem="pl_cherrypicking_csv_airgap", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_Dynabeads_IP_Flex_96well_final: Protocol = Protocol(
        file_stem="pl_Dynabeads_IP_Flex_96well_final", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_Dynabeads_IP_Flex_96well_RIT_final: Protocol = Protocol(
        file_stem="pl_Dynabeads_IP_Flex_96well_RIT_final", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_EM_seq_48Samples_AllSteps_Edits_150: Protocol = Protocol(
        file_stem="pl_EM_seq_48Samples_AllSteps_Edits_150", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_ExpressPlex_96_final: Protocol = Protocol(
        file_stem="pl_ExpressPlex_96_final",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
        custom_labware=["BioRad_96_Well_Plate_200_uL"],
    )
    pl_ExpressPlex_Pooling_Final: Protocol = Protocol(
        file_stem="pl_ExpressPlex_Pooling_Final", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_Flex_customizable_serial_dilution_upload: Protocol = Protocol(
        file_stem="pl_Flex_customizable_serial_dilution_upload", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_Flex_Protein_Digestion_Protocol: Protocol = Protocol(
        file_stem="pl_Flex_Protein_Digestion_Protocol",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
        custom_labware=["Thermo_96_Well_Plate_2200_uL"],
    )
    pl_Hyperplus_tiptracking_V4_final: Protocol = Protocol(
        file_stem="pl_Hyperplus_tiptracking_V4_final", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_Illumina_DNA_PCR_Free: Protocol = Protocol(
        file_stem="pl_Illumina_DNA_PCR_Free", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_Illumina_DNA_Prep_48x_v8: Protocol = Protocol(
        file_stem="pl_Illumina_DNA_Prep_48x_v8", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_Illumina_Stranded_total_RNA_Ribo_Zero_protocol: Protocol = Protocol(
        file_stem="pl_Illumina_Stranded_total_RNA_Ribo_Zero_protocol",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
        custom_labware=["Eppendorf_96_Well_Plate_150_uL"],
    )
    pl_KAPA_Library_Quant_48_v8: Protocol = Protocol(
        file_stem="pl_KAPA_Library_Quant_48_v8", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_langone_pt2_ribo: Protocol = Protocol(
        file_stem="pl_langone_pt2_ribo", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_langone_ribo_pt1_ramp: Protocol = Protocol(
        file_stem="pl_langone_ribo_pt1_ramp", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_M_N_Nucleomag_DNA_Flex_multi: Protocol = Protocol(
        file_stem="pl_M_N_Nucleomag_DNA_Flex_multi",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
        custom_labware=["Macherey_Nagel_deepwell_plate_2200ul"],
    )
    pl_MagMax_RNA_Cells_Flex_96_Channel: Protocol = Protocol(
        file_stem="pl_MagMax_RNA_Cells_Flex_96_Channel", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_MagMax_RNA_Cells_Flex_multi: Protocol = Protocol(
        file_stem="pl_MagMax_RNA_Cells_Flex_multi", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_microBioID_beads_touchtip: Protocol = Protocol(
        file_stem="pl_microBioID_beads_touchtip", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_Nanopore_Genomic_Ligation_v5_Final: Protocol = Protocol(
        file_stem="pl_Nanopore_Genomic_Ligation_v5_Final", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_NiNTA_Flex_96well_final: Protocol = Protocol(
        file_stem="pl_NiNTA_Flex_96well_final", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_NiNTA_Flex_96well_PlatePrep_final: Protocol = Protocol(
        file_stem="pl_NiNTA_Flex_96well_PlatePrep_final", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_Normalization_with_PCR: Protocol = Protocol(
        file_stem="pl_Normalization_with_PCR",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
        custom_labware=["Axygen_96_Well_Plate_200_uL"],
    )
    pl_Omega_HDQ_DNA_Bacteria_Flex_96_channel: Protocol = Protocol(
        file_stem="pl_Omega_HDQ_DNA_Bacteria_Flex_96_channel", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_Omega_HDQ_DNA_Bacteria_Flex_multi: Protocol = Protocol(
        file_stem="pl_Omega_HDQ_DNA_Bacteria_Flex_multi", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_Omega_HDQ_DNA_Cells_Flex_96_channel: Protocol = Protocol(
        file_stem="pl_Omega_HDQ_DNA_Cells_Flex_96_channel", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_Omega_HDQ_DNA_Cells_Flex_multi: Protocol = Protocol(
        file_stem="pl_Omega_HDQ_DNA_Cells_Flex_multi", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_QIAseq_FX_24x_Normalizer_Workflow_B: Protocol = Protocol(
        file_stem="pl_QIAseq_FX_24x_Normalizer_Workflow_B", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_QIASeq_FX_48x_v8: Protocol = Protocol(
        file_stem="pl_QIASeq_FX_48x_v8", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_sample_dilution_with_96_channel_pipette: Protocol = Protocol(
        file_stem="pl_sample_dilution_with_96_channel_pipette", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_SamplePrep_MS_Cleanup_Flex_upto96: Protocol = Protocol(
        file_stem="pl_SamplePrep_MS_Cleanup_Flex_upto96", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_SamplePrep_MS_Digest_Flex_upto96: Protocol = Protocol(
        file_stem="pl_SamplePrep_MS_Digest_Flex_upto96", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_sigdx_part2: Protocol = Protocol(file_stem="pl_sigdx_part2", file_extension="py", robot="Flex", app_error=False, robot_error=False)
    pl_Takara_InFusionSnapAssembly_Flex: Protocol = Protocol(
        file_stem="pl_Takara_InFusionSnapAssembly_Flex", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_Uni_of_Montana_Cherrypicking_Flex_for_library_upload_v13: Protocol = Protocol(
        file_stem="pl_Uni_of_Montana_Cherrypicking_Flex_for_library_upload_v13",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
    )

    pl_upload_Uni_of_Montana_Normalization_Flex_Final_052324: Protocol = Protocol(
        file_stem="pl_upload_Uni_of_Montana_Normalization_Flex_Final_052324",
        file_extension="py",
        robot="Flex",
        app_error=False,
        robot_error=False,
    )
    pl_Zymo_Magbead_DNA_Cells_Flex_96_channel: Protocol = Protocol(
        file_stem="pl_Zymo_Magbead_DNA_Cells_Flex_96_channel", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_Zymo_Magbead_DNA_Cells_Flex_multi: Protocol = Protocol(
        file_stem="pl_Zymo_Magbead_DNA_Cells_Flex_multi", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_Zymo_Quick_RNA_Cells_Flex_96_Channel: Protocol = Protocol(
        file_stem="pl_Zymo_Quick_RNA_Cells_Flex_96_Channel", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
    pl_Zymo_Quick_RNA_Cells_Flex_multi: Protocol = Protocol(
        file_stem="pl_Zymo_Quick_RNA_Cells_Flex_multi", file_extension="py", robot="Flex", app_error=False, robot_error=False
    )
