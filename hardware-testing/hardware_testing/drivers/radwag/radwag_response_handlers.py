from .radwag_commands import RadwagCommand, RADWAG_COMMAND_TERMINATOR

from enum import Enum
from dataclasses import dataclass
from typing import Optional, List


class RadwagResponseCodes(str, Enum):
    NONE = ''
    IN_PROGRESS = 'A'
    CARRIED_OUT_AFTER_IN_PROGRESS = 'D'
    CARRIED_OUT = 'OK'
    UNABLE_TO_EXECUTE = 'I'
    MAX_THRESHOLD_EXCEEDED = '^'
    MIN_THRESHOLD_EXCEEDED = 'v'
    COMMAND_NOT_RECOGNIZED = 'ES'
    STABLE_TIME_LIMIT_EXCEEDED = 'E'

    @classmethod
    def parse(cls, response: str) -> "RadwagResponseCodes":
        if response == cls.IN_PROGRESS:
            return cls.IN_PROGRESS
        elif response == cls.CARRIED_OUT_AFTER_IN_PROGRESS:
            return cls.CARRIED_OUT_AFTER_IN_PROGRESS
        elif response == cls.CARRIED_OUT:
            return cls.CARRIED_OUT
        elif response == cls.UNABLE_TO_EXECUTE:
            return cls.UNABLE_TO_EXECUTE
        elif response == cls.MAX_THRESHOLD_EXCEEDED:
            return cls.MAX_THRESHOLD_EXCEEDED
        elif response == cls.MIN_THRESHOLD_EXCEEDED:
            return cls.MIN_THRESHOLD_EXCEEDED
        elif response == cls.COMMAND_NOT_RECOGNIZED:
            return cls.COMMAND_NOT_RECOGNIZED
        elif response == cls.STABLE_TIME_LIMIT_EXCEEDED:
            return cls.STABLE_TIME_LIMIT_EXCEEDED
        else:
            return cls.NONE


@dataclass
class RadwageResponse:
    code: RadwagResponseCodes
    command: RadwagCommand
    stable: bool
    measurement: Optional[float] = None
    message: Optional[str] = None

    @classmethod
    def build(cls, command: RadwagCommand):
        return RadwageResponse(code=RadwagResponseCodes.NONE,
                               command=command,
                               stable=False,
                               measurement=None,
                               message=None)


def _default_handler(command: RadwagCommand, response_list: List[str]) -> RadwageResponse:
    data = RadwageResponse.build(command)
    if len(response_list) == 2:
        data.code = RadwagResponseCodes.parse(response_list[1])
    else:
        raise ValueError(f'Unexpected response or no handler for '
                         f'command \"{command}\": response={response_list}')
    return data


def _on_unstable_measurement(command: RadwagCommand, response_list: List[str]) -> RadwageResponse:
    data = RadwageResponse.build(command)
    # SI ? -  0.00020 g
    # TODO: we could accept more unit types if we wanted...
    assert response_list[-1] == 'g', \
        f'Expected units to be grams (\"g\"), ' \
        f'instead got \"{response_list[-1]}\"'
    data.stable = ('?' not in response_list)
    data.measurement = float(response_list[-2])
    if '-' in response_list:
        data.measurement *= -1
    return data


def _on_serial_number(command: RadwagCommand, response_list: List[str]) -> RadwageResponse:
    data = RadwageResponse.build(command)
    data.code = RadwagResponseCodes.parse(response_list[1])
    assert len(response_list) == 3
    data.message = response_list[-1].replace('\"', '')
    return data


HANDLERS = {
    RadwagCommand.GET_MEASUREMENT_BASIC_UNIT: _on_unstable_measurement,
    RadwagCommand.GET_MEASUREMENT_CURRENT_UNIT: _on_unstable_measurement,
    RadwagCommand.GET_SERIAL_NUMBER: _on_serial_number,
}


def radwag_response_parse(response: str, command: RadwagCommand) -> RadwageResponse:
    assert RADWAG_COMMAND_TERMINATOR in response, f'CR LF not found ' \
                                                  f'in response: {response}'
    assert ' ' in response, f'No space (\" \") found in response: {response}'
    cmd_not_rec = RadwagResponseCodes.COMMAND_NOT_RECOGNIZED
    if cmd_not_rec in response and response.index(cmd_not_rec) == 0:
        raise RuntimeError(
            'Command not recognized: {command} (response={response})')
    res_list = [d for d in response.strip().split(' ') if d]
    assert res_list[0] == command, f'Unexpected response from scale: {response}'
    if command in HANDLERS.keys():
        return HANDLERS[command](command, res_list)
    else:
        return _default_handler(command, res_list)
