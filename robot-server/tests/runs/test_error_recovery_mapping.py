"""Unit tests for `error_recovery_mapping`."""
import pytest
from decoy import Decoy

from opentrons_shared_data.robot.types import RobotType

from opentrons.protocol_engine.commands.pipetting_common import LiquidNotFoundError
from opentrons.protocol_engine.commands.command import (
    DefinedErrorData,
)
from opentrons.protocol_engine.commands.command_unions import CommandDefinedErrorData
from opentrons.protocol_engine.commands.liquid_probe import LiquidProbe
from opentrons.protocol_engine.error_recovery_policy import ErrorRecoveryType
from opentrons.protocol_engine.state.config import Config
from opentrons.protocol_engine.types import DeckType

from robot_server.runs.error_recovery_mapping import (
    create_error_recovery_policy_from_rules,
)
from robot_server.runs.error_recovery_models import (
    ErrorRecoveryRule,
    MatchCriteria,
    CommandMatcher,
    ErrorMatcher,
    ReactionIfMatch,
)


@pytest.fixture
def mock_command(decoy: Decoy) -> LiquidProbe:
    """Get a mock PickUpTip command."""
    mock = decoy.mock(cls=LiquidProbe)
    decoy.when(mock.commandType).then_return("liquidProbe")
    return mock


@pytest.fixture
def mock_error_data(decoy: Decoy) -> CommandDefinedErrorData:
    """Get a mock TipPhysicallyMissingError."""
    mock = decoy.mock(cls=DefinedErrorData[LiquidNotFoundError])
    mock_lnfe = decoy.mock(cls=LiquidNotFoundError)
    decoy.when(mock.public).then_return(mock_lnfe)
    decoy.when(mock_lnfe.errorType).then_return("liquidNotFound")
    return mock


@pytest.fixture
def mock_criteria(decoy: Decoy) -> MatchCriteria:
    """Get a mock Match Criteria."""
    mock = decoy.mock(cls=MatchCriteria)
    mock_command = decoy.mock(cls=CommandMatcher)
    decoy.when(mock_command.commandType).then_return("liquidProbe")
    mock_error_matcher = decoy.mock(cls=ErrorMatcher)
    decoy.when(mock_error_matcher.errorType).then_return("liquidNotFound")
    decoy.when(mock.command).then_return(mock_command)
    decoy.when(mock_command.error).then_return(mock_error_matcher)
    return mock


@pytest.fixture
def mock_rule(decoy: Decoy, mock_criteria: MatchCriteria) -> ErrorRecoveryRule:
    """Get a mock ErrorRecoveryRule."""
    mock = decoy.mock(cls=ErrorRecoveryRule)
    decoy.when(mock.ifMatch).then_return(ReactionIfMatch.IGNORE_AND_CONTINUE)
    decoy.when(mock.matchCriteria).then_return(mock_criteria)
    return mock


def test_create_error_recovery_policy_with_rules(
    decoy: Decoy,
    mock_command: LiquidProbe,
    mock_error_data: CommandDefinedErrorData,
    mock_rule: ErrorRecoveryRule,
) -> None:
    """Should return CONTINUE_WITH_ERROR if we specified IGNORE_AND_CONTINUE as the rule."""
    policy = create_error_recovery_policy_from_rules([mock_rule], enabled=True)
    example_config = Config(
        robot_type="OT-3 Standard",
        deck_type=DeckType.OT3_STANDARD,
    )
    assert (
        policy(example_config, mock_command, mock_error_data)
        == ErrorRecoveryType.CONTINUE_WITH_ERROR
    )


def test_create_error_recovery_policy_undefined_error(
    decoy: Decoy, mock_command: LiquidProbe
) -> None:
    """Should return a FAIL_RUN policy when error is not defined."""
    policy = create_error_recovery_policy_from_rules(rules=[], enabled=True)
    example_config = Config(
        robot_type="OT-3 Standard",
        deck_type=DeckType.OT3_STANDARD,
    )

    assert policy(example_config, mock_command, None) == ErrorRecoveryType.FAIL_RUN


def test_create_error_recovery_policy_defined_error(
    decoy: Decoy, mock_command: LiquidProbe, mock_error_data: CommandDefinedErrorData
) -> None:
    """Should return a WAIT_FOR_RECOVERY policy when error is defined."""
    policy = create_error_recovery_policy_from_rules(rules=[], enabled=True)
    example_config = Config(
        robot_type="OT-3 Standard",
        deck_type=DeckType.OT3_STANDARD,
    )

    assert (
        policy(example_config, mock_command, mock_error_data)
        == ErrorRecoveryType.WAIT_FOR_RECOVERY
    )


@pytest.mark.parametrize("enabled", [True, False])
def test_enabled_boolean(enabled: bool) -> None:
    """enabled=False should override any rules and always fail the run."""
    command = LiquidProbe.model_construct()  # type: ignore[call-arg]
    error_data = DefinedErrorData[LiquidNotFoundError](
        public=LiquidNotFoundError.model_construct()  # type: ignore[call-arg]
    )

    rules = [
        ErrorRecoveryRule(
            matchCriteria=MatchCriteria(
                command=CommandMatcher(
                    commandType=command.commandType,
                    error=ErrorMatcher(errorType=error_data.public.errorType),
                ),
            ),
            ifMatch=ReactionIfMatch.IGNORE_AND_CONTINUE,
        )
    ]

    example_config = Config(
        robot_type="OT-3 Standard",
        deck_type=DeckType.OT3_STANDARD,
    )

    policy = create_error_recovery_policy_from_rules(rules, enabled)
    result = policy(example_config, command, error_data)
    expected_result = (
        ErrorRecoveryType.CONTINUE_WITH_ERROR if enabled else ErrorRecoveryType.FAIL_RUN
    )
    assert result == expected_result


@pytest.mark.parametrize(
    (
        "robot_type",
        "expect_error_recovery_to_be_enabled",
    ),
    [
        ("OT-2 Standard", False),
        ("OT-3 Standard", True),
    ],
)
def test_enabled_on_flex_disabled_on_ot2(
    robot_type: RobotType, expect_error_recovery_to_be_enabled: bool
) -> None:
    """On OT-2s, the run should always fail regardless of any input rules."""
    command = LiquidProbe.model_construct()  # type: ignore[call-arg]
    error_data = DefinedErrorData[LiquidNotFoundError](
        public=LiquidNotFoundError.model_construct()  # type: ignore[call-arg]
    )

    rules = [
        ErrorRecoveryRule(
            matchCriteria=MatchCriteria(
                command=CommandMatcher(
                    commandType=command.commandType,
                    error=ErrorMatcher(errorType=error_data.public.errorType),
                ),
            ),
            ifMatch=ReactionIfMatch.IGNORE_AND_CONTINUE,
        )
    ]

    example_config = Config(
        robot_type=robot_type,
        # This is a "wrong" deck_type that doesn't necessarily match robot_type
        # but that shouldn't matter for our purposes.
        deck_type=DeckType.OT3_STANDARD,
    )

    policy = create_error_recovery_policy_from_rules(rules, enabled=True)
    result = policy(example_config, command, error_data)
    expected_result = (
        ErrorRecoveryType.CONTINUE_WITH_ERROR
        if expect_error_recovery_to_be_enabled
        else ErrorRecoveryType.FAIL_RUN
    )
    assert result == expected_result
