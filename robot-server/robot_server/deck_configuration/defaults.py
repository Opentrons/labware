"""Default deck configurations.

When a user has not yet said which fixtures (standard slots, expansion slots, etc.) are on
a robot, the robot will fall back to these.

Protocol analysis should *not* use these. It's supposed to determine the protocol's deck
configuration requirements, instead of assuming some default deck configuration.
"""


from opentrons_shared_data.robot.dev_types import RobotTypeEnum
from . import models


_for_flex = models.DeckConfigurationRequest.construct(
    cutoutFixtures=[
        models.CutoutFixture.construct(
            cutoutId="cutoutA1", cutoutFixtureId="singleLeftSlot"
        ),
        models.CutoutFixture.construct(
            cutoutId="cutoutB1", cutoutFixtureId="singleLeftSlot"
        ),
        models.CutoutFixture.construct(
            cutoutId="cutoutC1", cutoutFixtureId="singleLeftSlot"
        ),
        models.CutoutFixture.construct(
            cutoutId="cutoutD1", cutoutFixtureId="singleLeftSlot"
        ),
        models.CutoutFixture.construct(
            cutoutId="cutoutA2", cutoutFixtureId="singleCenterSlot"
        ),
        models.CutoutFixture.construct(
            cutoutId="cutoutB2", cutoutFixtureId="singleCenterSlot"
        ),
        models.CutoutFixture.construct(
            cutoutId="cutoutC2", cutoutFixtureId="singleCenterSlot"
        ),
        models.CutoutFixture.construct(
            cutoutId="cutoutD2", cutoutFixtureId="singleCenterSlot"
        ),
        models.CutoutFixture.construct(
            cutoutId="cutoutA3", cutoutFixtureId="trashBinAdapter"
        ),
        models.CutoutFixture.construct(
            cutoutId="cutoutB3", cutoutFixtureId="singleRightSlot"
        ),
        models.CutoutFixture.construct(
            cutoutId="cutoutC3", cutoutFixtureId="singleRightSlot"
        ),
        models.CutoutFixture.construct(
            cutoutId="cutoutD3", cutoutFixtureId="singleRightSlot"
        ),
    ]
)


_for_ot2 = models.DeckConfigurationRequest.construct(cutoutFixtures=[])


def for_deck_definition(deck_definition_name: str) -> models.DeckConfigurationRequest:
    try:
        return {
            "ot2_standard": _for_ot2,
            "ot2_short_trash": _for_ot2,
            "ot3_standard": _for_flex,
        }[deck_definition_name]
    except KeyError as exception:
        # This shouldn't happen. Every deck definition that a robot might have should have a
        # default configuration.
        raise ValueError(
            f"The deck {deck_definition_name} has no default configuration."
        ) from exception
