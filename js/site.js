'use strict';

/** global variables: **/

/* init global variables: */
var site_vars = {
  /* remote base url for licsar products: */
  'remote_base_url': 'https://gws-access.jasmin.ac.uk/public/nceo_geohazards/LiCSAR_products',
  /* path to metadata: */
  'metadata_path': 'metadata',
  /* path to main frames file: */
  'frames_path': 'frames.json',
  /* variable for storing list of frames: */
  'frames': null,
  /* frame ids input: */
  'input_frame_id': document.getElementById('input_frame_id'),
  /* frame ids data list: */
  'datalist_frame_id': document.getElementById('datalist_frame_id'),
  /* date inputs: */
  'input_start_date': document.getElementById('input_start_date'),
  'input_end_date': document.getElementById('input_end_date'),
  /* metadata checkbox: */
  'input_include_metadata': document.getElementById('input_include_metadata'),
  /* epoch files checkboxes: */
  'input_include_epoch_files': document.getElementsByName('input_include_epoch_files[]'),
  /* interferogram files checkboxes: */
  'input_include_ifg_files': document.getElementsByName('input_include_ifg_files[]'),
  /* search button: */
  'button_search_files': document.getElementById('button_search_files'),
  /* search results: */
  'search_results': [],
  /* search results file counts elements: */
  'span_results_count':  document.getElementById('span_results_count'),
  'span_metadata_count':  document.getElementById('span_metadata_count'),
  'span_epoch_count':  document.getElementById('span_epoch_count'),
  'span_ifg_count':  document.getElementById('span_ifg_count'),
  /* search results elements: */
  'div_download_scripts': document.getElementById('download_scripts'),
  'div_download_scripts_display': null,
  'div_search_results': document.getElementById('results'),
  'div_search_results_display': null,
  'div_metadata_results': document.getElementById('metadata_results'),
  'div_metadata_search_results': document.getElementById('metadata_search_results'),
  'div_metadata_results_display': null,
  'div_epoch_results': document.getElementById('epoch_results'),
  'div_epoch_search_results': document.getElementById('epoch_search_results'),
  'div_epoch_results_display': null,
  'div_ifg_results': document.getElementById('ifg_results'),
  'div_ifg_search_results': document.getElementById('ifg_search_results'),
  'div_ifg_results_display': null,
  /* urls for python download script fragments: */
  'python_script_head': 'scripts/python_licsar.py.head',
  'python_script_tail': 'scripts/python_licsar.py.tail'
};

/** functions: **/

/* function to update datalist options: */
function update_datalist(html_el, option_values) {
  /* init element inner html: */
  var inner_html = '';
  /* loop through option values: */
  for (var i = 0; i < option_values.length; i++) {
    /* add option to datalist: */
    inner_html += '<option value="' + option_values[i] + '">';
  };
  /* update inner html: */
  html_el.innerHTML = inner_html;
};

/* function to set up inputs: */
function setup_inputs() {
  /* update frame ids datalist: */
  update_datalist(site_vars['datalist_frame_id'], site_vars['frames']);
  /* enable frame id input element: */
  site_vars['input_frame_id'].disabled = false;
  /* get current date for date inputs; */
  var date_now = new Date();
  var day_now = date_now.getDate();
  day_now = ('0' + day_now).slice(-2);
  var month_now = date_now.getMonth() + 1;
  month_now = ('0' + month_now).slice(-2);
  var year_now = date_now.getFullYear();
  date_now = year_now + '-' + month_now + '-' + day_now;
  /* update and enable start date input: */
  site_vars['input_start_date'].max = date_now;
  site_vars['input_start_date'].disabled = false;
  /* update and enable end date input: */
  site_vars['input_end_date'].max = date_now;
  site_vars['input_end_date'].value = date_now;
  site_vars['input_end_date'].disabled = false;
  /* enable search button: */
  site_vars['button_search_files'].disabled = false;
};

/* function to set up the page: */
function page_setup() {
  /* get display style for search results elements: */
  site_vars['div_search_results_display'] =
    site_vars['div_search_results'].style.display;
  site_vars['div_download_scrips_display'] =
    site_vars['div_download_scripts'].style.display;
  site_vars['div_metadata_results_display'] =
    site_vars['div_metadata_results'].style.display;
  site_vars['div_epoch_results_display'] =
    site_vars['div_epoch_results'].style.display;
  site_vars['div_ifg_results_display'] =
    site_vars['div_ifg_results'].style.display;
  /* hide elements: */
  site_vars['div_ifg_results'].style.display = 'none';
  site_vars['div_epoch_results'].style.display = 'none';
  site_vars['div_metadata_results'].style.display = 'none';
  site_vars['div_download_scripts'].style.display = 'none';
  site_vars['div_search_results'].style.display = 'none';
};

/* function to load frame information: */
function load_frames() {
  /* path to frames json file: */
  var frames_url = site_vars['metadata_path'] + '/' + site_vars['frames_path'];
  /* create new request: */
  var frames_req = new XMLHttpRequest();
  frames_req.responseType = 'json';
  frames_req.open('GET', frames_url, true);
  /* on data download: */
  frames_req.onload = function() {
    /* if successful: */
    if (frames_req.status == 200) {
      /* store frames information: */
      site_vars['frames'] = frames_req.response;
      /* set up input elements: */
      setup_inputs();
    } else {
      /* log error: */
      console.log('failed to load frames information');
    };
  };
  /* send the request: */
  frames_req.send(null);
};

/* function to format file size: */
function format_size(file_size) {
  /* if in the gb range: */
  if (file_size > 1073741824) {
    var file_size_format = (file_size / 1073741824).toFixed(1) + 'G';
  /* if in the mb range: */
  } else if (file_size > 1048576) {
    var file_size_format = (file_size / 1048576).toFixed(1) + 'M';
  /* everything else is in the kb range: */
  } else {
    var file_size_format = (file_size / 1024).toFixed(1) + 'K';
  };
  /* return the formatted file_size: */
  return file_size_format;
};

/* function to search frame information: */
function search_frame_info(frame_info) {
  /* frame id: */
  var frame_id = frame_info['id'];
  /* html element for search results count: */
  var results_count_el = site_vars['span_results_count'];
  /* html element for displaying search results: */
  var search_results_el = site_vars['div_search_results'];
  /* init inner html for information element: */
  var inner_html = '';
  /* init file size totals: */
  var total_metadata_size = 0;
  var total_epoch_size = 0;
  var total_ifg_pair_size = 0;
  /* init list for storing search results: */
  var search_results = [];
  /* remote paths to data for this frame: */
  var remote_path = frame_info['path'];
  var remote_metadata_path = remote_path + '/metadata';
  var remote_epochs_path = remote_path + '/epochs';
  var remote_ifgs_path = remote_path + '/interferograms';
  /* get requested start and end dates: */
  var start_date = site_vars['input_start_date'].value;
  start_date = parseInt(start_date.replace(/-/g, ''));
  var end_date = site_vars['input_end_date'].value;
  end_date = parseInt(end_date.replace(/-/g, ''));
  /** metadata: **/
  /* get metadata checkbox value: */
  var include_metadata = site_vars['input_include_metadata'].checked;
  /* html elements: */
  var metadata_el = site_vars['div_metadata_results'];
  var metadata_count_el = site_vars['span_metadata_count'];
  var metadata_results_el = site_vars['div_metadata_search_results'];
  /* if metadata is requested: */
  if (include_metadata == true) {
    /* init inner html: */
    inner_html = '';
    /* get metadata: */
    var frame_metadata = frame_info['metadata'];
    /* loop through metadata files: */
    var frame_metadata_files = frame_metadata['files'];
    var frame_metadata_sizes = frame_metadata['sizes'];
    for (var i = 0; i < frame_metadata_files.length; i++) {
      /* remote url for this file: */
      var metadata_file = frame_metadata_files[i];
      var metadata_file_url = site_vars['remote_base_url'] + '/' +
                              remote_metadata_path + '/' +
                              metadata_file;
      /* add file information to html: */
      var metadata_size = frame_metadata_sizes[i];
      total_metadata_size += metadata_size;
      inner_html += '<div><a href="' + metadata_file_url + '">' +
                    metadata_file + '</a> (' + format_size(metadata_size) + ')</div>';

      /* store search results: */
      search_results.push({
        'name': metadata_file,
        'path': frame_id + '/metadata',
        'url': metadata_file_url
      })
    };
    /* update file count: */
    if (frame_metadata_files.length == 0) {
      metadata_count_el.innerHTML = '(0 files)';
    } else if (frame_metadata_files.length == 1) {
      metadata_count_el.innerHTML = '(1 file, ' +
                                    format_size(total_metadata_size) + ')';
    } else {
      metadata_count_el.innerHTML = '(' + frame_metadata_files.length +
                                    ' files, ' +
                                    format_size(total_metadata_size) + ')';
    };
    /* update the element html content: */
    metadata_results_el.innerHTML = inner_html;
    /* display the metadata element: */
    metadata_el.style.display =
      site_vars['div_metadata_results_display'];
  } else {
    /* empty the element html content: */
    metadata_count_el.innerHTML = '';
    metadata_results_el.innerHTML = '';
    /* hide metadata element: */
    metadata_el.style.display = 'none';
  };
  /** epoch: **/
  /* html elements: */
  var epoch_el = site_vars['div_epoch_results'];
  var epoch_count_el = site_vars['span_epoch_count'];
  var epoch_results_el = site_vars['div_epoch_search_results'];
  /* check which per epoch files are requested: */
  var include_epoch_files = [];
  /* loop through epoch files input elements: */
  for (var i = 0; i < site_vars['input_include_epoch_files'].length; i++) {
    /* this element: */
    var include_epoch_file = site_vars['input_include_epoch_files'][i];
    /* if the box is checked: */
    if (include_epoch_file.checked == true) {
      /* add the file to list of those which should be included: */
      include_epoch_files.push(include_epoch_file.value);
    };
  };
  /* if any epoch files have been requested: */
  if (include_epoch_files.length > 0) {
    /* init inner html: */
    inner_html = '';
    /* init a file count: */
    var frame_epoch_file_count = 0;
    /* get epochs: */
    var frame_epochs = frame_info['epochs'];
    /* loop through epochs: */
    for (var frame_epoch in frame_epochs) {
      /* data for this epoch: */
      var frame_epoch_info = frame_epochs[frame_epoch];
      /* epoch date as integer: */
      var frame_epoch_date = parseInt(frame_epoch_info['date']);
      /* check date is within requested range: */
      if ((frame_epoch_date < start_date) ||
          (frame_epoch_date > end_date)) {
        continue;
      };
      /* loop through files: */
      var frame_epoch_files = frame_epoch_info['files'];
      var frame_epoch_sizes = frame_epoch_info['sizes'];
      for (var i = 0; i < frame_epoch_files.length; i++) {
        /* skip if this file type is not requested: */
        if (include_epoch_files.indexOf(frame_epoch_files[i]) < 0) {
          continue;
        };
        /* remote url for this file: */
        var frame_epoch_file = frame_epoch + '.' + frame_epoch_files[i];
        var frame_epoch_file_url = site_vars['remote_base_url'] + '/' +
                                   remote_epochs_path + '/' + frame_epoch + '/' +
                                   frame_epoch_file;
        /* add file information to html: */
        var frame_epoch_size = frame_epoch_sizes[i];
        total_epoch_size += frame_epoch_size;
        inner_html += '<div><a href="' + frame_epoch_file_url + '">' +
                      frame_epoch_file + '</a> (' + format_size(frame_epoch_size) + ')</div>';
        /* store search results: */
        search_results.push({
          'name': frame_epoch_file,
          'path': frame_id + '/epochs/' + frame_epoch,
          'url': frame_epoch_file_url
        })
        /* increment the count: */
        frame_epoch_file_count += 1;
      };
    };
    /* update file count: */
    if (frame_epoch_file_count == 0) {
      epoch_count_el.innerHTML = '(0 files)';
    } else if (frame_epoch_file_count == 1) {
      epoch_count_el.innerHTML = '(1 file, ' + format_size(total_epoch_size) +
                                 ')';
    } else {
      epoch_count_el.innerHTML = '(' + frame_epoch_file_count +
                                 ' files, ' + format_size(total_epoch_size) +
                                 ')';
    };
    /* update the element html content: */
    epoch_results_el.innerHTML = inner_html;
    /* display the epoch element: */
    epoch_el.style.display =
      site_vars['div_epoch_results_display'];
  } else {
    /* empty the element html content: */
    epoch_count_el.innerHTML = '';
    epoch_results_el.innerHTML = '';
    /* hide epoch element: */
    epoch_el.style.display = 'none';
  };
  /** interferograms: **/
  /* html elements: */
  var ifg_el = site_vars['div_ifg_results'];
  var ifg_count_el = site_vars['span_ifg_count'];
  var ifg_results_el = site_vars['div_ifg_search_results'];
  /* check which per interferogram files are requested: */
  var include_ifg_files = [];
  /* loop through ifg files input elements: */
  for (var i = 0; i < site_vars['input_include_ifg_files'].length; i++) {
    /* this element: */
    var include_ifg_file = site_vars['input_include_ifg_files'][i];
    /* if the box is checked: */
    if (include_ifg_file.checked == true) {
      /* add the file to list of those which should be included: */
      include_ifg_files.push(include_ifg_file.value);
    };
  };
  /* if any interferogram files have been requested: */
  if (include_ifg_files.length > 0) {
    /* init inner html: */
    inner_html = '';
    /* init a file count: */
    var frame_ifg_file_count = 0;
    /* get interferograms: */
    var frame_ifgs = frame_info['ifgs'];
    /* loop through interferograms: */
    for (var ifg_pair in frame_ifgs) {
      /* data for this pair: */
      var ifg_pair_info = frame_ifgs[ifg_pair];
      /* sart and end dates as integers for this pair: */
      var ifg_pair_start = parseInt(ifg_pair_info['start']);
      var ifg_pair_end = parseInt(ifg_pair_info['end']);
      /* check date is within requested range: */
      if ((ifg_pair_start < start_date) ||
          (ifg_pair_end > end_date)) {
        continue;
      };
      /* loop through files: */
      var ifg_pair_files = ifg_pair_info['files'];
      var ifg_pair_sizes = ifg_pair_info['sizes'];
      for (var i = 0; i < ifg_pair_files.length; i++) {
        /* skip if this file type is not requested: */
        if (include_ifg_files.indexOf(ifg_pair_files[i]) < 0) {
          continue;
        };
        /* remote url for this file: */
        var ifg_pair_file = ifg_pair + '.' + ifg_pair_files[i];
        var ifg_pair_file_url = site_vars['remote_base_url'] + '/' +
                                remote_ifgs_path + '/' + ifg_pair + '/' +
                                ifg_pair_file;
        /* add file information to html: */
        var ifg_pair_size = ifg_pair_sizes[i];
        total_ifg_pair_size += ifg_pair_size;
        inner_html += '<div><a href="' + ifg_pair_file_url + '">' +
                      ifg_pair_file + '</a> (' + format_size(ifg_pair_size) + ')</div>';
        /* store search results: */
        search_results.push({
          'name': ifg_pair_file,
          'path': frame_id + '/interferograms/' + ifg_pair,
          'url': ifg_pair_file_url
        })
        /* increment the count: */
        frame_ifg_file_count += 1;
      };
    };
    /* update file count: */
    if (frame_ifg_file_count == 0) {
      ifg_count_el.innerHTML = '(0 files)';
    } else if (frame_ifg_file_count == 1) {
      ifg_count_el.innerHTML = '(1 file, ' + format_size(total_ifg_pair_size) +
                               ')';
    } else {
      ifg_count_el.innerHTML = '(' + frame_ifg_file_count +
                               ' files, ' + format_size(total_ifg_pair_size) +
                               ')';
    };
    /* update the element html content: */
    ifg_results_el.innerHTML = inner_html;
    /* display the ifg element: */
    ifg_el.style.display =
      site_vars['div_ifg_results_display'];
  } else {
    /* empty the element html content: */
    ifg_count_el.innerHTML = '';
    ifg_results_el.innerHTML = '';
    /* hide ifg element: */
    ifg_el.style.display = 'none';
  };
  /* update search results counts: */
  var total_file_size = total_metadata_size + total_epoch_size +
                        total_ifg_pair_size;
  if (search_results.length == 0) {
    results_count_el.innerHTML = '(0 files)';
  } else if (search_results.length == 1) {
    results_count_el.innerHTML = '(1 file, ' + format_size(total_file_size) +
                                 ')';
  } else {
    results_count_el.innerHTML = '(' + search_results.length + ' files, ' + 
                                 format_size(total_file_size) + ')';
  };
  /* if any search results: */
  if (search_results.length > 0) {
    /* display download scripts buttons: */
    site_vars['div_download_scripts'].style.display =
      site_vars['div_download_scrips_display'];
  } else {
    /* hide download scripts buttons: */
    site_vars['div_download_scripts'].style.display = 'none';
  };
  /* display the search results element: */
  search_results_el.style.display =
    site_vars['div_search_results_display'];
  /* scroll to search results: */
  results_count_el.scrollIntoView();
  /* store search results: */
  site_vars['search_results'] = search_results;
};

/* function to fetch list of files: */
function search_files() {
  /* get selected frame id: */
  var selected_frame_id = site_vars['input_frame_id'].value;
  /* directory which contains json for this frame: */
  var frame_dir = selected_frame_id.split('_')[0];
  /* path to frame json file: */
  var frame_url = site_vars['metadata_path'] + '/' + frame_dir + '/' +
                  selected_frame_id + '.json';
  /* create new request: */
  var frame_req = new XMLHttpRequest();
  frame_req.responseType = 'json';
  frame_req.open('GET', frame_url, true);
  /* on data download: */
  frame_req.onload = function() {
    /* if successful: */
    if (frame_req.status == 200) {
      /* update frame information on page: */
      search_frame_info(frame_req.response);
    } else {
      /* log error: */
      console.log('* failed to load frame information for frame '+
                  selected_frame_id);
      /* update frame information on page: */
      search_frame_info({
        'id': null,
        'path': null,
        'metadata': {'files': []},
        'epochs': {},
        'ifgs': {}
      });
    };
  };
  /* send the request: */
  frame_req.send(null);
};

/* function to return a python script to download found files: */
async function get_script_python() {
  /* get script head using fetch: */
  var python_head_req = await fetch(site_vars['python_script_head']);
  var python_head = await python_head_req.text();
  /* get script tail unsing fetch: */
  var python_tail_req = await fetch(site_vars['python_script_tail']);
  var python_tail = await python_tail_req.text();
  /* start script text content: */
  var script_text_header = 'data:text/plain;charset=utf-8,';
  /* add script head: */
  var script_text = python_head;
  /* loop through search results: */
  for (var i = 0; i < site_vars['search_results'].length; i++) {
      /* details for this file: */
      var file_name = site_vars['search_results'][i]['name'];
      var file_path = site_vars['search_results'][i]['path'];
      var file_url = site_vars['search_results'][i]['url'];
      /* commands to make output directory and python file: */
      script_text += '    {\'name\': \'' + file_name + '\', \'path\': \'' +
                     file_path + '\', \'url\': \'' + file_url + '\'}';
      if (i < (site_vars['search_results'].length - 1)) {
        script_text += ',\n';
      } else {
        script_text += '\n';
      };
  };
  /* add script tail: */
  script_text += python_tail;
  /* encode text data: */
  var encoded_uri = script_text_header + encodeURIComponent(script_text);
  /* name for text file: */
  var text_name = 'python_get_licsar_files.py';
  /* create a temporary link element: */
  var text_link = document.createElement("a");
  text_link.setAttribute("href", encoded_uri);
  text_link.setAttribute("download", text_name);
  text_link.style.visibility = 'hidden';
  /* add link to document, click to init download, then remove: */
  document.body.appendChild(text_link);
  text_link.click();
  document.body.removeChild(text_link);
};

/* function to return a wget script to download found files: */
function get_script_wget() {
  /* start text content: */
  var script_text_header = 'data:text/plain;charset=utf-8,';
  /* header line: */
  var script_text = '#!/usr/bin/env bash\n\n';
  /* variables: */
  script_text += 'OUT_DIR=\'.\'\n';
  script_text += 'WGET_OPTIONS=\'-c -N\'\n\n';
  /* loop through search results: */
  for (var i = 0; i < site_vars['search_results'].length; i++) {
      /* details for this file: */
      var file_name = site_vars['search_results'][i]['name'];
      var file_path = site_vars['search_results'][i]['path'];
      var file_url = site_vars['search_results'][i]['url'];
      /* commands to make output directory and wget file: */
      script_text += 'mkdir -p "${OUT_DIR}/' + file_path + '"\n';
      script_text += 'wget ${WGET_OPTIONS} -P \'' + file_path +
                     '\' \'' + file_url + '\'\n';
  };
  /* encode text data: */
  var encoded_uri = script_text_header + encodeURIComponent(script_text);
  /* name for text file: */
  var text_name = 'wget_licsar_files.sh';
  /* create a temporary link element: */
  var text_link = document.createElement("a");
  text_link.setAttribute("href", encoded_uri);
  text_link.setAttribute("download", text_name);
  text_link.style.visibility = 'hidden';
  /* add link to document, click to init download, then remove: */
  document.body.appendChild(text_link);
  text_link.click();
  document.body.removeChild(text_link);
};

/* function to return a curl script to download found files: */
function get_script_curl() {
  /* start text content: */
  var script_text_header = 'data:text/plain;charset=utf-8,';
  /* header line: */
  var script_text = '#!/usr/bin/env bash\n\n';
  /* variables: */
  script_text += 'OUT_DIR=\'.\'\n';
  script_text += 'CURL_OPTIONS=\'-C - -L -R\'\n\n';
  /* loop through search results: */
  for (var i = 0; i < site_vars['search_results'].length; i++) {
      /* details for this file: */
      var file_name = site_vars['search_results'][i]['name'];
      var file_path = site_vars['search_results'][i]['path'];
      var file_url = site_vars['search_results'][i]['url'];
      /* commands to make output directory and curl file: */
      script_text += 'mkdir -p "${OUT_DIR}/' + file_path + '"\n';
      script_text += 'curl ${CURL_OPTIONS} -o \'' + file_path + '/' +
                     file_name + '\' \'' + file_url + '\'\n';
  };
  /* encode text data: */
  var encoded_uri = script_text_header + encodeURIComponent(script_text);
  /* name for text file: */
  var text_name = 'curl_licsar_files.sh';
  /* create a temporary link element: */
  var text_link = document.createElement("a");
  text_link.setAttribute("href", encoded_uri);
  text_link.setAttribute("download", text_name);
  text_link.style.visibility = 'hidden';
  /* add link to document, click to init download, then remove: */
  document.body.appendChild(text_link);
  text_link.click();
  document.body.removeChild(text_link);
};

/** add listeners: **/

/* on page load: */
window.addEventListener('load', function() {
  /* set up page: */
  page_setup();
  /* load frames: */
  load_frames();
});
