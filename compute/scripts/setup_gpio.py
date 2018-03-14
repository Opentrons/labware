from os import environ
from time import sleep

from opentrons.drivers.rpi_drivers import gpio
from opentrons.drivers.smoothie_drivers import serial_communication
from opentrons import robot

# set the direction of each gpio (in or out)
gpio.initialize()

# audio-enable pin can stay HIGH always, unless there is noise coming
# from the amplifier, then we can set to LOW to disable the amplifier
gpio.set_high(gpio.OUTPUT_PINS['AUDIO_ENABLE'])

# smoothieware programming pins, must be in a known state (HIGH)
gpio.set_high(gpio.OUTPUT_PINS['HALT'])
gpio.set_high(gpio.OUTPUT_PINS['ISP'])
gpio.set_low(gpio.OUTPUT_PINS['RESET'])
sleep(0.25)
gpio.set_high(gpio.OUTPUT_PINS['RESET'])
sleep(0.25)

# smoothieware hasn't finished booting until it responds b'ok\r\nok\r\n'
smoothie_id = environ.get('OT_SMOOTHIE_ID', 'FT232R')
c = serial_communication.connect(
    device_name=smoothie_id,
    baudrate=robot.config.serial_speed
)
serial_communication.write_and_return('\r\n', c, timeout=5)
c.close()

# turn light to blue
robot.turn_on_button_light()
