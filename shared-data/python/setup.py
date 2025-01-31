import json
import os
import sys

from pathlib import Path
from typing import List

from setuptools.command import build_py, sdist
from setuptools import setup, find_packages

HERE = os.path.abspath(os.path.dirname(__file__))
sys.path.append(os.path.join(HERE, "..", "..", "scripts"))

from python_build_utils import normalize_version  # noqa: E402

# make stdout blocking since Travis sets it to nonblocking
if os.name == "posix":
    import fcntl

    flags = fcntl.fcntl(sys.stdout, fcntl.F_GETFL)
    fcntl.fcntl(sys.stdout, fcntl.F_SETFL, flags & ~os.O_NONBLOCK)

DATA_ROOT = ".."
DATA_SUBDIRS = [
    "deck",
    "labware",
    "module",
    "pipette",
    "protocol",
    "gripper",
    "robot",
    "errors",
    "command",
    "commandAnnotation",
    "liquid",
]
DATA_TYPES = ["definitions", "schemas"]
DEST_BASE_PATH = "data"


def get_shared_data_files() -> List[Path]:
    to_include = []

    for subdir in DATA_SUBDIRS:
        for data_type in DATA_TYPES:
            data_dir = Path(DATA_ROOT) / subdir / data_type
            if data_dir.is_dir():
                to_include.extend(data_dir.glob("**/*.json"))

    return to_include


def _minimize_and_write_json(data_file: Path, target_file: Path) -> None:
    contents = json.dumps(
        json.loads(data_file.read_text(encoding="utf-8")),
        separators=(",", ":"),
    )
    target_file.write_text(contents, encoding="utf-8")


class SDistWithData(sdist.sdist):
    description = sdist.sdist.description + " Also, include data files."

    def make_release_tree(self, base_dir, files) -> None:
        self.announce("adding data files to base dir {}".format(base_dir))

        for data_file in get_shared_data_files():
            sdist_data_dir = Path(base_dir) / "opentrons_shared_data" / DEST_BASE_PATH
            target_file = sdist_data_dir / data_file.relative_to(DATA_ROOT)

            self.mkpath(str(target_file.parent))
            self.execute(
                _minimize_and_write_json,
                args=(data_file, target_file),
                msg=f"copying and minimizing {data_file} -> {target_file}",
            )

        super().make_release_tree(base_dir, files)


class BuildWithData(build_py.build_py):
    description = build_py.build_py.description + " Also, include opentrons data files"

    def _get_data_files(self):
        """
        Override of build_py.get_data_files that includes out of tree configs.
        These are currently hardcoded to include selected folders in
         ../shared-data/, which will move to opentrons/config/shared-data
        """
        files = super()._get_data_files()
        # We don’t really want to duplicate logic used in the original
        # implementation, but we can back out what it did with commonpath -
        # should be something ending in opentrons_shared_data
        build_base = os.path.commonpath([f[2] for f in files])
        # We want a list of paths to only files relative to ../shared-data
        to_include = [str(f.relative_to(DATA_ROOT)) for f in get_shared_data_files()]
        destination = os.path.join(build_base, DEST_BASE_PATH)
        # And finally, tell the system about our files
        files.extend(
            [
                ("opentrons_shared_data", DATA_ROOT, destination, to_include),
            ]
        )
        return files


def get_version():
    buildno = os.getenv("BUILD_NUMBER")
    project = os.getenv("OPENTRONS_PROJECT", "robot-stack")
    git_dir = os.getenv("OPENTRONS_GIT_DIR", None)
    if buildno:
        normalize_opts = {"extra_tag": buildno}
    else:
        normalize_opts = {}
    return normalize_version("shared-data", project, git_dir=git_dir, **normalize_opts)


VERSION = get_version()

DISTNAME = "opentrons_shared_data"
LICENSE = "Apache 2.0"
AUTHOR = "Opentrons"
EMAIL = "engineering@opentrons.com"
URL = "https://github.com/Opentrons/opentrons"
DOWNLOAD_URL = ""
CLASSIFIERS = [
    "Development Status :: 5 - Production/Stable",
    "Environment :: Console",
    "Operating System :: OS Independent",
    "Intended Audience :: Science/Research",
    "Programming Language :: Python",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.10",
    "Topic :: Scientific/Engineering",
]
KEYWORDS = ["robots", "protocols", "synbio", "pcr", "automation", "lab"]
DESCRIPTION = (
    "A bundle of data and python binding that supports the Opentrons API. "
    "Does not need to be installed manually; only a dependency of the "
    "opentrons package"
)
PACKAGES = find_packages(where=".", exclude=["tests", "tests.*"])
INSTALL_REQUIRES = [
    "jsonschema>=4.0.0,<5",
    "typing-extensions>=4.0.0,<5",
    "pydantic>=2.0.0,<3.0.0",
]


if __name__ == "__main__":
    setup(
        python_requires=">=3.10",
        name=DISTNAME,
        description=DESCRIPTION,
        license=LICENSE,
        version=VERSION,
        author=AUTHOR,
        author_email=EMAIL,
        maintainer=AUTHOR,
        maintainer_email=EMAIL,
        keywords=KEYWORDS,
        packages=PACKAGES,
        zip_safe=False,
        classifiers=CLASSIFIERS,
        install_requires=INSTALL_REQUIRES,
        include_package_data=True,
        package_data={"opentrons_shared_data": ["py.typed"]},
        cmdclass={"build_py": BuildWithData, "sdist": SDistWithData},
        project_urls={
            "opentrons.com": "https://www.opentrons.com",
            "Source Code On Github": (
                "https://github.com/Opentrons/opentrons/tree/edge/shared-data"
            ),
            "Documentation": "https://docs.opentrons.com",
        },
    )
