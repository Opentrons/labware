"""The names of files and directories in persistent storage.

These are just the trailing name parts, not the full paths. A server launch-time setting
specifies the root persistence directory. And our migration system maintains copies of
these files in isolated versioned subdirectories, e.g. v1/deck_configuration.json,
v2/deck_configuration.json, etc.
"""

from typing import Final

LATEST_VERSION_DIRECTORY: Final = "10"

DECK_CONFIGURATION_FILE: Final = "deck_configuration.json"
PROTOCOLS_DIRECTORY: Final = "protocols"
DATA_FILES_DIRECTORY: Final = "data_files"
DB_FILE: Final = "robot_server.db"
