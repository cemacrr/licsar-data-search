#!/usr/bin/env python
# -*- coding: utf-8 -*-

# ---

from __future__ import division
from ctypes import c_int
import datetime
from multiprocessing import Manager, Pool
import os
import sys
import time
try:
    from urllib.request import Request, urlopen
except ImportError:
    from urllib2 import Request, urlopen

# ---

OUT_DIR = '.'
POOL_SIZE = 2
LICSAR_FILES = [
{{ FILES }}
]
TOTAL_SIZE = sum([i['size'] for i in LICSAR_FILES])

# ---

def format_size(value, total_size):
    if total_size > 1073741824:
        value /= 1073741824
        units = 'G'
    elif total_size > 1048576:
        value /= 1048576
        units = 'M'
    else:
        value /= 1024
        units = 'K'
    value_str = '{0:5.01f}{1}'.format(value, units)
    return value_str

def display_progress(progress_count, progress_total, current_size, total_size):
    percent_complete = (current_size / total_size) * 100
    current_size_str = format_size(current_size, total_size)
    total_size_str = format_size(total_size, total_size)
    file_count_fmt = '{{:{0}d}}'.format(len(str(progress_total)))
    progress_count_str = file_count_fmt.format(progress_count) 
    progress_total_str = file_count_fmt.format(progress_total) 
    file_msg = '\r{0} of {1} files downloaded, {2} / {3} ({4:6.02f}%)'
    sys.stdout.flush()
    sys.stdout.write(file_msg.format(
        progress_count_str, progress_total_str,
        current_size_str, total_size_str,
        percent_complete
    ))
    sys.stdout.flush()

def mp_wrapper(mp_options):
    try:
        mp_function = mp_options['mp_function']
        mp_count = mp_options['mp_count']
        mp_progress = mp_options['mp_progress']
        mp_size = mp_options['mp_size']
        mp_lock = mp_options['mp_lock']
        mp_display_progress = mp_options['mp_display_progress']
        file_size = mp_options['size']
        total_size = mp_options['total_size']
        if mp_display_progress:
            mp_lock.acquire()
            display_progress(
                mp_progress.value, mp_count, mp_size.value, total_size
            )
            mp_lock.release()
        mp_out = mp_function(mp_options)
        mp_progress.value += 1
        mp_size.value += file_size
        if mp_display_progress:
            mp_lock.acquire()
            display_progress(
                mp_progress.value, mp_count, mp_size.value, total_size
            )
            mp_lock.release()
        return mp_out
    except KeyboardInterrupt:
        return None

def mp_run(mp_function, mp_options, pool_size, mp_display_progress=True):
    mp_options_new = []
    for i in range(pool_size):
        mp_options_new += mp_options[i::pool_size]
    mp_options = mp_options_new
    del mp_options_new
    mp_manager = Manager()
    mp_progress = mp_manager.Value(c_int, 0)
    mp_size = mp_manager.Value(c_int, 0)
    mp_lock = mp_manager.Lock()
    for mp_option in mp_options:
        mp_option['mp_function'] = mp_function
        mp_option['mp_count'] = len(mp_options)
        mp_option['mp_progress'] = mp_progress
        mp_option['mp_size'] = mp_size
        mp_option['total_size'] = TOTAL_SIZE
        mp_option['mp_lock'] = mp_lock
        mp_option['mp_display_progress'] = mp_display_progress
    mp_pool = Pool(pool_size)
    mp_result = mp_pool.map_async(mp_wrapper, mp_options)
    try:
        mp_out = mp_result.get()
        mp_pool.close()
        mp_pool.join()
    except KeyboardInterrupt:
        try:
            mp_pool.terminate()
            mp_pool.join()
        except:
            pass
        sys.stdout.write('\n')
        sys.exit()
    display_progress(len(mp_options), len(mp_options), TOTAL_SIZE, TOTAL_SIZE)
    sys.stdout.write('\n')
    sys.stdout.flush()
    mp_manager.shutdown()
    return mp_out

def make_dirs():
    licsar_dirs = list(set([i['path'] for i in LICSAR_FILES]))
    for licsar_dir in licsar_dirs:
        out_dir = os.sep.join([OUT_DIR, licsar_dir])
        if not os.path.exists(out_dir):
            os.makedirs(out_dir)

def get_url(req_url):
    url_request = Request(req_url)
    req_response = urlopen(url_request)
    return req_response

def check_url(req_url):
    req_response = get_url(req_url)
    req_info = req_response.info()
    req_size = int(req_info['Content-Length'])
    req_mtime = time.mktime(
        datetime.datetime.strptime(
            req_info['Last-Modified'],
            '%a, %d %b %Y %H:%M:%S GMT'
        ).utctimetuple()
    )
    req_response.close()
    return req_size, req_mtime

def get_file(options):
    file_name = options['name']
    file_path = options['path']
    file_url = options['url']
    out_dir = os.sep.join([OUT_DIR, file_path])
    out_path = os.sep.join([out_dir, file_name])
    remote_size, remote_mtime = check_url(file_url)
    if os.path.exists(out_path):
        local_stat = os.stat(out_path)
        local_size = local_stat.st_size
        local_mtime = local_stat.st_mtime
        if remote_size == local_size and remote_mtime == local_mtime:
            return
    file_req = get_url(file_url)
    with open(out_path, 'wb') as out_fh:
        out_fh.write(file_req.read())
    file_req.close()
    os.utime(out_path, (remote_mtime, remote_mtime))

def main():
    make_dirs()
    mp_run(get_file, LICSAR_FILES, POOL_SIZE)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        sys.stdout.write('\n')
        sys.exit()
