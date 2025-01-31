"""Tip pickup and drop procedures."""

from typing import Optional, Dict
from typing_extensions import Protocol as TypingProtocol

from opentrons.hardware_control import HardwareControlAPI
from opentrons.hardware_control.types import FailedTipStateCheck, InstrumentProbeType
from opentrons.protocol_engine.errors.exceptions import PickUpTipTipNotAttachedError
from opentrons.types import Mount, NozzleConfigurationType

from opentrons_shared_data.errors.exceptions import (
    CommandPreconditionViolated,
    CommandParameterLimitViolated,
    PythonException,
)

from ..resources import LabwareDataProvider, ensure_ot3_hardware
from ..state.state import StateView
from ..types import TipGeometry, TipPresenceStatus
from ..errors import (
    HardwareNotSupportedError,
    TipNotAttachedError,
    TipAttachedError,
    ProtocolEngineError,
)

PRIMARY_NOZZLE_TO_ENDING_NOZZLE_MAP = {
    "A1": {"COLUMN": "H1", "ROW": "A12"},
    "H1": {"COLUMN": "A1", "ROW": "H12"},
    "A12": {"COLUMN": "H12", "ROW": "A1"},
    "H12": {"COLUMN": "A12", "ROW": "H1"},
}

PRIMARY_NOZZLE_TO_BACK_LEFT_NOZZLE_MAP = {
    "A1": {"COLUMN": "A1", "ROW": "A1"},
    "H1": {"COLUMN": "A1", "ROW": "H1"},
    "A12": {"COLUMN": "A12", "ROW": "A1"},
    "H12": {"COLUMN": "A12", "ROW": "H1"},
}


class TipHandler(TypingProtocol):
    """Pick up and drop tips."""

    async def available_for_nozzle_layout(
        self,
        pipette_id: str,
        style: str,
        primary_nozzle: Optional[str] = None,
        front_right_nozzle: Optional[str] = None,
        back_left_nozzle: Optional[str] = None,
    ) -> Dict[str, str]:
        """Check nozzle layout is compatible with the pipette.

        Returns:
            A dict of nozzles used to configure the pipette.
        """
        ...

    async def pick_up_tip(
        self,
        pipette_id: str,
        labware_id: str,
        well_name: str,
        do_not_ignore_tip_presence: bool = True,
    ) -> TipGeometry:
        """Pick up the named tip.

        Pipette should be in place over the named tip prior to calling this method.

        Returns:
            Tip geometry of the picked up tip.

        Raises:
            PickUpTipTipNotAttachedError
        """
        ...

    async def drop_tip(
        self,
        pipette_id: str,
        home_after: Optional[bool],
        do_not_ignore_tip_presence: bool = True,
        ignore_plunger: bool = False,
    ) -> None:
        """Drop the attached tip into the current location.

        Pipette should be in place over the destination prior to calling this method.

        Raises:
            TipAttachedError
        """

    def cache_tip(self, pipette_id: str, tip: TipGeometry) -> None:
        """Tell the Hardware API that a tip is attached."""

    def remove_tip(self, pipette_id: str) -> None:
        """Tell the hardware API that no tip is attached."""

    async def get_tip_presence(self, pipette_id: str) -> TipPresenceStatus:
        """Get tip presence status on the pipette."""

    async def verify_tip_presence(
        self,
        pipette_id: str,
        expected: TipPresenceStatus,
        follow_singular_sensor: Optional[InstrumentProbeType] = None,
    ) -> None:
        """Use sensors to verify that a tip is or is not physically attached.

        Raises:
            TipNotAttachedError or TipAttachedError, as appropriate, if the physical
            status doesn't match what was expected.
        """


async def _available_for_nozzle_layout(  # noqa: C901
    channels: int,
    style: str,
    primary_nozzle: Optional[str],
    front_right_nozzle: Optional[str],
    back_left_nozzle: Optional[str],
) -> Dict[str, str]:
    """Check nozzle layout is compatible with the pipette.

    Returns:
        A dict of nozzles used to configure the pipette.
    """
    if channels == 1:
        raise CommandPreconditionViolated(
            message=f"Cannot configure nozzle layout with a {channels} channel pipette."
        )
    if style == "ALL":
        return {}
    if style == "ROW" and channels == 8:
        raise CommandParameterLimitViolated(
            command_name="configure_nozzle_layout",
            parameter_name="RowNozzleLayout",
            limit_statement="RowNozzleLayout is incompatible with {channels} channel pipettes.",
            actual_value=str(primary_nozzle),
        )
    if style == "PARTIAL_COLUM" and channels == 96:
        raise CommandParameterLimitViolated(
            command_name="configure_nozzle_layout",
            parameter_name="PartialColumnNozzleLayout",
            limit_statement="PartialColumnNozzleLayout is incompatible with {channels} channel pipettes.",
            actual_value=str(primary_nozzle),
        )
    if not primary_nozzle:
        return {"primary_nozzle": "A1"}
    if style == "SINGLE":
        return {"primary_nozzle": primary_nozzle}
    if style == "QUADRANT" and front_right_nozzle and not back_left_nozzle:
        return {
            "primary_nozzle": primary_nozzle,
            "front_right_nozzle": front_right_nozzle,
            "back_left_nozzle": primary_nozzle,
        }
    if style == "QUADRANT" and back_left_nozzle and not front_right_nozzle:
        return {
            "primary_nozzle": primary_nozzle,
            "front_right_nozzle": primary_nozzle,
            "back_left_nozzle": back_left_nozzle,
        }
    if not front_right_nozzle and back_left_nozzle:
        return {
            "primary_nozzle": primary_nozzle,
            "front_right_nozzle": PRIMARY_NOZZLE_TO_ENDING_NOZZLE_MAP[primary_nozzle][
                style
            ],
            "back_left_nozzle": back_left_nozzle,
        }
    if front_right_nozzle and not back_left_nozzle:
        return {
            "primary_nozzle": primary_nozzle,
            "front_right_nozzle": front_right_nozzle,
            "back_left_nozzle": PRIMARY_NOZZLE_TO_BACK_LEFT_NOZZLE_MAP[primary_nozzle][
                style
            ],
        }
    if front_right_nozzle and back_left_nozzle:
        return {
            "primary_nozzle": primary_nozzle,
            "front_right_nozzle": front_right_nozzle,
            "back_left_nozzle": back_left_nozzle,
        }

    return {
        "primary_nozzle": primary_nozzle,
        "front_right_nozzle": PRIMARY_NOZZLE_TO_ENDING_NOZZLE_MAP[primary_nozzle][
            style
        ],
        "back_left_nozzle": PRIMARY_NOZZLE_TO_BACK_LEFT_NOZZLE_MAP[primary_nozzle][
            style
        ],
    }


class HardwareTipHandler(TipHandler):
    """Pick up and drop tips, using the Hardware API."""

    def __init__(
        self,
        state_view: StateView,
        hardware_api: HardwareControlAPI,
        labware_data_provider: Optional[LabwareDataProvider] = None,
    ) -> None:
        self._hardware_api = hardware_api
        self._labware_data_provider = labware_data_provider or LabwareDataProvider()
        self._state_view = state_view

        # WARNING: ErrorRecoveryHardwareStateSynchronizer can currently construct several
        # instances of this class per run, in addition to the main instance used
        # for command execution. We're therefore depending on this class being
        # stateless, so consider that before adding additional attributes here.

    async def available_for_nozzle_layout(
        self,
        pipette_id: str,
        style: str,
        primary_nozzle: Optional[str] = None,
        front_right_nozzle: Optional[str] = None,
        back_left_nozzle: Optional[str] = None,
    ) -> Dict[str, str]:
        """See documentation on abstract base class."""
        if self._state_view.pipettes.get_attached_tip(pipette_id):
            raise CommandPreconditionViolated(
                message=f"Cannot configure nozzle layout of {str(self)} while it has tips attached."
            )
        channels = self._state_view.pipettes.get_channels(pipette_id)
        return await _available_for_nozzle_layout(
            channels, style, primary_nozzle, front_right_nozzle, back_left_nozzle
        )

    async def pick_up_tip(
        self,
        pipette_id: str,
        labware_id: str,
        well_name: str,
        do_not_ignore_tip_presence: bool = True,
    ) -> TipGeometry:
        """See documentation on abstract base class."""
        hw_mount = self._get_hw_mount(pipette_id)

        nominal_tip_geometry = self._state_view.geometry.get_nominal_tip_geometry(
            pipette_id=pipette_id, labware_id=labware_id, well_name=well_name
        )

        actual_tip_length = await self._labware_data_provider.get_calibrated_tip_length(
            pipette_serial=self._state_view.pipettes.get_serial_number(pipette_id),
            labware_definition=self._state_view.labware.get_definition(labware_id),
            nominal_fallback=nominal_tip_geometry.length,
        )

        tip_geometry = TipGeometry(
            length=actual_tip_length,
            diameter=nominal_tip_geometry.diameter,
            volume=nominal_tip_geometry.volume,
        )

        await self._hardware_api.tip_pickup_moves(
            mount=hw_mount, presses=None, increment=None
        )
        if do_not_ignore_tip_presence:
            try:
                await self.verify_tip_presence(pipette_id, TipPresenceStatus.PRESENT)
            except TipNotAttachedError as e:
                raise PickUpTipTipNotAttachedError(tip_geometry=tip_geometry) from e

        self.cache_tip(pipette_id, tip_geometry)

        await self._hardware_api.prepare_for_aspirate(hw_mount)

        return tip_geometry

    async def drop_tip(
        self,
        pipette_id: str,
        home_after: Optional[bool],
        do_not_ignore_tip_presence: bool = True,
        ignore_plunger: bool = False,
    ) -> None:
        """See documentation on abstract base class."""
        hw_mount = self._get_hw_mount(pipette_id)

        # Let the hardware controller handle defaulting home_after since its behavior
        # differs between machines
        if home_after is not None:
            kwargs = {"home_after": home_after}
        else:
            kwargs = {}

        await self._hardware_api.tip_drop_moves(
            mount=hw_mount, ignore_plunger=ignore_plunger, **kwargs
        )

        if do_not_ignore_tip_presence:
            # Allow TipNotAttachedError to propagate.
            await self.verify_tip_presence(pipette_id, TipPresenceStatus.ABSENT)

        self.remove_tip(pipette_id)

    def cache_tip(self, pipette_id: str, tip: TipGeometry) -> None:
        """See documentation on abstract base class."""
        hw_mount = self._get_hw_mount(pipette_id)

        self._hardware_api.cache_tip(mount=hw_mount, tip_length=tip.length)

        self._hardware_api.set_current_tiprack_diameter(
            mount=hw_mount,
            tiprack_diameter=tip.diameter,
        )

        self._hardware_api.set_working_volume(
            mount=hw_mount,
            tip_volume=tip.volume,
        )

    def remove_tip(self, pipette_id: str) -> None:
        """See documentation on abstract base class."""
        hw_mount = self._get_hw_mount(pipette_id)
        self._hardware_api.remove_tip(hw_mount)
        self._hardware_api.set_current_tiprack_diameter(hw_mount, 0)

    async def get_tip_presence(self, pipette_id: str) -> TipPresenceStatus:
        """See documentation on abstract base class."""
        try:
            ot3api = ensure_ot3_hardware(hardware_api=self._hardware_api)

            hw_mount = self._get_hw_mount(pipette_id)

            status = await ot3api.get_tip_presence_status(hw_mount)
            return TipPresenceStatus.from_hw_state(status)
        except HardwareNotSupportedError:
            # Tip presence sensing is not supported on the OT2
            return TipPresenceStatus.UNKNOWN

    async def verify_tip_presence(
        self,
        pipette_id: str,
        expected: TipPresenceStatus,
        follow_singular_sensor: Optional[InstrumentProbeType] = None,
    ) -> None:
        """See documentation on abstract base class."""
        nozzle_configuration = self._state_view.pipettes.get_nozzle_configuration(
            pipette_id=pipette_id
        )

        # Configuration metrics by which tip presence checking is ignored
        unsupported_pipette_types = [8, 96]
        unsupported_layout_types = [
            NozzleConfigurationType.SINGLE,
            NozzleConfigurationType.COLUMN,
        ]
        # NOTE: (09-20-2024) Current on multi-channel pipettes, utilizing less than 4 nozzles risks false positives on the tip presence sensor
        supported_partial_nozzle_minimum = 4

        if (
            nozzle_configuration is not None
            and self._state_view.pipettes.get_channels(pipette_id)
            in unsupported_pipette_types
            and nozzle_configuration.configuration in unsupported_layout_types
            and len(nozzle_configuration.map_store) < supported_partial_nozzle_minimum
        ):
            # Tip presence sensing is not supported for single tip pick up on the 96ch Flex Pipette, nor with single and some partial layous of the 8ch Flex Pipette.
            # This is due in part to a press distance tolerance which creates a risk case for false positives. In the case of single tip, the mechanical tolerance
            # for presses with 100% success is below the minimum average achieved press distance for a given multi channel pipette in that configuration.
            return
        try:
            ot3api = ensure_ot3_hardware(hardware_api=self._hardware_api)
            hw_mount = self._get_hw_mount(pipette_id)
            await ot3api.verify_tip_presence(
                hw_mount, expected.to_hw_state(), follow_singular_sensor
            )
        except HardwareNotSupportedError:
            # Tip presence sensing is not supported on the OT2
            pass
        except FailedTipStateCheck as e:
            if expected == TipPresenceStatus.ABSENT:
                raise TipAttachedError(wrapping=[PythonException(e)])
            elif expected == TipPresenceStatus.PRESENT:
                raise TipNotAttachedError(wrapping=[PythonException(e)])
            else:
                raise ProtocolEngineError(
                    message="Unknown tip status in tip status check",
                    wrapping=[PythonException(e)],
                )

    def _get_hw_mount(self, pipette_id: str) -> Mount:
        return self._state_view.pipettes.get_mount(pipette_id).to_hw_mount()


class VirtualTipHandler(TipHandler):
    """Pick up and drop tips, using a virtual pipette."""

    def __init__(self, state_view: StateView) -> None:
        self._state_view = state_view

    async def pick_up_tip(
        self,
        pipette_id: str,
        labware_id: str,
        well_name: str,
        do_not_ignore_tip_presence: bool = True,
    ) -> TipGeometry:
        """Pick up a tip at the current location using a virtual pipette.

        - Fetch nominal tip geometry
        - Check that there's no tip currently attached
        """
        nominal_tip_geometry = self._state_view.geometry.get_nominal_tip_geometry(
            pipette_id=pipette_id,
            labware_id=labware_id,
            well_name=well_name,
        )

        self._state_view.pipettes.validate_tip_state(
            pipette_id=pipette_id,
            expected_has_tip=False,
        )

        return nominal_tip_geometry

    async def available_for_nozzle_layout(
        self,
        pipette_id: str,
        style: str,
        primary_nozzle: Optional[str] = None,
        front_right_nozzle: Optional[str] = None,
        back_left_nozzle: Optional[str] = None,
    ) -> Dict[str, str]:
        """See documentation on abstract base class."""
        if self._state_view.pipettes.get_attached_tip(pipette_id):
            raise CommandPreconditionViolated(
                message=f"Cannot configure nozzle layout of {str(self)} while it has tips attached."
            )
        channels = self._state_view.pipettes.get_channels(pipette_id)
        return await _available_for_nozzle_layout(
            channels, style, primary_nozzle, front_right_nozzle, back_left_nozzle
        )

    async def drop_tip(
        self,
        pipette_id: str,
        home_after: Optional[bool],
        do_not_ignore_tip_presence: bool = True,
        ignore_plunger: bool = False,
    ) -> None:
        """Pick up a tip at the current location using a virtual pipette.

        - Check that there's no tip currently attached
        """
        self._state_view.pipettes.validate_tip_state(
            pipette_id=pipette_id,
            expected_has_tip=True,
        )

    def cache_tip(self, pipette_id: str, tip: TipGeometry) -> None:
        """See documentation on abstract base class.

        This should not be called when using virtual pipettes.
        """
        assert False, "TipHandler.cache_tip should not be used with virtual pipettes"

    def remove_tip(self, pipette_id: str) -> None:
        """See documentation on abstract base class.

        This should not be called when using virtual pipettes.
        """
        assert False, "TipHandler.remove_tip should not be used with virtual pipettes"

    async def verify_tip_presence(
        self,
        pipette_id: str,
        expected: TipPresenceStatus,
        follow_singular_sensor: Optional[InstrumentProbeType] = None,
    ) -> None:
        """Verify tip presence.

        This should not be called when using virtual pipettes.
        """

    async def get_tip_presence(self, pipette_id: str) -> TipPresenceStatus:
        """Get tip presence.

        This is a check to the physical machine's sensors  and should not be
        called on a virtual pipette.
        """
        raise RuntimeError("Do not call VirtualTipHandler.get_tip_presence")


def create_tip_handler(
    state_view: StateView, hardware_api: HardwareControlAPI
) -> TipHandler:
    """Create a tip handler."""
    return (
        HardwareTipHandler(state_view=state_view, hardware_api=hardware_api)
        if state_view.config.use_virtual_pipettes is False
        else VirtualTipHandler(state_view=state_view)
    )
