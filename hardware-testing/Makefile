# makefile

include ../scripts/push.mk
include ../scripts/python.mk

SHX := npx shx

ot_project := $(OPENTRONS_PROJECT)
project_rs_default = $(if $(ot_project),$(ot_project),robot-stack)
project_ir_default = $(if $(ot_project),$(ot_project),ot3)

package_name = hardware_testing
package_version = $(call python_package_version,hardware-testing,$(project_rs_default))
wheel_file = dist/$(call python_get_wheelname,hardware-testing,$(project_rs_default),$(package_name),$(BUILD_NUMBER))
sdist_file = dist/$(call python_get_sdistname,hardware-testing,$(project_rs_default),$(package_name))
usb_file =   dist/$(package_name)-usb-$(package_version).tar.gz
# Find the branch, sha, version that will be used to update the VERSION.json file
version_file = $(call python_get_git_version,hardware-testing,$(project_rs_default),hardware-testing)

# These variables can be overriden when make is invoked to customize the
# behavior of pytest. For instance,
# make test tests=tests/opentrons/tools/test_pipette_memory.py would run only the
# specified test
tests ?= tests
cov_opts ?= --cov=hardware_testing --cov-report term-missing:skip-covered --cov-report xml:coverage.xml
test_opts ?=

# Host key location for robot
ssh_key ?= $(default_ssh_key)
# Other SSH args for robot
ssh_opts ?= $(default_ssh_opts)
# Helper to safely bundle ssh options
ssh_helper = $(if $(ssh_key),-i $(ssh_key)) $(ssh_opts)
ssh_helper_ot3 = $(ssh_helper) -o HostkeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa

# Source discovery
# For the python sources
ot_py_sources := $(filter %.py,$(shell $(SHX) find hardware_testing/))
ot_sources := $(ot_py_sources)

# usb package options
usb_dir ?=

# Defined separately than the clean target so the wheel file doesn’t have to
# depend on a PHONY target
clean_cmd = $(SHX) rm -rf build dist .coverage coverage.xml '*.egg-info' '**/__pycache__' '**/*.pyc' '**/.mypy_cache'

.PHONY: all
all: clean sdist wheel

.PHONY: setup
setup:
	$(pipenv) sync $(pipenv_opts)
	$(pipenv) run pip freeze

.PHONY: teardown
teardown:
	$(pipenv) --rm

.PHONY: clean
clean:
	$(clean_cmd)

.PHONY: wheel
wheel: export OPENTRONS_PROJECT=$(project_rs_default)
wheel:
	rm -rf dist/*.whl
	$(python) setup.py $(wheel_opts) bdist_wheel
	$(SHX) rm -rf build
	$(SHX) ls dist

.PHONY: sdist
sdist: export OPENTRONS_PROJECT=$(project_rs_default)
sdist:
	$(clean_cmd)
	$(python) setup.py sdist
	$(SHX) rm -rf build
	$(SHX) ls dist

.PHONY: test
test:
	$(pytest) $(tests) $(test_opts)

.PHONY: test-cov
test-cov:
	$(pytest) $(tests) $(test_opts) $(cov_opts)

.PHONY: test-photometric-single
test-photometric-single:
	$(python) -m hardware_testing.gravimetric --photometric --simulate --pipette 50 --channels 1 --tip 50
	$(python) -m hardware_testing.gravimetric --photometric --simulate --pipette 50 --channels 1 --tip 50 --photoplate-col-offset 3
	$(python) -m hardware_testing.gravimetric --photometric --simulate --pipette 50 --channels 1 --tip 50 --dye-well-col-offset 3

.PHONY: test-photometric-multi
test-photometric-multi:
	$(python) -m hardware_testing.gravimetric --photometric --simulate --pipette 50 --channels 8 --tip 50

.PHONY: test-photometric
test-photometric:
	$(python) -m hardware_testing.gravimetric --photometric --simulate --pipette 1000 --channels 96 --tip 50 --trials 1
	$(python) -m hardware_testing.gravimetric --photometric --simulate --pipette 1000 --channels 96 --tip 200 --trials 1
	$(python) -m hardware_testing.gravimetric --photometric --simulate --pipette 200 --channels 96 --tip 50 --trials 1

.PHONY: test-gravimetric-single
test-gravimetric-single:
	$(python) -m hardware_testing.gravimetric --simulate --pipette 1000 --channels 1
	$(python) -m hardware_testing.gravimetric --simulate --pipette 1000 --channels 1 --extra --no-blank --trials 1
	$(python) -m hardware_testing.gravimetric --simulate --pipette 50 --channels 1 --no-blank --trials 1
	$(python) -m hardware_testing.gravimetric --simulate --pipette 50 --channels 1 --no-blank --trials 1 --increment --tip 50
	$(python) -m hardware_testing.gravimetric --simulate --pipette 1000 --channels 1 --trials 1 --increment --no-blank --tip 50
	$(python) -m hardware_testing.gravimetric --simulate --pipette 1000 --channels 1 --trials 1 --increment --no-blank --tip 200
	$(python) -m hardware_testing.gravimetric --simulate --pipette 1000 --channels 1 --trials 1 --increment --no-blank --tip 1000

.PHONY: test-gravimetric-multi
test-gravimetric-multi:
	$(python) -m hardware_testing.gravimetric --simulate --pipette 50 --channels 8 --trials 1
	$(python) -m hardware_testing.gravimetric --simulate --pipette 50 --channels 8 --trials 1 --no-blank --extra
	$(python) -m hardware_testing.gravimetric --simulate --pipette 50 --channels 8 --tip 50 --trials 1 --increment --no-blank
	$(python) -m hardware_testing.gravimetric --simulate --pipette 1000 --channels 8 --no-blank --trials 1
	$(python) -m hardware_testing.gravimetric --simulate --pipette 1000 --channels 8 --trials 1 --extra --no-blank

.PHONY: test-gravimetric-96
test-gravimetric-96:
	$(python) -m hardware_testing.gravimetric --simulate --pipette 1000 --channels 96 --trials 2 --no-blank
	$(python) -m hardware_testing.gravimetric --simulate --pipette 200 --channels 96 --trials 2 --no-blank

.PHONY: test-gravimetric
test-gravimetric:
	$(python) -m hardware_testing.gravimetric.daily_setup --simulate
	$(python) -m hardware_testing.gravimetric.daily_setup --simulate --calibrate
	$(MAKE) test-gravimetric-single
	$(MAKE) test-gravimetric-multi
	$(MAKE) test-gravimetric-96
	$(MAKE) test-photometric

.PHONY: test-production-qc
test-production-qc:
	$(python) -m hardware_testing.production_qc.pipette_current_speed_qc_ot3 --simulate
	$(python) -m hardware_testing.production_qc.pipette_assembly_qc_ot3 --operator test --simulate
	$(python) -m hardware_testing.production_qc.robot_assembly_qc_ot3 --simulate
	$(python) -m hardware_testing.production_qc.gripper_assembly_qc_ot3 --simulate
	$(python) -m hardware_testing.production_qc.ninety_six_assembly_qc_ot3 --simulate
	$(python) -m hardware_testing.production_qc.ninety_six_assembly_qc_ot3 --simulate --pipette 200
	$(python) -m hardware_testing.production_qc.stress_test_qc_ot3 --simulate
	$(python) -m hardware_testing.production_qc.firmware_check --simulate
	$(python) -m hardware_testing.production_qc.belt_calibration_ot3 --simulate
	$(python) -m hardware_testing.production_qc.z_stage_qc_ot3 --simulate

.PHONY: test-examples
test-examples:
	$(python) -m hardware_testing.examples.csv_report
	$(python) -m hardware_testing.examples.custom_axis_settings_ot3 --simulate
	$(python) -m hardware_testing.examples.pick_up_tip_ot3 --simulate
	$(python) -m hardware_testing.examples.plunger_ot3 --simulate
	$(python) -m hardware_testing.examples.capacitive_probe_ot3 --simulate

.PHONY: test-scripts
test-scripts:
	$(python) -m hardware_testing.scripts.bowtie_ot3 --simulate

.PHONY: test-liquid-sense
test-liquid-sense:
	$(python) -m hardware_testing.liquid_sense --simulate --pipette 1000 --channels 1
	$(python) -m hardware_testing.liquid_sense --simulate --pipette 50 --channels 1

.PHONY: test-integration
test-integration: test-production-qc test-examples test-scripts test-gravimetric

.PHONY: test-stacker
test-stacker:
	$(python) -m hardware_testing.modules.flex_stacker_evt_qc --simulate

.PHONY: lint
lint:
	$(python) -m mypy hardware_testing tests
	$(python) -m black --check hardware_testing tests setup.py
	$(python) -m flake8 hardware_testing tests setup.py

.PHONY: format
format:
	$(python) -m black hardware_testing tests setup.py

define move-plot-webpage-ot3
ssh $(ssh_helper_ot3) root@$(1) \
"function cleanup () { mount -o remount,ro / ; } ;\
mount -o remount,rw / &&\
mv /data/plot/index.html /opt/opentrons-robot-server/hardware_testing/tools/plot &&\
mv /data/plot/index.js /opt/opentrons-robot-server/hardware_testing/tools/plot &&\
mv /data/plot/plotly-2.12.1.min.js /opt/opentrons-robot-server/hardware_testing/tools/plot &&\
mv /data/plot/favicon.png /opt/opentrons-robot-server/hardware_testing/tools/plot &&\
rm -rf /data/plot &&\
cleanup || cleanup"
endef

.PHONY: push-plot-webpage-ot3
push-plot-webpage-ot3:
	scp $(ssh_helper_ot3) -r hardware_testing/tools/plot root@$(host):/data
	$(call move-plot-webpage-ot3,$(host),$(ssh_key),$(ssh_opts))

.PHONY: push-description-ot3
push-description-ot3:
	$(python) -c "from hardware_testing.data import create_git_description_file; create_git_description_file()"
	scp $(ssh_helper_ot3) ./.hardware-testing-description root@$(host):/data/

.PHONY: push-labware-ot3
push-labware-ot3:
	ssh $(ssh_helper_ot3) root@$(host) "mkdir -p /data/labware/v2/custom_definitions/custom_beta"
	scp $(ssh_helper_ot3) -r hardware_testing/labware/* root@$(host):/data/labware/v2/custom_definitions/custom_beta/

.PHONY: restart
restart:
	$(call restart-service,$(host),$(ssh_key),$(ssh_opts),"opentrons-robot-server")

.PHONY: push-no-restart
push-no-restart: wheel
	$(call push-python-package,$(host),$(ssh_key),$(ssh_opts),$(wheel_file))

.PHONY: push
push: push-no-restart restart

.PHONY: restart-ot3
restart-ot3:
	$(call restart-service,$(host),$(ssh_key),$(ssh_opts),"opentrons-robot-server")

.PHONY: push-no-restart-ot3
push-no-restart-ot3: sdist Pipfile.lock
	$(call push-python-sdist,$(host),$(ssh_key),$(ssh_opts),$(sdist_file),/opt/opentrons-robot-server,"hardware_testing",,,$(version_file))

.PHONY: push-ot3
push-ot3: push-no-restart-ot3 push-plot-webpage-ot3 push-description-ot3 push-labware-ot3

.PHONY: push-all
push-all: clean wheel push-no-restart push-plot-webpage-ot3

.PHONY: term
term:
	ssh $(ssh_helper_ot3) root@$(host)

.PHONY: list-ports
list-ports:
	$(python) -m serial.tools.list_ports

.PHONY: miniterm
miniterm:
	$(python) -m serial.tools.miniterm $(port) 115200 --eol LF

.PHONY: push-all-and-term
push-all-and-term: push-all term

.PHONY: pull-data-ot3
pull-data-ot3:
	mkdir -p "./.pulled-data"
	scp $(ssh_helper_ot3) -r "root@$(host):/data/testing_data/$(test)" "./.pulled-data"

define delete-test-data-cmd
ssh $(ssh_helper_ot3) root@$(1) \
"rm -rf /data/testing_data/$(4)"
endef

.PHONY: delete-data-ot3
delete-data-ot3:
	$(call delete-test-data-cmd,$(host),$(ssh_key),$(ssh_opts),$(test))

define push-and-update-fw
scp $(ssh_helper_ot3) $(4) root@$(1):/tmp/
ssh $(ssh_helper_ot3) root@$(1) \
"function cleanup () { (rm -rf /tmp/$(4) || true) && mount -o remount,ro / ; } ;\
mount -o remount,rw / &&\
(unzip -o /tmp/$(5) -d /usr/lib/firmware || cleanup) &&\
python3 -m json.tool /usr/lib/firmware/opentrons-firmware.json &&\
cleanup &&\
echo "Restarting robot server" &&\
systemctl restart opentrons-robot-server"
endef

.PHONY: sync-sw-ot3
sync-sw-ot3: push-ot3
	cd .. && $(MAKE) push-ot3 host=$(host)

.PHONY: push-ot3-fixture
push-ot3-fixture:
	$(MAKE) apply-patches-fixture
	-$(MAKE) sync-sw-ot3
	$(MAKE) remove-patches-fixture


.PHONY: push-ot3-lld
push-ot3-lld:
	$(MAKE) apply-patches-fixture
	cd ../ && $(MAKE) -C shared-data push-ot3
	cd ../ && $(MAKE) -C hardware push-ot3
	cd ../ && $(MAKE) -C hardware_testing push-ot3
	cd ../ && $(MAKE) -C api push-ot3
	$(MAKE) remove-patches-fixture


.PHONY: apply-patches-fixture
apply-patches-fixture:
	cd ../ && git apply ./hardware-testing/fixture_overrides/*.patch --allow-empty

.PHONY: remove-patches-fixture
remove-patches-fixture:
	cd ../ && git apply ./hardware-testing/fixture_overrides/*.patch --reverse --allow-empty


.PHONY: sync-fw-ot3
sync-fw-ot3:
	$(call push-and-update-fw,$(host),$(ssh_key),$(ssh_opts),$(zip),$(notdir $(zip)))

.PHONY: sync-ot3
sync-ot3: sync-sw-ot3 sync-fw-ot3

.PHONY: push-ot3-gravimetric
push-ot3-gravimetric:
	$(MAKE) push-ot3
	$(MAKE) apply-patches-gravimetric
	cd ../ && $(MAKE) -C shared-data push-ot3
	$(MAKE) remove-patches-gravimetric

.PHONY: apply-patches-gravimetric
apply-patches-gravimetric:
	cd ../ && git apply ./hardware-testing/hardware_testing/gravimetric/overrides/*.patch --allow-empty || true

.PHONY: remove-patches-gravimetric
remove-patches-gravimetric:
	cd ../ && git apply ./hardware-testing/hardware_testing/gravimetric/overrides/*.patch --reverse --allow-empty || true

upstream ?= origin/edge
.PHONY: update-patches-gravimetric
update-patches-gravimetric:
	rm ./hardware_testing/gravimetric/overrides/*.patch
	cd ../ && git diff $(upstream) ./hardware/** > ./hardware-testing/hardware_testing/gravimetric/overrides/hardware.patch
	cd ../ && git diff $(upstream) ./api/** > ./hardware-testing/hardware_testing/gravimetric/overrides/api.patch
	cd ../ && git diff $(upstream) ./shared-data/** > ./hardware-testing/hardware_testing/gravimetric/overrides/shared-data.patch
	cd ../ && git diff $(upstream) ./robot-server/** > ./hardware-testing/hardware_testing/gravimetric/overrides/robot-server.patch
	$(MAKE) remove-patches-gravimetric

.PHONY: push-photometric-ot2
push-photometric-ot2:
	scp $(ssh_helper_ot3) -r -O photometric-ot2/photometric_ot2 root@$(host):/data/user_storage

.PHONY: get-latest-tag
get-latest-tag:
	git tag -l --sort=-v:refname "ot3@*" --merged | (head -n 1 || Select -First 1)


.PHONY:	create-ssh-key
create-ssh-key:
	ssh-keygen -t rsa -b 4096 -f ~/.ssh/robot_key -N ""
	echo "ssh key generated"


.PHONY: push-ssh-key
push-ssh-key:
	echo "make sure USB drive with your public key is connected to Flex"
	curl --location --request POST "http://$(host):31950/server/ssh_keys/from_local" --header "opentrons-version: 3"


.PHONY: term-ot3
term-ot3:
	ssh $(ssh_helper_ot3) root@$(host)


# Creates a tarball of the hardware-testing module that can be deployed to a thumb-drive
.PHONY: setup-usb-module-ot3
setup-usb-module: sdist Pipfile.lock
	@echo "Creating hardware-testing USB package."

	# create git-description
	$(shell $(python) -c "from hardware_testing.data import *; create_git_description_file()")

	# Copy files to dir
	mkdir -p ./dist/hardware_testing_usb/
	mv .hardware-testing-description ./dist/hardware_testing_usb/
	cp -r $(sdist_file) ./dist/hardware_testing_usb/
	cp -r ./hardware_testing/tools/usb-package/* ./dist/hardware_testing_usb/
	cp -r ./hardware_testing/tools/plot ./dist/hardware_testing_usb/

	# Create the usb-package tar file
	tar -zcvf $(usb_file) -C ./dist/ ./hardware_testing_usb/
	rm -rf ./dist/hardware_testing_usb

	# Lets extract the usb package to the usb device if given
	$(if $(usb_dir), tar -xvf $(usb_file) -C $(usb_dir))
