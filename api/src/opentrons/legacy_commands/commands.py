from __future__ import annotations
from typing import TYPE_CHECKING, List, Union, overload


from .helpers import stringify_location, stringify_disposal_location, listify
from . import types as command_types

from opentrons.types import Location
from opentrons.protocol_api.disposal_locations import TrashBin, WasteChute

if TYPE_CHECKING:
    from opentrons.protocol_api import InstrumentContext
    from opentrons.protocol_api.labware import Well


def home(mount: str) -> command_types.HomeCommand:
    text = f"Homing pipette plunger on mount {mount}"
    return {"name": command_types.HOME, "payload": {"axis": mount, "text": text}}


def aspirate(
    instrument: InstrumentContext,
    volume: float,
    location: Location,
    flow_rate: float,
    rate: float,
) -> command_types.AspirateCommand:
    location_text = stringify_location(location)
    template = "Aspirating {volume} uL from {location} at {flow} uL/sec"
    text = template.format(volume=float(volume), location=location_text, flow=flow_rate)

    return {
        "name": command_types.ASPIRATE,
        "payload": {
            "instrument": instrument,
            "volume": volume,
            "location": location,
            "rate": rate,
            "text": text,
        },
    }


def dispense(
    instrument: InstrumentContext,
    volume: float,
    location: Location,
    flow_rate: float,
    rate: float,
) -> command_types.DispenseCommand:
    location_text = stringify_location(location)
    template = "Dispensing {volume} uL into {location} at {flow} uL/sec"
    text = template.format(volume=float(volume), location=location_text, flow=flow_rate)

    return {
        "name": command_types.DISPENSE,
        "payload": {
            "instrument": instrument,
            "volume": volume,
            "location": location,
            "rate": rate,
            "text": text,
        },
    }


def dispense_in_disposal_location(
    instrument: InstrumentContext,
    volume: float,
    location: Union[TrashBin, WasteChute],
    flow_rate: float,
    rate: float,
) -> command_types.DispenseInDisposalLocationCommand:
    location_text = stringify_disposal_location(location)
    text = f"Dispensing {float(volume)} uL into {location_text} at {flow_rate} uL/sec"

    return {
        "name": command_types.DISPENSE_IN_DISPOSAL_LOCATION,
        "payload": {
            "instrument": instrument,
            "volume": volume,
            "location": location,
            "rate": rate,
            "text": text,
        },
    }


def consolidate(
    instrument: InstrumentContext,
    volume: Union[float, List[float]],
    source: List[Union[Location, Well]],
    dest: Union[Location, Well],
) -> command_types.ConsolidateCommand:
    text = "Consolidating {volume} from {source} to {dest}".format(
        volume=transform_volumes(volume),
        source=stringify_location(source),
        dest=stringify_location(dest),
    )
    locations: List[Union[Location, Well]] = listify(source) + listify(dest)
    return {
        "name": command_types.CONSOLIDATE,
        "payload": {
            "instrument": instrument,
            "locations": locations,
            "volume": volume,
            "source": source,
            "dest": dest,
            "text": text,
        },
    }


def distribute(
    instrument: InstrumentContext,
    volume: Union[float, List[float]],
    source: Union[Location, Well],
    dest: List[Union[Location, Well]],
) -> command_types.DistributeCommand:
    text = "Distributing {volume} from {source} to {dest}".format(
        volume=transform_volumes(volume),
        source=stringify_location(source),
        dest=stringify_location(dest),
    )
    locations: List[Union[Location, Well]] = listify(source) + listify(dest)
    return {
        "name": command_types.DISTRIBUTE,
        "payload": {
            "instrument": instrument,
            "locations": locations,
            "volume": volume,
            "source": source,
            "dest": dest,
            "text": text,
        },
    }


def transfer(
    instrument: InstrumentContext,
    volume: Union[float, List[float]],
    source: List[Union[Location, Well]],
    dest: List[Union[Location, Well]],
) -> command_types.TransferCommand:
    text = "Transferring {volume} from {source} to {dest}".format(
        volume=transform_volumes(volume),
        source=stringify_location(source),
        dest=stringify_location(dest),
    )
    locations: List[Union[Location, Well]] = listify(source) + listify(dest)
    return {
        "name": command_types.TRANSFER,
        "payload": {
            "instrument": instrument,
            "locations": locations,
            "volume": volume,
            "source": source,
            "dest": dest,
            "text": text,
        },
    }


@overload
def transform_volumes(volumes: Union[float, int]) -> float:
    ...


@overload
def transform_volumes(volumes: List[float]) -> List[float]:
    ...


def transform_volumes(
    volumes: Union[float, int, List[float]]
) -> Union[float, List[float]]:
    if not isinstance(volumes, list):
        return float(volumes)
    else:
        return [float(vol) for vol in volumes]


def mix(
    instrument: InstrumentContext,
    repetitions: int,
    volume: float,
    location: Union[Well, Location, None],
) -> command_types.MixCommand:
    text = "Mixing {repetitions} times with a volume of {volume} ul".format(
        repetitions=repetitions, volume=float(volume)
    )
    return {
        "name": command_types.MIX,
        "payload": {
            "instrument": instrument,
            "location": location,
            "volume": volume,
            "repetitions": repetitions,
            "text": text,
        },
    }


def blow_out(
    instrument: InstrumentContext, location: Location
) -> command_types.BlowOutCommand:
    location_text = stringify_location(location)
    text = f"Blowing out at {location_text}"

    return {
        "name": command_types.BLOW_OUT,
        "payload": {"instrument": instrument, "location": location, "text": text},
    }


def blow_out_in_disposal_location(
    instrument: InstrumentContext, location: Union[TrashBin, WasteChute]
) -> command_types.BlowOutInDisposalLocationCommand:
    location_text = stringify_disposal_location(location)
    text = f"Blowing out into {location_text}"

    return {
        "name": command_types.BLOW_OUT_IN_DISPOSAL_LOCATION,
        "payload": {"instrument": instrument, "location": location, "text": text},
    }


def touch_tip(instrument: InstrumentContext) -> command_types.TouchTipCommand:
    text = "Touching tip"

    return {
        "name": command_types.TOUCH_TIP,
        "payload": {"instrument": instrument, "text": text},
    }


def air_gap() -> command_types.AirGapCommand:
    text = "Air gap"
    return {"name": command_types.AIR_GAP, "payload": {"text": text}}


def return_tip() -> command_types.ReturnTipCommand:
    text = "Returning tip"
    return {"name": command_types.RETURN_TIP, "payload": {"text": text}}


def pick_up_tip(
    instrument: InstrumentContext, location: Well
) -> command_types.PickUpTipCommand:
    location_text = stringify_location(location)
    text = f"Picking up tip from {location_text}"
    return {
        "name": command_types.PICK_UP_TIP,
        "payload": {"instrument": instrument, "location": location, "text": text},
    }


def drop_tip(
    instrument: InstrumentContext, location: Well
) -> command_types.DropTipCommand:
    location_text = stringify_location(location)
    text = "Dropping tip into {location}".format(location=location_text)
    return {
        "name": command_types.DROP_TIP,
        "payload": {"instrument": instrument, "location": location, "text": text},
    }


def drop_tip_in_disposal_location(
    instrument: InstrumentContext, location: Union[TrashBin, WasteChute]
) -> command_types.DropTipInDisposalLocationCommand:
    location_text = stringify_disposal_location(location)
    text = f"Dropping tip into {location_text}"
    return {
        "name": command_types.DROP_TIP_IN_DISPOSAL_LOCATION,
        "payload": {"instrument": instrument, "location": location, "text": text},
    }


def move_to(
    instrument: InstrumentContext,
    location: Location,
) -> command_types.MoveToCommand:
    location_text = stringify_location(location)
    text = "Moving to {location}".format(location=location_text)
    return {
        "name": command_types.MOVE_TO,
        "payload": {"instrument": instrument, "location": location, "text": text},
    }


def move_to_disposal_location(
    instrument: InstrumentContext,
    location: Union[TrashBin, WasteChute],
) -> command_types.MoveToDisposalLocationCommand:
    location_text = stringify_disposal_location(location)
    text = f"Moving to {location_text}"
    return {
        "name": command_types.MOVE_TO_DISPOSAL_LOCATION,
        "payload": {"instrument": instrument, "location": location, "text": text},
    }


def seal(
    instrument: InstrumentContext,
    location: Well,
) -> command_types.SealCommand:
    location_text = stringify_location(location)
    text = f"Sealing to {location_text}"
    return {
        "name": command_types.SEAL,
        "payload": {"instrument": instrument, "location": location, "text": text},
    }


def unseal(
    instrument: InstrumentContext,
    location: Well,
) -> command_types.UnsealCommand:
    location_text = stringify_location(location)
    text = f"Unsealing from {location_text}"
    return {
        "name": command_types.UNSEAL,
        "payload": {"instrument": instrument, "location": location, "text": text},
    }


def resin_tip_dispense(
    instrument: InstrumentContext,
    flow_rate: float | None,
) -> command_types.PressurizeCommand:
    if flow_rate is None:
        flow_rate = 10  # The Protocol Engine default for Resin Tip Dispense
    text = f"Pressurize pipette to dispense from resin tip at {flow_rate}uL/s."
    return {
        "name": command_types.PRESSURIZE,
        "payload": {"instrument": instrument, "text": text},
    }
