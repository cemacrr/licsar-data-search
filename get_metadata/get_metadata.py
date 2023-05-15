#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Get LiCSAR metadata and save as JSON
"""

# ---

# std lib imports:
from __future__ import division
from ctypes import c_int
import json
from multiprocessing import Manager, Pool
import os
import re
import sys
import time

# ---

# Pool size for multiprocessing:
POOL_SIZE = 4

# Path to top level LiCSAR products directory
LICS_PATH = '/gws/nopw/j04/nceo_geohazards_vol1/public/LiCSAR_products'

# Expected epoch file patterns:
EPOCH_FILE_MATCH = [
    'geo.mli.png', 'geo.mli.tif', 'sltd.geo.tif', 'ztd.geo.tif', 'ztd.jpg'
]

# Expected metadata file patterns:
METADATA_FILE_MATCH = [
    'geo.E.tif', 'geo.N.tif', 'geo.U.tif', 'geo.hgt.tif', 'baselines',
    'metadata.txt', 'network.png'
]

# Expected interferogram file patterns:
IFG_FILE_MATCH = [
    'geo.cc.png', 'geo.cc.tif', 'geo.diff.png', 'geo.diff_pha.tif',
    'geo_diff_unfiltered.png', 'geo_diff_unfiltered_pha.tif', 'geo.unw.png',
    'geo.unw.tif'
]

# Output path for storing JSON data:
OUT_PATH = '../metadata'

# ---

def display_progress(progress_count, progress_total):
    """
    display percentage completion information
    """
    # current completion percentage:
    percent_complete = (progress_count / progress_total) * 100
    # display progress:
    file_msg = '\r  progress : {0:.02f} %'
    sys.stdout.flush()
    sys.stdout.write(file_msg.format(percent_complete))
    sys.stdout.flush()

def mp_wrapper(mp_options):
    """
    Wrapper for multiprocessing function
    """
    # try to catch KeyboardInterrupt:
    try:
        # get options:
        mp_function = mp_options['mp_function']
        mp_count = mp_options['mp_count']
        mp_progress = mp_options['mp_progress']
        mp_lock = mp_options['mp_lock']
        mp_display_progress = mp_options['mp_display_progress']
        # acquire lock and display progress message:
        if mp_display_progress:
            mp_lock.acquire()
            display_progress(mp_progress.value, mp_count)
            mp_lock.release()
        # run the worker function:
        mp_out = mp_function(mp_options)
        # increment progress count:
        mp_progress.value += 1
        # acquire lock and display progress message:
        if mp_display_progress:
            mp_lock.acquire()
            display_progress(mp_progress.value, mp_count)
            mp_lock.release()
        # return the result:
        return mp_out
    except KeyboardInterrupt:
        return None

def mp_run(mp_function, mp_options, pool_size, mp_display_progress=True):
    """
    Run function via multiprocessing pool with specified options and pool
    size
    """
    # re-arrange options to try and balance load:
    mp_options_new = []
    for i in range(pool_size):
        mp_options_new += mp_options[i::pool_size]
    mp_options = mp_options_new
    del mp_options_new
    # create a multiprocessing manager:
    mp_manager = Manager()
    # add progress counter value to the multiprocessing manager:
    mp_progress = mp_manager.Value(c_int, 0)
    # multiprocessing lock for message display:
    mp_lock = mp_manager.Lock()
    # update mp_options to add function and multiprocessing manager
    # information:
    for mp_option in mp_options:
        mp_option['mp_function'] = mp_function
        mp_option['mp_count'] = len(mp_options)
        mp_option['mp_progress'] = mp_progress
        mp_option['mp_lock'] = mp_lock
        mp_option['mp_display_progress'] = mp_display_progress
    # create a multiprocessing pool:
    mp_pool = Pool(pool_size)
    # use map_async to run the function:
    mp_result = mp_pool.map_async(mp_wrapper, mp_options)
    # try to exit cleanly on KeyboardInterrupt:
    try:
        mp_out = mp_result.get()
        mp_pool.close()
        mp_pool.join()
    except KeyboardInterrupt:
        # try to kill mp pool nicely:
        try:
            mp_pool.terminate()
            mp_pool.join()
        except:
            pass
        # exit:
        sys.stdout.write('\n')
        sys.exit()
    # update progress and add a line break after execution:
    display_progress(1, 1)
    sys.stdout.write('\n')
    sys.stdout.flush()
    # close the multiprocessing manager:
    mp_manager.shutdown()
    # return any result:
    return mp_out

def get_frames(lics_path):
    """
    Find all frames which exist in LiCSAR products directory
    """
    # Display a message:
    err_msg = '* searching for frames'
    sys.stdout.write('{0}\n'.format(err_msg))
    # Init a list for storing track directories:
    track_dirs = []
    # Use os scandir to search for track directories:
    for item in os.scandir(lics_path):
        # If not a directory, move on:
        if not item.is_dir():
            continue
        # Check if directory name matches expected file pattern:
        name_match = re.search(r'^[0-9]+$', item.name)
        if not name_match or name_match.group(0) != item.name:
            continue
        # If we get here, this looks like a track directory, so add to list:
        track_dirs.append(item.name)
    # Sort directories:
    track_dirs.sort(key=int)
    # Init a list for storing frame information:
    frames = []
    # For each track directory:
    for track_dir in track_dirs:
        # Full path to track dir:
        track_path = os.sep.join([lics_path, track_dir])
        # Use os scandir to search for frame directories:
        for item in os.scandir(track_path):
            # If not a directory, move on:
            if not item.is_dir():
                continue
            # Check if directory name matches expected file pattern:
            name_match = re.search(r'^[0-9]{3}[AD]_[0-9]{5}_[0-9]{6}$', item.name)
            if not name_match or name_match.group(0) != item.name:
                continue
            # If we get here, this looks like a frame directory. Store information:
            frames.append({
                'id': item.name,
                'track_dir': track_dir
            })
    # Display a message:
    err_msg = '  found {0} frames'.format(len(frames))
    sys.stdout.write('{0}\n'.format(err_msg))
    # Return the frame information:
    return frames

def get_epochs(epochs_path, file_match):
    """
    Get information from epochs path
    """
    # Init list for storing epoch directories:
    epoch_dirs = []
    # Use os scandir to search for epoch directories:
    for item in os.scandir(epochs_path):
        # If not a directory, move on:
        if not item.is_dir():
            continue
        # Check if directory name matches expected file pattern:
        name_match = re.search(r'^[0-9]{8}$', item.name)
        if not name_match or name_match.group(0) != item.name:
            continue
        # If we get here, this looks like an epoch directory, so add to list:
        epoch_dirs.append(item.name)
    # Init dict for storing epoch information:
    epochs = {}
    # Loop through epoch dirs:
    for epoch_dir in epoch_dirs:
        # Full path to epoch directory:
        epoch_path = os.sep.join([epochs_path, epoch_dir])
        # Init dict for this epoch:
        epoch = {
            'date': int(epoch_dir),
            'files': [],
            'sizes': []
        }
        # Use os scandir to search through content:
        for item in os.scandir(epoch_path):
            # Skip directories:
            if item.is_dir():
                continue
            # Check if name matches an expected pattern:
            for file_pattern in file_match:
                # If so ... :
                if item.name == '{0}.{1}'.format(epoch_dir, file_pattern):
                    # Store the file information:
                    epoch['files'].append(file_pattern)
                    # Store file size information:
                    epoch['sizes'].append(os.stat(item.path).st_size)
            # Store the information for this epoch:
            epochs[epoch_dir] = epoch
    # Return the epochs information:
    return epochs

def get_metadata(metadata_path, file_match):
    """
    Get information from metadtaa path
    """
    # Init dict for storing metadata information:
    metadata = {
        'files': [],
        'sizes': []
    }
    # Use os scandir to search through content:
    for item in os.scandir(metadata_path):
        # Skip directories:
        if item.is_dir():
            continue
        # Check if name matches an expected pattern:
        for file_pattern in file_match:
            # If so ... :
            if item.name.endswith(file_pattern):
                # Store the file information:
                metadata['files'].append(item.name)
                # Store file size information:
                metadata['sizes'].append(os.stat(item.path).st_size)
    # Return the metadata information:
    return metadata

def get_ifgs(ifgs_path, file_match):
    """
    Get information from interferograms path
    """
    # Init list for storing interferogram directories:
    ifg_dirs = []
    # Use os scandir to search for interferogram directories:
    for item in os.scandir(ifgs_path):
        # If not a directory, move on:
        if not item.is_dir():
            continue
        # Check if directory name matches expected file pattern:
        name_match = re.search(r'^[0-9]{8}_[0-9]{8}$', item.name)
        if not name_match or name_match.group(0) != item.name:
            continue
        # If we get here, this looks like an interferogram directory, so add
        # to list:
        ifg_dirs.append(item.name)
    # Init dict for storing interferogram information:
    ifgs = {}
    # Loop through interferogram dirs:
    for ifg_dir in ifg_dirs:
        # Full path to ifg directory:
        ifg_path = os.sep.join([ifgs_path, ifg_dir])
        # Start and end data from directory name:
        start_date, end_date = ifg_dir.split('_')
        # Init dict for this ifg:
        ifg = {
            'start': int(start_date),
            'end': int(end_date),
            'files': [],
            'sizes': []
        }
        # Use os scandir to search through content:
        for item in os.scandir(ifg_path):
            # Skip directories:
            if item.is_dir():
                continue
            # Check if name matches an expected pattern:
            for file_pattern in file_match:
                # If so ... :
                if item.name == '{0}.{1}'.format(ifg_dir, file_pattern):
                    # Store the file information:
                    ifg['files'].append(file_pattern)
                    # Store file size information:
                    ifg['sizes'].append(os.stat(item.path).st_size)
            # Store the information for this ifg:
            ifgs[ifg_dir] = ifg
    # Return the ifgs information:
    return ifgs

def get_frame_metadata(options):
    """
    Get metadata for specified frame
    """
    # Get options:
    lics_path = options['lics_path']
    frame_id = options['id']
    track_dir = options['track_dir']
    # Full path to frame directory:
    frame_path = os.sep.join([
        lics_path, track_dir, frame_id
    ])
    # Get metadata data. Path to metadata directory:
    metadata_path = os.sep.join([frame_path, 'metadata'])
    # If directory doesn't exist:
    if not os.path.isdir(metadata_path):
        # Empty metadata information:
        metadata = {}
    # Else, get the metadata information:
    else:
        metadata = get_metadata(metadata_path, METADATA_FILE_MATCH)
    # Get epochs data. Path to epochs directory:
    epochs_path = os.sep.join([frame_path, 'epochs'])
    # If directory doesn't exist:
    if not os.path.isdir(epochs_path):
        # Empty epochs information:
        epochs = {}
    # Else, get the epochs information:
    else:
        epochs = get_epochs(epochs_path, EPOCH_FILE_MATCH)
    # Get interferogram data. Path to inteferograms directory:
    ifgs_path = os.sep.join([frame_path, 'interferograms'])
    # If directory doesn't exist:
    if not os.path.isdir(ifgs_path):
        # Empty interferograms information:
        ifgs = {}
    # Else, get the interferograms information:
    else:
        ifgs = get_ifgs(ifgs_path, IFG_FILE_MATCH)
    # Dict of frame metadata:
    frame_metadata = {
        'id': frame_id,
        'path': os.sep.join([track_dir, frame_id]),
        'epochs': epochs,
        'metadata': metadata,
        'ifgs': ifgs
    }
    # Return the metadata:
    return frame_metadata

def get_frames_metadata(lics_path, frames):
    """
    Get metadata for all of the frames
    """
    # Display a message:
    err_msg = '* getting metadata for frames'
    sys.stdout.write('{0}\n'.format(err_msg))
    # Create multiprocessing options:
    mp_options = []
    for frame in frames:
        # Options for this task:
        options = {
            'lics_path': lics_path,
            'id': frame['id'],
            'track_dir': frame['track_dir']
        }
        # store the options:
        mp_options.append(options)
    # Get metadata using multiprocessing:
    frames_metadata = mp_run(get_frame_metadata, mp_options, POOL_SIZE)
    # Return the metadata:
    return frames_metadata

def save_metadata(out_path, frames_metadata):
    """
    Save metadata as JSON
    """
    # Display a message:
    err_msg = '* saving metadata in {0}'.format(out_path)
    sys.stdout.write('{0}\n'.format(err_msg))
    # Make output directory if required:
    if not os.path.exists(out_path):
        os.makedirs(out_path)
    # Write a list of all frames first. Get all frame ids:
    frame_ids = [
        i['id'] for i in frames_metadata
    ]
    # Path to output file storing frame ids:
    frame_ids_path = os.sep.join([out_path, 'frames.json'])
    # Open the output file for writing:
    with open(frame_ids_path, 'w') as json_file:
        # Write the frame ids as JSON:
        json.dump(frame_ids, json_file, separators=(',', ':'))
    # Loop through all of the frames in the metadata:
    for frame_metadata in frames_metadata:
        # Frame id for this frame:
        frame_id = frame_metadata['id']
        # Output directory for this frame:
        frame_out_dir = frame_id.split('_')[0]
        frame_out_dir_path = os.sep.join([out_path, frame_out_dir])
        # Make output directory if required:
        if not os.path.exists(frame_out_dir_path):
            os.makedirs(frame_out_dir_path)
        # Output file for this frame:
        frame_out = '{0}.json'.format(frame_id)
        frame_out_path = os.sep.join([frame_out_dir_path, frame_out])
        # Open output file for writing:
        with open(frame_out_path, 'w') as json_file:
            # Write the frame metadata as JSON:
            json.dump(frame_metadata, json_file, separators=(',', ':'))

def main():
    """
    Main program function
    """
    # Get a start time value:
    start_time = time.time()
    # Find all frame directories:
    frames = get_frames(LICS_PATH)
    # Get all frame metadata:
    frames_metadata = get_frames_metadata(LICS_PATH, frames)
    # Save the metadata:
    save_metadata(OUT_PATH, frames_metadata)
    # Get the current time for elapsed time calculation and display:
    elapsed_time = time.time() - start_time
    time_msg = 'elapsed time : {0:.02f} seconds\n'
    sys.stdout.write(time_msg.format(elapsed_time))

if __name__ == '__main__':
    # Try to catch KeyboardInterrupt:
    try:
        main()
    except KeyboardInterrupt:
        sys.stdout.write('\n')
        sys.exit()
