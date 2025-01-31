"""Setup script."""
# Inspired by:
# https://hynek.me/articles/sharing-your-labor-of-love-pypi-quick-and-dirty/
import sys
import codecs
import os
import os.path
from setuptools import setup, find_packages


HERE = os.path.abspath(os.path.dirname(__file__))
sys.path.append(os.path.join(HERE, "..", "scripts"))

from python_build_utils import normalize_version  # noqa: E402


def get_version() -> str:
    """Get the version."""
    buildno = os.getenv("BUILD_NUMBER")
    project = os.getenv("OPENTRONS_PROJECT", "robot-stack")
    if buildno:
        normalize_opts = {"extra_tag": buildno}
    else:
        normalize_opts = {}
    return normalize_version("hardware", project, **normalize_opts)


VERSION = get_version()

DISTNAME = "opentrons_hardware"
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
DESCRIPTION = "Hardware control for Opentrons Robots."
PACKAGES = find_packages(where=".", exclude=["tests.*", "tests"])
INSTALL_REQUIRES = [
    "pyserial==3.5",
    "pydantic>=2,<3",
    "pydantic-settings>=2,<3",
    f"opentrons_shared_data=={VERSION}",
]

EXTRAS = {
    "FLEX": ["python-can==4.2.2"],
}


def read(*parts: str) -> str:
    """Build an absolute path from parts and return the contents of the resulting file.

    Assume UTF-8 encoding.
    """
    with codecs.open(os.path.join(HERE, *parts), "rb", "utf-8") as f:
        return f.read()


if __name__ == "__main__":
    setup(
        python_requires="~=3.10",
        name=DISTNAME,
        description=DESCRIPTION,
        license=LICENSE,
        url=URL,
        version=VERSION,
        author=AUTHOR,
        author_email=EMAIL,
        maintainer=AUTHOR,
        maintainer_email=EMAIL,
        keywords=KEYWORDS,
        long_description=read("README.md"),
        packages=PACKAGES,
        zip_safe=False,
        classifiers=CLASSIFIERS,
        install_requires=INSTALL_REQUIRES,
        extras_require=EXTRAS,
        include_package_data=True,
        package_data={
            "opentrons_hardware": ["py.typed", "opentrons_hardware.cmakefind"]
        },
        entry_points={
            "console_scripts": [
                "opentrons_update_fw = opentrons_hardware.scripts.update_fw:main",
                "opentrons_can_comm = opentrons_hardware.scripts.can_comm:main",
                "opentrons_can_mon = opentrons_hardware.scripts.can_mon:main",
                "opentrons_sim_can_bus = opentrons_hardware.scripts.sim_socket_can:main",
                "opentrons_can_control = opentrons_hardware.scripts.can_control:main",
            ]
        },
    )
