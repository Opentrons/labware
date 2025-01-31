from .types import APIVersion

MAX_SUPPORTED_VERSION = APIVersion(2, 22)
"""The maximum supported protocol API version in this release."""

MIN_SUPPORTED_VERSION = APIVersion(2, 0)
"""The minimum supported protocol API version in this release, across all robot types."""

MIN_SUPPORTED_VERSION_FOR_FLEX = APIVersion(2, 15)
"""The minimum protocol API version supported by the Opentrons Flex.

It's an infrastructural requirement for this to be at least newer than 2.14. Before then,
the protocol API is backed by the legacy non-Protocol-engine backend, which is not prepared to
handle anything but OT-2s.

The additional bump to 2.15 is because that's what we tested on, and because it adds all the
Flex-specific features.
"""
