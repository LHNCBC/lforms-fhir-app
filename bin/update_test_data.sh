#!/bin/bash

# Updates the test data files when the lforms package is being updated and there
# are breaking changes.
script_dir=`dirname ${BASH_SOURCE}`
cd $script_dir/..
xargs -I % -n 1 sh -c './node_modules/lforms-updater/bin/updater.js -f % > %.new; mv %.new %' < <(ls -1 e2e-tests/data/R4/*json)
