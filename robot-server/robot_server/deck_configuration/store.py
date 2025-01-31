# noqa: D100

import asyncio
from datetime import datetime
from pathlib import Path
from typing import Optional, TypeAlias

import anyio

from opentrons.calibration_storage import (
    deserialize_deck_configuration,
    serialize_deck_configuration,
)
from opentrons.calibration_storage import types as calibration_storage_types

from opentrons.protocol_engine.types import DeckType

from robot_server.service.notifications import DeckConfigurationPublisher

from . import defaults
from . import models
from opentrons.protocol_engine.types import DeckConfigurationType


# The type used by the lower-level opentrons.calibration_storage API.
_StorableDeckConfiguration: TypeAlias = tuple[
    list[calibration_storage_types.CutoutFixturePlacement], datetime
]


# TODO(mm, 2023-11-17): Add unit tests for DeckConfigurationStore.
class DeckConfigurationStore:  # noqa: D101
    def __init__(
        self,
        deck_type: DeckType,
        path: Path,
        deck_configuration_publisher: DeckConfigurationPublisher,
    ) -> None:
        """A persistent store of the robot's deck configuration.

        Params:
            deck_type: The type of deck that this robot has. This is used to choose the default
                deck configuration.
            path: The path of the deck configuration file. The file itself does not need to exist
                yet, but its containing directory should.
        """
        # It's important that this initializer doesn't do anything that might fail, like reading
        # files. This is a dependency of the POST /settings/reset endpoint, which should always
        # be available.

        self._deck_type = deck_type
        self._path = anyio.Path(path)
        self._deck_configuration_publisher = deck_configuration_publisher

        # opentrons.calibration_storage is not generally safe for concurrent access.
        self._lock = asyncio.Lock()

    async def set(
        self, request: models.DeckConfigurationRequest, last_modified_at: datetime
    ) -> models.DeckConfigurationResponse:
        """Set the robot's current deck configuration.

        You are responsible for validating it against this robot's deck type before passing it in
        to this method.
        """
        storable_deck_configuration = _http_types_to_storage_types(
            request, last_modified_at
        )
        async with self._lock:
            await _write(
                path=self._path, storable_deck_configuration=storable_deck_configuration
            )
            self._deck_configuration_publisher.publish_deck_configuration()

            return await self._get_assuming_locked()

    async def get(self) -> models.DeckConfigurationResponse:
        """Get the robot's current deck configuration."""
        async with self._lock:
            return await self._get_assuming_locked()

    async def get_deck_configuration(self) -> DeckConfigurationType:
        """Get the robot's current deck configuration in an expected typing."""
        to_convert = await self.get()
        converted = [
            (item.cutoutId, item.cutoutFixtureId, item.opentronsModuleSerialNumber)
            for item in to_convert.cutoutFixtures
        ]
        return converted

    async def delete(self) -> None:
        """Delete the robot's current deck configuration, resetting it to the default."""
        async with self._lock:
            await self._path.unlink(missing_ok=True)
            self._deck_configuration_publisher.publish_deck_configuration()

    async def _get_assuming_locked(self) -> models.DeckConfigurationResponse:
        from_storage = await _read(self._path)
        if from_storage is None:
            # The file was missing or corrupt.
            # We handle both cases the same way: return the default deck configuration.
            # If there was a corrupt file error, we paper it over. This is intended to keep the
            # Opentrons App usable, since it can't always account for critical endpoints returning
            # 5XX errors. We think falling back to an arbitrary default is safe because users
            # of the Opentrons App will always have an opportunity to view and confirm their robot's
            # deck configuration before running a protocol.
            return _get_default(self._deck_type)
        else:
            return _storage_types_to_http_types(from_storage)


async def get_for_cli(deck_type: DeckType, path: Path) -> bytes:
    """Get the robot's current deck configuration.

    This is a hack to support `opentrons.deck_configuration.cli`. This is supposed to
    act like `DeckConfigurationStore.get()`, but with two differences:

    1. You can call this without dealing with the notification system
       (`DeckConfigurationPublisher`).
    2. The return type is different. Whereas `DeckConfigurationStore.get()` returns
       a JSON document to expose over HTTP, this returns the data in the on-disk format
       defined by `opentrons.calibration_storage`.

    This is unsafe to call while there is an active `DeckConfigurationStore`, and
    should only be called by `opentrons.deck_configuration.cli`.
    """
    # This read bypasses the store's normal locking and is therefore unsafe in the face
    # of concurrent access. That's "okay" because the CLI should't run at the same
    # time as the server anyway.
    from_storage = await _read(anyio.Path(path))
    if from_storage is not None:
        return serialize_deck_configuration(from_storage[0], from_storage[1])
    else:
        default_as_http_response = _get_default(deck_type)
        default_as_http_request = models.DeckConfigurationRequest.model_construct(
            cutoutFixtures=default_as_http_response.cutoutFixtures
        )
        storable_default = _http_types_to_storage_types(
            default_as_http_request,
            # This timestamp is arbitrary. The CLI's caller does not care about it.
            datetime.fromtimestamp(0),
        )
        return serialize_deck_configuration(storable_default[0], storable_default[1])


def _http_types_to_storage_types(
    http_val: models.DeckConfigurationRequest, last_modified_at: datetime
) -> _StorableDeckConfiguration:
    storage_cutout_fixture_placements = [
        calibration_storage_types.CutoutFixturePlacement(
            cutout_fixture_id=http_element.cutoutFixtureId,
            cutout_id=http_element.cutoutId,
            opentrons_module_serial_number=http_element.opentronsModuleSerialNumber,
        )
        for http_element in http_val.cutoutFixtures
    ]
    return storage_cutout_fixture_placements, last_modified_at


def _storage_types_to_http_types(
    storage_val: _StorableDeckConfiguration,
) -> models.DeckConfigurationResponse:
    storage_cutout_fixtures, last_modified_at = storage_val
    http_cutout_fixtures = [
        models.CutoutFixture.model_construct(
            cutoutFixtureId=storage_element.cutout_fixture_id,
            cutoutId=storage_element.cutout_id,
            opentronsModuleSerialNumber=storage_element.opentrons_module_serial_number,
        )
        for storage_element in storage_cutout_fixtures
    ]
    return models.DeckConfigurationResponse.model_construct(
        cutoutFixtures=http_cutout_fixtures,
        lastModifiedAt=last_modified_at,
    )


def _get_default(deck_type: DeckType) -> models.DeckConfigurationResponse:
    return models.DeckConfigurationResponse.model_construct(
        cutoutFixtures=defaults.for_deck_definition(deck_type.value).cutoutFixtures,
        lastModifiedAt=None,
    )


async def _read(
    path: anyio.Path,
) -> Optional[_StorableDeckConfiguration]:
    """Read the deck configuration from the filesystem.

    Return `None` if the file is missing or corrupt.
    """
    try:
        serialized = await path.read_bytes()
    except FileNotFoundError:
        deserialized = None
    else:
        deserialized = deserialize_deck_configuration(serialized)
    return deserialized


async def _write(
    path: anyio.Path,
    storable_deck_configuration: _StorableDeckConfiguration,
) -> None:
    cutout_fixture_placements, last_modified_at = storable_deck_configuration
    await path.write_bytes(
        serialize_deck_configuration(cutout_fixture_placements, last_modified_at)
    )
