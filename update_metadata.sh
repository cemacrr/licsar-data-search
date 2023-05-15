#!/bin/bash

# top level directory containing scripts, etc.:
WORK_DIR=$(readlink -f $(dirname ${0}))
# metadata output directory:
METADATA_DIR="${WORK_DIR}/metadata"
# ssh user and host for transfer:
REMOTE_USER='cometnerc'
REMOTE_HOST='cometnerc.ssh.wpengine.net'
# remote path for metadata:
REMOTE_PATH='./sites/cometnerc/licsar/LiCSAR_data_search_metadata'
# ssh key to use for transfer:
SSH_KEY="${WORK_DIR}/ssh_key/rr-cometnerc"

# change to work directory or give up:
cd ${WORK_DIR} || exit
# start message:
echo "START: $(date)"
# rsync data to web host:
rsync \
  -aS \
  -e "ssh -o IdentityFile=${SSH_KEY}" \
  ${METADATA_DIR}/ \
  ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/
# end message:
echo "END: $(date)"
