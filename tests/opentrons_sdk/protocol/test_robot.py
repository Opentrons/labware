import threading
import unittest

from opentrons_sdk.robot.robot import Robot
from opentrons_sdk.containers.placeable import Deck


class RobotTest(unittest.TestCase):
    def setUp(self):
        Robot.reset()
        self.robot = Robot.get_instance()
        self.robot.connect()
        self.robot.home()
        self.robot.clear()

    def test_disconnect(self):
        self.robot.disconnect()
        res = self.robot.is_connected()
        self.assertEquals(bool(res), False)

    def test_get_connected_port(self):
        res = self.robot.get_connected_port()
        self.assertEquals(res, self.robot._driver.VIRTUAL_SMOOTHIE_PORT)

    def test_robot_move_to(self):
        self.robot.move_to((Deck(), (100, 0, 0)))
        self.robot.run()
        position = self.robot._driver.get_head_position()['current']
        self.assertEqual(position, (100, 0, 0))

    def test_move_head(self):
        self.robot.move_head(x=100, y=0, z=20)
        current = self.robot._driver.get_head_position()['current']
        self.assertEquals(current, (100, 0, 20))

    def test_home(self):
        self.robot.clear()
        self.robot.home()
        self.assertEquals(len(self.robot._commands), 1)
        self.robot.run()

        self.robot.clear()
        self.robot.home(now=True)
        self.assertEquals(len(self.robot._commands), 0)

    def test_robot_pause_and_resume(self):
        self.robot.move_to((Deck(), (100, 0, 0)))
        self.robot.move_to((Deck(), (101, 0, 0)))
        self.assertEqual(len(self.robot._commands), 2)

        self.robot.pause()

        def _run():
            self.robot.run()

        thread = threading.Thread(target=_run)
        thread.start()
        self.robot.resume()
        thread.join(0.5)

        self.assertEquals(thread.is_alive(), False)
        self.assertEqual(len(self.robot._commands), 0)

        self.robot.clear()

        self.robot.move_to((Deck(), (100, 0, 0)))
        self.robot.move_to((Deck(), (101, 0, 0)))

        def _run():
            self.robot.run()

        self.robot.pause()

        thread = threading.Thread(target=_run)
        thread.start()
        thread.join(0.01)

        self.assertEquals(thread.is_alive(), True)
        self.assertEqual(len(self.robot._commands) > 0, True)

        self.robot.resume()

        thread.join(1)
        self.assertEqual(len(self.robot._commands), 0)
