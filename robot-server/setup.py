# Inspired by:
# https://hynek.me/articles/sharing-your-labor-of-love-pypi-quick-and-dirty/
import sys
import codecs
import os
import os.path
from setuptools import setup, find_packages

# make stdout blocking since Travis sets it to nonblocking
if os.name == "posix":
    import fcntl

    flags = fcntl.fcntl(sys.stdout, fcntl.F_GETFL)
    fcntl.fcntl(sys.stdout, fcntl.F_SETFL, flags & ~os.O_NONBLOCK)

HERE = os.path.abspath(os.path.dirname(__file__))
sys.path.append(os.path.join(HERE, "..", "scripts"))

from python_build_utils import normalize_version  # noqa: E402


def get_version():
    buildno = os.getenv("BUILD_NUMBER")
    project = os.getenv("OPENTRONS_PROJECT", "robot-stack")
    git_dir = os.getenv("OPENTRONS_GIT_DIR", None)
    if buildno:
        normalize_opts = {"extra_tag": buildno}
    else:
        normalize_opts = {}
    return normalize_version("robot-server", project, git_dir=git_dir, **normalize_opts)


VERSION = get_version()

DISTNAME = "robot_server"
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
DESCRIPTION = "A server providing access to the Opentrons API"
PACKAGES = find_packages(where=".", exclude=["tests.*", "tests"])
INSTALL_REQUIRES = [
    f"opentrons=={VERSION}",
    f"opentrons-shared-data=={VERSION}",
    f"server-utils=={VERSION}",
    "anyio==3.7.1",
    "fastapi==0.100.0",
    "python-dotenv==1.0.1",
    "python-multipart==0.0.6",
    "pydantic==2.9.0",
    "pydantic-settings==2.4.0",
    "typing-extensions>=4.0.0,<5",
    "uvicorn==0.27.0.post1",
    "wsproto==1.2.0",
    "systemd-python==234; sys_platform=='linux'",
    "sqlalchemy==1.4.51",
    "paho-mqtt==1.6.1",
]


def read(*parts):
    """
    Build an absolute path from *parts* and and return the contents of the
    resulting file.  Assume UTF-8 encoding.
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
        long_description=__doc__,
        packages=PACKAGES,
        zip_safe=False,
        classifiers=CLASSIFIERS,
        install_requires=INSTALL_REQUIRES,
        include_package_data=True,
    )
