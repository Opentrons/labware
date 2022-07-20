"""Gravimetric RnD."""
from opentrons.protocol_api import ProtocolContext

from hardware_testing.opentrons_api.helpers import get_api_context
from hardware_testing.measure.weight import GravimetricRecorder

metadata = {"protocolName": "gravimetric-rnd", "apiLevel": "2.12"}


def _run(protocol: ProtocolContext) -> None:
    recorder = GravimetricRecorder(protocol, test_name=metadata["protocolName"])
    recorder.activate()
    if "y" in input("Calibrate the scale? (y/n): ").lower():
        recorder.calibrate_scale()
    while True:
        recording_name = input("Name of recording: ")
        try:
            recording_duration = float(input("\tDuration (sec): "))
            in_thread = False
        except ValueError:
            recording_duration = 60 * 60  # an hour
            in_thread = True
        input("\tPress ENTER when ready...")
        recorder.set_tag(recording_name)
        recorder.record(duration=recording_duration, in_thread=in_thread)
        if in_thread:
            print('\tRunning in separate thread')
            recorder.record_start()
            input("\tPress ENTER to stop")
            recorder.record_stop()
            recorder.wait_for_finish()
        print("\tdone")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(metadata["protocolName"])
    parser.add_argument("--simulate", action="store_true")
    args = parser.parse_args()
    ctx = get_api_context(api_level=metadata["apiLevel"], is_simulating=args.simulate)
    ctx.home()
    _run(ctx)
