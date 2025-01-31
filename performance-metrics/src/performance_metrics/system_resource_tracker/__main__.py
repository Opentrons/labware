"""System resource tracker."""

import logging
import time
import systemd.daemon  # type: ignore [import-untyped,import-not-found,unused-ignore]
from .._logging_config import log_init, LOGGER_NAME
from ._config import SystemResourceTrackerConfiguration
from ._system_resource_tracker import SystemResourceTracker


def main() -> None:
    """Main function."""
    config = SystemResourceTrackerConfiguration.from_env()

    log_init(logging._nameToLevel[config.logging_level])
    logger = logging.getLogger(LOGGER_NAME)
    logger.setLevel(config.logging_level)

    logger.info(f"Running with the following configuration: {config}")

    tracker = SystemResourceTracker(config)

    logger.info("Starting system resource tracker...")

    systemd.daemon.notify("READY=1")

    try:
        while True:
            tracker.get_and_store_system_data_snapshots()
            time.sleep(tracker.config.refresh_interval)
    except KeyboardInterrupt:
        logger.info("Manually stopped.")
    except Exception:
        logger.error("Exception occurred: ", exc_info=True)
    finally:
        logger.info("System resource tracker is stopping.")


if __name__ == "__main__":
    main()
