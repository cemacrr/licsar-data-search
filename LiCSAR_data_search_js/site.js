'use strict';

/** global variables: **/

/* init global variables: */
var site_vars = {
  /* remote base url for licsar products: */
  'remote_base_url': 'https://gws-access.jasmin.ac.uk/public/nceo_geohazards/LiCSAR_products',
  /* path to metadata: */
  'metadata_path': 'LiCSAR_data_search_metadata',
  /* path to main frames file: */
  'frames_path': 'frames.json',
  /* variable for storing list of frames: */
  'frames': null,
  /* frame inputs container: */
  'frames_inputs': document.getElementById('frame_id_inputs'),
  /* remove / add frame button: */
  'remove_frame': document.getElementById('remove_frame_button'),
  'add_frame': document.getElementById('add_frame_button'),
  /* frame ids input values: */
  'frame_ids': [],
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
  /* search results elements: */
  'div_download_scripts': document.getElementById('download_scripts'),
  'div_download_scripts_display': null,
  'div_results': document.getElementById('results'),
  'div_results_display': null,
  'div_search_results': document.getElementById('div_search_results'),
  /* urls for download script templates: */
  'python_script_template': 'LiCSAR_data_search_scripts/get_licsar_files.py',
  'wget_script_template': 'LiCSAR_data_search_scripts/wget_licsar_files.sh',
  'curl_script_template': 'LiCSAR_data_search_scripts/curl_licsar_files.sh'
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
  /* enable frame id input elements: */
  var input_frame_ids = document.getElementsByClassName('input_frame_id');
  for (var i = 0; i < input_frame_ids.length; i++) {
    input_frame_ids[i].disabled = false;
  };
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
  site_vars['div_results_display'] =
    site_vars['div_results'].style.display;
  site_vars['div_download_scrips_display'] =
    site_vars['div_download_scripts'].style.display;
  /* hide elements: */
  site_vars['div_download_scripts'].style.display = 'none';
  site_vars['div_results'].style.display = 'none';
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

/* function to get frame information from json file: */
async function get_frame_info(frame_id) {
  /* directory which contains json for this frame: */
  var frame_dir = frame_id.split('_')[0];
  /* path to frame json file: */
  var frame_url = site_vars['metadata_path'] + '/' + frame_dir + '/' +
                  frame_id + '.json';
  /* get frame info using fetch: */
  var frame_req = await fetch(frame_url);
  /* if successful: */
  if (frame_req.status == 200) {
    /* frame information from request: */
    var frame_info = await frame_req.json();
  } else {
    /* log error: */
    console.log('* failed to load frame information for frame ' + frame_id);
    /* empty frame information: */
    var frame_info = {
      'id': null,
      'path': null,
      'metadata': {'files': []},
      'epochs': {},
      'ifgs': {}
    };
  };
  /* return the frame information: */
  return frame_info;
};

/* function to search frame information: */
function search_frames_info(frames_info) {
  /* init search results: */
  var results = {
    'total_count': 0,
    'total_size': 0,
    'frames': []
  };
  /* get requested start and end dates: */
  var start_date = site_vars['input_start_date'].value;
  start_date = parseInt(start_date.replace(/-/g, ''));
  var end_date = site_vars['input_end_date'].value;
  end_date = parseInt(end_date.replace(/-/g, ''));
  /* get metadata checkbox value: */
  var include_metadata = site_vars['input_include_metadata'].checked;
  /* loop through frames: */
  for (var i = 0; i < frames_info.length; i++) {
    /* info for this frame: */
    var frame_info = frames_info[i];
    /* id for this frame: */
    var frame_id = frame_info['id'];
    /* init results for this frame: */
    var frame_results = {
      'id': frame_id,
      'path': frame_info['path'],
      'metadata': [],
      'epochs': [],
      'ifgs': [],
      'metadata_count': 0,
      'metadata_size': 0,
      'epochs_count': 0,
      'epochs_size': 0,
      'ifgs_count': 0,
      'ifgs_size': 0,
      'total_count': 0,
      'total_size': 0
    };
    /* remote paths to data for this frame: */
    var remote_path = frame_info['path'];
    var remote_metadata_path = remote_path + '/metadata';
    var remote_epochs_path = remote_path + '/epochs';
    var remote_ifgs_path = remote_path + '/interferograms';
    /** metadata: **/
    /* if metadata is requested: */
    if (include_metadata == true) {
      /* get metadata: */
      var frame_metadata = frame_info['metadata'];
      /* loop through metadata files: */
      var frame_metadata_files = frame_metadata['files'];
      var frame_metadata_sizes = frame_metadata['sizes'];
      for (var j = 0; j < frame_metadata_files.length; j++) {
        /* remote url for this file: */
        var metadata_file = frame_metadata_files[j];
        var metadata_file_url = site_vars['remote_base_url'] + '/' +
                                remote_metadata_path + '/' +
                                metadata_file;
        /* size of this file: */
        var metadata_size = frame_metadata_sizes[j];
        /* store search results: */
        frame_results['metadata'].push({
          'name': metadata_file,
          'path': frame_id + '/metadata',
          'url': metadata_file_url,
          'size': metadata_size
        })
        /* update counts and sizes: */
        frame_results['metadata_count'] += 1;
        frame_results['metadata_size'] += metadata_size;
        frame_results['total_count'] += 1;
        frame_results['total_size'] += metadata_size;
        results['total_count'] += 1;
        results['total_size'] += metadata_size;
      };
    };
    /** epochs: **/
    /* check which per epoch files are requested: */
    var include_epoch_files = [];
    /* loop through epoch files input elements: */
    for (var j = 0; j < site_vars['input_include_epoch_files'].length; j++) {
      /* this element: */
      var include_epoch_file = site_vars['input_include_epoch_files'][j];
      /* if the box is checked: */
      if (include_epoch_file.checked == true) {
        /* add the file to list of those which should be included: */
        include_epoch_files.push(include_epoch_file.value);
      };
    };
    /* if any epoch files have been requested: */
    if (include_epoch_files.length > 0) {
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
        for (var j = 0; j < frame_epoch_files.length; j++) {
          /* skip if this file type is not requested: */
          if (include_epoch_files.indexOf(frame_epoch_files[j]) < 0) {
            continue;
          };
          /* remote url for this file: */
          var frame_epoch_file = frame_epoch + '.' + frame_epoch_files[j];
          var frame_epoch_file_url = site_vars['remote_base_url'] + '/' +
                                     remote_epochs_path + '/' + frame_epoch + '/' +
                                     frame_epoch_file;
          /* size of this file: */
          var frame_epoch_size = frame_epoch_sizes[j];
          /* store search results: */
          frame_results['epochs'].push({
            'name': frame_epoch_file,
            'path': frame_id + '/epochs/' + frame_epoch,
            'url': frame_epoch_file_url,
            'size': frame_epoch_size
          })
          /* update counts and sizes: */
          frame_results['epochs_count'] += 1;
          frame_results['epochs_size'] += frame_epoch_size;
          frame_results['total_count'] += 1;
          frame_results['total_size'] += frame_epoch_size;
          results['total_count'] += 1;
          results['total_size'] += frame_epoch_size;
        };
      };
    };
    /** interferograms: **/
    /* check which per interferogram files are requested: */
    var include_ifg_files = [];
    /* loop through ifg files input elements: */
    for (var j = 0; j < site_vars['input_include_ifg_files'].length; j++) {
      /* this element: */
      var include_ifg_file = site_vars['input_include_ifg_files'][j];
      /* if the box is checked: */
      if (include_ifg_file.checked == true) {
        /* add the file to list of those which should be included: */
        include_ifg_files.push(include_ifg_file.value);
      };
    };
    /* if any interferogram files have been requested: */
    if (include_ifg_files.length > 0) {
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
        for (var j = 0; j < ifg_pair_files.length; j++) {
          /* skip if this file type is not requested: */
          if (include_ifg_files.indexOf(ifg_pair_files[j]) < 0) {
            continue;
          };
          /* remote url for this file: */
          var ifg_pair_file = ifg_pair + '.' + ifg_pair_files[j];
          var ifg_pair_file_url = site_vars['remote_base_url'] + '/' +
                                  remote_ifgs_path + '/' + ifg_pair + '/' +
                                  ifg_pair_file;
          /* size of this file: */
          var ifg_pair_size = ifg_pair_sizes[j];

          /* store search results: */
          frame_results['ifgs'].push({
            'name': ifg_pair_file,
            'path': frame_id + '/interferograms/' + ifg_pair,
            'url': ifg_pair_file_url,
            'size': ifg_pair_size
          })
          /* update counts and sizes: */
          frame_results['ifgs_count'] += 1;
          frame_results['ifgs_size'] += ifg_pair_size;
          frame_results['total_count'] += 1;
          frame_results['total_size'] += ifg_pair_size;
          results['total_count'] += 1;
          results['total_size'] += ifg_pair_size;
        };
      };
    };
    /* store frame results: */
    results['frames'].push(frame_results);
  };
  /* return the results: */
  return results;
};

/* function to display search results: */
function display_search_results() {
  /* get the results: */
  var search_results = site_vars['search_results'];
  /* main html element for displaying total search results: */
  var results_el = site_vars['div_results'];
  /* html element for search results count: */
  var results_count_el = site_vars['span_results_count'];
  /* update search results totals: */
  var total_file_count = search_results['total_count'];
  var total_file_size = search_results['total_size'];
  /* update html for total count and size: */
  if (total_file_count == 0) {
    results_count_el.innerHTML = '(0 files)';
  } else if (total_file_count == 1) {
    results_count_el.innerHTML = '(1 file, ' + format_size(total_file_size) +
                                 ')';
  } else {
    results_count_el.innerHTML = '(' + total_file_count + ' files, ' +
                                 format_size(total_file_size) + ')';
  };
  /* div for search result content: */
  var search_results_el = site_vars['div_search_results'];
  /* wipe out html content of search results: */
  search_results_el.innerHTML = '';
  /* per frame search results: */
  var frames_results = search_results['frames'];
  /* loop through the frames i nthe results: */
  for (var i = 0; i < frames_results.length; i++) {
    /* results for this frame: */
    var frame_results = frames_results[i];
    /* id for this frame: */
    var frame_id = frame_results['id'];
    /* file count and size for this frame: */
    var frame_file_count = frame_results['total_count'];
    var frame_file_size = frame_results['total_size'];
    /* if no results for this frame, move one: */
    if (frame_file_count == 0) {
      continue;
    };
    /* create a div for the frame results: */
    var frame_results_el = document.createElement('div');
    frame_results_el.id = 'frame_results_' + frame_id;
    frame_results.classList = 'frame_results';
    /** frame header: **/
    /* if more than one frame has results, display per frame header: */
    if (frame_file_count != total_file_count) {
      /* create a div for frame result header: */
      var frame_header_el = document.createElement('div');
      frame_header_el.id = 'frame_results_header_' + frame_id;
      frame_header_el.classList = 'heading';
      frame_results_el.appendChild(frame_header_el)
      /* add content to header element: */
      var frame_header_label_el = document.createElement('label');
      frame_header_label_el.innerHTML = frame_id + ' ';
      frame_header_el.appendChild(frame_header_label_el);
      /* add results count to frame header element: */
      var frame_header_count_el = document.createElement('span');
      frame_header_count_el.classList = 'span_results_count';
      frame_header_el.appendChild(frame_header_count_el);
      /* add count html content: */
      if (frame_file_count == 0) {
        frame_header_count_el.innerHTML = '(0 files)';
      } else if (frame_file_count == 1) {
        frame_header_count_el.innerHTML =
          '(1 file, ' + format_size(frame_file_size) + ')';
      } else {
        frame_header_count_el.innerHTML =
          '(' + frame_file_count + ' files, ' +
          format_size(frame_file_size) + ')';
      };
    };
    /* results categories and labels: */
    var results_types = ['metadata', 'epochs', 'ifgs'];
    var results_labels = [
      'Metadata', 'Per epoch files', 'Interferograms'
    ];
    /* loop through results types: */
    for (var j = 0; j < results_types.length; j++) {
      /* result type and label: */
      var result_type = results_types[j];
      var result_label = results_labels[j];
      /* file count and size for this frame: */
      var type_count = frame_results[result_type + '_count'];
      var type_size = frame_results[result_type + '_size'];
      /* if any results: */
      if (type_count > 0) {
        /* create a div for the type results: */
        var type_el = document.createElement('div');
        type_el.id = result_type + '_results_' + frame_id;
        type_el.classList = 'frame_results';
        frame_results_el.appendChild(type_el);
        /* create a div for type header: */
        var type_hdr_el = document.createElement('div');
        type_hdr_el.id = 'label_' + result_type + '_results_' + frame_id;
        type_hdr_el.classList = 'label';
        type_el.appendChild(type_hdr_el);
        /* add header content: */
        var type_label_el = document.createElement('label');
        type_label_el.innerHTML = result_label + ' '
        type_hdr_el.appendChild(type_label_el);
        var type_count_el = document.createElement('span');
        type_count_el.classList = 'span_results_count';
        /* add count html content: */
        if (type_count == 1) {
          type_count_el.innerHTML =
            '(1 file, ' + format_size(type_size) + ')';
        } else {
          type_count_el.innerHTML =
            '(' + type_count + ' files, ' + format_size(type_size) + ')';
        };
        type_hdr_el.appendChild(type_count_el);
        /* add element for type results: */
        var type_results_el = document.createElement('div');
        type_results_el.classList = 'frame_search_results';
        type_el.appendChild(type_results_el);
        /* init inner html for type search results; */
        var type_results_html = '';
        /* get type data: */
        var type_data = frame_results[result_type];
        /* loop through files: */
        for (var k = 0; k < type_data.length; k++) {
          /* data for this file: */
          var data_file = type_data[k];
          /* add file information to html: */
          type_results_html +=
            '<div><a href="' + data_file['url'] + '">' + data_file['name'] +
            '</a> (' + format_size(data_file['size']) + ')</div>';
        };
        /* update results html: */
        type_results_el.innerHTML = type_results_html;
      };
    /* end loop through results types: */
    };
    /* add html content for this frame to search results: */
    search_results_el.appendChild(frame_results_el);
  };
  /* if any search results: */
  if (total_file_count > 0) {
    /* display download scripts buttons: */
    site_vars['div_download_scripts'].style.display =
      site_vars['div_download_scrips_display'];
  } else {
    /* hide download scripts buttons: */
    site_vars['div_download_scripts'].style.display = 'none';
  };
  /* display the results element: */
  results_el.style.display =
    site_vars['div_results_display'];
  /* scroll to search results: */
  results_count_el.scrollIntoView();
};

/* function to filter unique values from array: */
function get_unique(value, index, array) {
  return array.indexOf(value) === index;
}

/* function to fetch list of files: */
async function search_files() {
  /* get frame id input elements: */
  var input_frame_id_els = document.getElementsByClassName('input_frame_id');
  /* get frame ids: */
  var input_frame_ids = [];
  for (var i = 0; i < input_frame_id_els.length; i++) {
    input_frame_ids.push(input_frame_id_els[i].value);
  };
  /* get unique frame ids: */
  input_frame_ids = input_frame_ids.filter(get_unique);
  /* list for storing all frame info: */
  var frames_info = [];
  /* search for data for each frame id: */
  for (var i = 0; i < input_frame_ids.length; i++) {
    /* current frame id: */
    var selected_frame_id = input_frame_ids[i];
    /* get frame info: */
    frames_info.push(await get_frame_info(selected_frame_id));
  };
  /* search using retrieved frame info: */
  var search_results = search_frames_info(frames_info);
  /* stpre the results: */
  site_vars['search_results'] = search_results;
  /* display the results: */
  display_search_results();
};

/* function to return a python script to download found files: */
async function get_script_python() {
  /* get script template using fetch: */
  var python_template_req = await fetch(site_vars['python_script_template']);
  var python_template = await python_template_req.text();
  /* init text for list of files: */
  var file_text = '';
  /* results file types: */
  var results_types = ['metadata', 'epochs', 'ifgs'];
  /* results for all frames: */
  var frames_results = site_vars['search_results']['frames'];
  /* total file count: */
  var total_file_count = site_vars['search_results']['total_count'];
  /* file count: */
  var file_count = 0;
  /* loop throuhg frames: */
  for (var i = 0; i < frames_results.length; i++) {
    /* results for this frame: */
    var frame_results = frames_results[i];
    /* loop through types: */
    for (var j = 0; j < results_types.length; j++) {
      /* this file type: */
      var results_type = results_types[j];
      /* results for this file type: */
      var results_files = frame_results[results_type];
      /* loop through search results: */
      for (var k = 0; k < results_files.length; k++) {
          /* increment file count: */
          file_count += 1;
          /* details for this file: */
          var file_name = results_files[k]['name'];
          var file_path = results_files[k]['path'];
          var file_url = results_files[k]['url'];
          var file_size = results_files[k]['size'];
          /* commands to make output directory and python file: */
          file_text += '    {\'name\': \'' + file_name + '\', \'path\': \'' +
                       file_path + '\', \'url\': \'' + file_url +
                       '\', \'size\': ' + file_size + '}';
          if (file_count < total_file_count) {
            file_text += ',\n';
          };
      };
    };
  };
  /* search and replace file list in template: */
  var script_text = python_template.replace('{{ FILES }}', file_text);
  /* script text header: */
  var script_text_header = 'data:text/plain;charset=utf-8,';
  /* encode text data: */
  var encoded_uri = script_text_header + encodeURIComponent(script_text);
  /* name for text file: */
  var text_name = 'get_licsar_files.py';
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
async function get_script_wget() {
  /* get script template using fetch: */
  var wget_template_req = await fetch(site_vars['wget_script_template']);
  var wget_template = await wget_template_req.text();
  /* init text for list of files: */
  var file_text = '';
  /* results file types: */
  var results_types = ['metadata', 'epochs', 'ifgs'];
  /* results for all frames: */
  var frames_results = site_vars['search_results']['frames'];
  /* loop throuhg frames: */
  for (var i = 0; i < frames_results.length; i++) {
    /* results for this frame: */
    var frame_results = frames_results[i];
    /* loop through types: */
    for (var j = 0; j < results_types.length; j++) {
      /* this file type: */
      var results_type = results_types[j];
      /* results for this file type: */
      var results_files = frame_results[results_type];
      /* loop through search results: */
      for (var k = 0; k < results_files.length; k++) {
          /* details for this file: */
          var file_name = results_files[k]['name'];
          var file_path = results_files[k]['path'];
          var file_url = results_files[k]['url'];
          /* commands to make output directory and wget file: */
          file_text += 'mkdir -p "${OUT_DIR}/' + file_path + '"\n';
          file_text += 'wget ${WGET_OPTIONS} -P \'' + file_path +
                       '\' \'' + file_url + '\'\n';
      };
    };
  };
  /* search and replace file list in template: */
  var script_text = wget_template.replace('{{ FILES }}', file_text);
  /* script text header: */
  var script_text_header = 'data:text/plain;charset=utf-8,';
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
async function get_script_curl() {
  /* get script template using fetch: */
  var curl_template_req = await fetch(site_vars['curl_script_template']);
  var curl_template = await curl_template_req.text();
  /* init text for list of files: */
  var file_text = '';
  /* results file types: */
  var results_types = ['metadata', 'epochs', 'ifgs'];
  /* results for all frames: */
  var frames_results = site_vars['search_results']['frames'];
  /* loop throuhg frames: */
  for (var i = 0; i < frames_results.length; i++) {
    /* results for this frame: */
    var frame_results = frames_results[i];
    /* loop through types: */
    for (var j = 0; j < results_types.length; j++) {
      /* this file type: */
      var results_type = results_types[j];
      /* results for this file type: */
      var results_files = frame_results[results_type];
      /* loop through search results: */
      for (var k = 0; k < results_files.length; k++) {
          /* details for this file: */
          var file_name = results_files[k]['name'];
          var file_path = results_files[k]['path'];
          var file_url = results_files[k]['url'];
          /* commands to make output directory and curl file: */
          file_text += 'mkdir -p "${OUT_DIR}/' + file_path + '"\n';
          file_text += 'curl ${CURL_OPTIONS} -o \'' + file_path + '/' +
                       file_name + '\' \'' + file_url + '\'\n';
      };
    };
  };
  /* search and replace file list in template: */
  var script_text = curl_template.replace('{{ FILES }}', file_text);
  /* script text header: */
  var script_text_header = 'data:text/plain;charset=utf-8,';
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

/* add frame input element: */
function add_frame_input() {
  /* frame inputs container: */
  var frames_inputs = site_vars['frames_inputs'];
  /* remove and add frame button elements: */
  var remove_frame = site_vars['remove_frame'];
  var add_frame = site_vars['add_frame'];
  /* get existing frame elements and count: */
  var frames_els = document.getElementsByClassName(
    'input_frame_id'
  );
  var frame_count = frames_els.length;
  /* new element number / id: */
  var new_frame = frame_count + 1;
  /* add the new element: */
  var frame_input = document.createElement('input');
  frame_input.id = 'input_frame_id' + new_frame;
  frame_input.classList = 'input_frame_id';
  frame_input.type = 'text';
  frame_input.name = 'frame+id' + new_frame;
  frame_input.setAttribute('list', 'datalist_frame_id');
  frame_input.maxLength = 17;
  frame_input.value = '';
  frames_inputs.insertBefore(frame_input, remove_frame);
  /* enable remove button: */
  remove_frame.style.display = 'inline';
  /* focus the new element: */
  frame_input.focus();
  frame_input.select();
  /* remove add button if we get to 10 inputs: */
  if (frame_count > 8) {
    add_frame.style.display = 'none';
  };
};

/* remove frame input element: */
function remove_frame_input() {
  /* frame inputs container: */
  var frames_inputs = site_vars['frames_inputs'];
  /* remove and add frame button elements: */
  var remove_frame = site_vars['remove_frame'];
  var add_frame = site_vars['add_frame'];
  /* get existing frame elements and count: */
  var frames_els = document.getElementsByClassName(
    'input_frame_id'
  );
  var frame_count = frames_els.length;
  /* get the final input element: */
  var frame_input = document.getElementById('input_frame_id' + frame_count);
  /* remove the element: */
  frame_input.parentNode.removeChild(frame_input);
  /* disable remove button, if only one input left: */
  if (frame_count < 3) {
    remove_frame.style.display = 'none';
  };
  /* enable add button if less than 10 inputs: */
  if (frame_count < 11) {
    add_frame.style.display = 'inline';
  };
};

/** add listeners: **/

/* add input listeners: */
function add_listeners() {
  /* remove and add frame button elements: */
  var remove_frame = site_vars['remove_frame'];
  var add_frame = site_vars['add_frame'];
  /* add listeners for frame add and remove buttons: */
  add_frame.addEventListener('click', add_frame_input);
  remove_frame.addEventListener('click', remove_frame_input);
};

/* on page load: */
window.addEventListener('load', function() {
  /* set up page: */
  page_setup();
  /* load frames: */
  load_frames();
  /* add listeners to various elements: */
  add_listeners();
});
