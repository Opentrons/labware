from opentrons.drivers.flex_stacker.types import StackerAxis


class UpdateError(RuntimeError):
    pass


class AbsorbanceReaderDisconnectedError(RuntimeError):
    def __init__(self, serial: str):
        self.serial = serial


class FlexStackerStallError(RuntimeError):
    def __init__(self, serial: str, axis: StackerAxis):
        self.serial = serial
        self.axis = axis
