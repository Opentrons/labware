import unittest

from opentrons.robot import Robot
from opentrons import containers, instruments
from opentrons.util.vector import Vector


class CrudCalibrationsTestCase(unittest.TestCase):

    def setUp(self):
        Robot.reset_for_tests()
        self.robot = Robot.get_instance()
        self.robot.connect()
        self.plate = containers.load('96-flat', 'A1', 'plate')
        self.p200 = instruments.Pipette(name="p200", axis="b")

        well = self.plate[0]
        pos = well.from_center(x=0, y=0, z=0, reference=self.plate)
        self.location = (self.plate, pos)

        well_deck_coordinates = well.center(well.get_deck())
        dest = well_deck_coordinates + Vector(1, 2, 3)

        self.robot.move_head(x=dest['x'], y=dest['y'], z=dest['z'])

    def test_save_load_calibration_data(self):

        self.p200.calibrate_position(self.location)

        self.p200 = instruments.Pipette(name="p200-diff", axis="b")
        self.assertDictEqual(self.p200.calibration_data, {})

        self.p200 = instruments.Pipette(name="p200", axis="a")
        self.assertDictEqual(self.p200.calibration_data, {})

        self.p200 = instruments.Pipette(name="p200", axis="b")

        expected_delta = {
            'delta': (1.0, 2.0, 3.0)
        }

        self.assertTrue('A1' in self.p200.calibration_data)
        actual = self.p200.calibration_data['A1']['children']
        self.assertTrue('plate' in actual)
        actual = self.p200.calibration_data['A1']['children']['plate']
        self.assertEquals(expected_delta, actual)

    def test_delte_calibrations_data(self):

        self.p200 = instruments.Pipette(name="p200", axis="b")

        expected_delta = {
            'delta': (1.0, 2.0, 3.0)
        }

        self.assertTrue('A1' in self.p200.calibration_data)
        actual = self.p200.calibration_data['A1']['children']
        self.assertTrue('plate' in actual)
        actual = self.p200.calibration_data['A1']['children']['plate']
        self.assertEquals(expected_delta, actual)

        self.p200.delete_calibration_data()
        self.assertDictEqual(self.p200.calibration_data, {})

        self.p200 = instruments.Pipette(name="p200", axis="b")
        self.assertDictEqual(self.p200.calibration_data, {})
        self.assertDictEqual(self.p200.positions, {
            'top': None, 'bottom': None, 'blow_out': None, 'drop_tip': None
        })
