#!/bin/bash

# top level directory containing scripts, etc.:
WORK_DIR=$(readlink -f $(dirname ${0}))
# directory containing python code:
PY_DIR="${WORK_DIR}/get_metadata"
# name of python script:
PY_SCRIPT='get_metadata.py'
# name of job id file:
JOB_ID="${PY_DIR}/job_id"

# change to python directory or give up:
cd ${PY_DIR} || exit
# start message:
echo "START: $(date)"
# check for running / queued jobs:
LAST_JOB_ID=$(cat ${JOB_ID})
# if there is an id:
if [ ! -z "${LAST_JOB_ID}" ] ; then
  # check for running / queued:
  LAST_JOB_STATUS=$(squeue -u $(id -un) | \
                    grep "\s${LAST_JOB_ID}\s" | \
                    awk '{print $5}')
  # if there is a job in the queues:
  if [ ! -z "${LAST_JOB_STATUS}" ] ; then
    # if not in completing state:
    if [ "${LAST_JOB_STATUS}" != "CG" ] ; then
      # give up:
      echo "job in ${LAST_JOB_STATUS} state found. exiting"
      # end message:
      echo "END: $(date)"
      exit
    fi
  fi 
fi
# submit job:
NEW_JOB_ID=$(sbatch \
           --partition=par-single \
           --cpus-per-task=4 \
           --mem=2000 \
           --time=00:30:00 \
           --output=${PY_DIR}/${PY_SCRIPT}.out \
           --error=${PY_DIR}/${PY_SCRIPT}.err \
           --wrap="python3 ${PY_SCRIPT}" | \
           awk '{print $NF}')
# record job id:
echo "${NEW_JOB_ID}" > ${JOB_ID}
# end message:
echo "END: $(date)"
