# Development Environment Setup

This guide provides a set of opinionated instructions for setting up your computer to work on the software in Opentrons/opentrons. You can choose to set up your machine in a different way with different tools if you desire, but this setup is tested and recommended.

If you notice a discrepancy between these instructions and any instructions in the documentation of tools we reference below, please [file an issue][] or [open a pull request][]!

## System Setup

You will need the following tools installed to develop on the Opentrons platform.

- make
- git
- curl
- ssh
- Python v3.10
- Node.js v22.11.0

### macOS

On macOS, we rely on:

- [Homebrew][brew] to install general dependencies, like `git`
- [Node Version Switcher][nvs] to install and manage Node.js
- [pyenv][] to install and manage Python

The setup below is compatible with both Intel and ARM (e.g. M1) machines. It assumes you are using the system default shell of `zsh`.

#### 0. Install `brew` and general dependencies

[Homebrew][brew] is a package manager for macOS, and it is useful to install language-agnostic development tools. Installing the `brew` command will also install the [Xcode Command Line tools][], which are required for development on macOS.

1. Go to [https://brew.sh][brew]
2. Copy and run the install script
3. Follow any directions given to you by the install script

At the end of installation, `brew` will print off a set of "next steps" that you need to run. **Make sure you run these steps**, or your installation of `brew` won't work!

```shell
**==>** **Next steps:**
- Run these two commands in your terminal to add Homebrew to your **PATH**:
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> /Users/username/.zprofile
    eval "$(/opt/homebrew/bin/brew shellenv)"
- Run **brew help** to get started
- Further documentation:
    https://docs.brew.sh
```

Once you have run these commands, close and re-open your terminal to confirm that `brew` is properly installed:

```shell
brew --version
```

Once `brew` is installed, you can use it to make sure you have the latest version of `git` installed:

```shell
brew install git
```

If you haven't used `git` before, **be sure to complete [first-time Git setup][]**.

#### 1. Install Node.js

Our recommended installation instructions for Node.js differ between `x86_64` (Intel) and `ARM` (M1) Macs.

##### x86-64 Mac (Intel) & ARM Mac(M1)

On x86, we recommend [nvs][] to install Node.js because it works well and is compatible with macOS, Windows, and Linux.

1. Go to [https://github.com/jasongin/nvs][nvs]
2. Follow the instructions for "Mac, Linux" setup

```shell
export NVS_HOME="$HOME/.nvs"
git clone https://github.com/jasongin/nvs "$NVS_HOME"
. "$NVS_HOME/nvs.sh" install
```

Close and re-open your terminal to confirm `nvs` is installed.

```shell
nvs --version
```

Now we can use `nvs` to install the currently required Node.js version set in `.nvmrc`. The `auto` command selects the correct version of Node.js any time we're in the `opentrons` project directory. Without `auto`, we would have to manually run `use` or `install` each time we work on the project.

```shell
nvs add 22
nvs auto on
```

If the `nvs` command isn't working, confirm that your shell is set up properly. If you print out the contents of `~/.zshrc`, you should see something similar to the following:

```shell
# ~/.zshrc
# ...
export NVS_HOME="$HOME/.nvs"
[ -s "$NVS_HOME/nvs.sh" ] && . "$NVS_HOME/nvs.sh"
# ...
```

#### 2. Install `pyenv` and Python

On macOS, we recommend [pyenv][] to install different versions of Python.

1. Go to [pyenv suggested build environment](https://github.com/pyenv/pyenv/wiki#suggested-build-environment)
2. Follow instructions for your operating system
3. Go to [pyenv](https://github.com/pyenv/pyenv)
4. Follow the instructions for [Basic GitHub Checkout](https://github.com/pyenv/pyenv#basic-github-checkout)
   - **Do not install `pyenv` with `brew`**
   - We've found the GitHub checkout installation to be more reliable, _especially_ on M1/ARM macs

```shell
git clone https://github.com/pyenv/pyenv.git ~/.pyenv
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.zprofile
echo 'export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.zprofile
echo 'eval "$(pyenv init --path)"' >> ~/.zprofile
echo 'eval "$(pyenv init -)"' >> ~/.zshrc
```

Close and re-open your terminal to verify that `pyenv` is installed

```shell
pyenv --version
```

Now, install the required version of Python. Use the latest available version of `3.10.x`, which is `3.10.13` at the time of writing.

```shell
pyenv install 3.10.13
```

If your `pyenv` command isn't working, confirm that your shell is set up properly. If you print out the contents of `~/.zprofile` and `~/.zshrc`, you should see something similar to the following:

```shell
# ~/.zprofile
# ...
export PYENV_ROOT="$HOME/.pyenv"
export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init --path)"
# ...
```

```shell
# ~/.zshrc
# ...
eval "$(pyenv init -)"
# ...
```

#### 3. Install `jpeg` if on ARM Mac (M1/M2/M3)

`/hardware` depends on the Python library Pillow. On ARM Macs, `pip` will build Pillow from source, which requires [jpeg](https://formulae.brew.sh/formula/jpeg) to be installed.

```shell
brew install jpeg-turbo
```

### Windows

**This section is a work in progress**

On Windows, we rely on:

- [scoop][] to install general dependencies and Python
- [Node Version Switcher][nvs] to install and manage Node.js
- [Visual Studio][visual studio] to run electron-rebuild

#### 0. Install `scoop` and general dependencies

#### 1. Install `nvs` and Node.js

#### 2. Install Python

#### 3. Install build tools via Visual Studio Installer

### Linux

**This section is a work in progress**

Linux setup is broadly similar to macOS setup, but it will depend heavily on your exact distribution of Linux and your preferred workflows. For this example, we will assume an Ubuntu variant using Bash. If your setup is different, consult the documentation of your distribution and the tools listed below.

#### 0. Install general dependencies

#### 1. Install `nvs` and Node.js

#### 2. Install `pyenv` and Python

## Repository Setup

Once your system is set up, you're ready to clone the repository and get the development environment set up.

```shell
git clone https://github.com/Opentrons/opentrons.git
cd ./opentrons
```

Once you are inside the repository for the first time, you should do two things:

1. Confirm that `nvs` selected the proper version of Node.js to use
2. Tell `pyenv` to use Python 3.10
3. Run `python --version` to confirm your chosen version. If you get the incorrect version and you're using an Apple silicon Mac, try running `eval "$(pyenv init --path)"` and then `pyenv local 3.10.13`. Then check `python --version` again.

```shell
# confirm Node v22.11.0 or greater
node --version

# set Python version, and confirm
pyenv local 3.10.13
python --version
```

Once you've confirmed you're running the correct versions of Node.js and Python, you must install [yarn][] to manage JavaScript dependencies.

```shell
npm install --global yarn@1
```

If you are using [Corepack][], you can install `yarn` via `corepack`.

```shell
corepack enable
```

Finally, you need to download and install all of our various development dependencies. **This step will take several minutes** the first time you run it!

```shell
make setup
```

Once `make setup` completes, you're ready to start developing! Check out our general [contributing guide][] for more information. If you ever need to remove (or recreate) the steps run in `make setup`, you can use `make teardown` to remove the installed dependencies.

[file an issue]: https://github.com/Opentrons/opentrons/issues
[open a pull request]: https://github.com/Opentrons/opentrons/pulls
[first-time git setup]: https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup
[brew]: https://brew.sh
[xcode command line tools]: https://developer.apple.com/xcode/resources/
[scoop]: https://scoop.sh/
[nvs]: https://github.com/jasongin/nvs
[visual studio]: https://visualstudio.microsoft.com/downloads/
[pyenv]: https://github.com/pyenv/pyenv
[yarn]: https://classic.yarnpkg.com/
[pipenv]: https://github.com/pypa/pipenv
[contributing guide]: ./CONTRIBUTING.md
[corepack]: https://github.com/nodejs/corepack
