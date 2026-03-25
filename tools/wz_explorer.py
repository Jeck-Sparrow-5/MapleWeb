#!/usr/bin/env python3
"""
WZ Explorer - A web-based viewer for MapleStory WZ JSON data files.
Run: python3 tools/wz_explorer.py
Then open http://localhost:5555
"""

import json
import os
from pathlib import Path
from flask import Flask, jsonify, request, Response

app = Flask(__name__)

WZ_ROOT = os.path.join(os.path.dirname(__file__), '..', 'TypeScript-Client', 'public', 'wz_client')
WZ_ROOT = os.path.abspath(WZ_ROOT)

# Cache string lookups for names
_string_cache = {}

def load_string_names(category):
    """Load name mappings from String.wz for a category (Mob, Npc, Map, Eqp, etc.)"""
    if category in _string_cache:
        return _string_cache[category]

    path = os.path.join(WZ_ROOT, 'String.wz', f'{category}.img.json')
    if not os.path.exists(path):
        _string_cache[category] = {}
        return {}

    with open(path, 'r') as f:
        data = json.load(f)

    names = {}
    for node in data.get('$$', []):
        node_id = node.get('$imgdir', '')
        for child in node.get('$$', []):
            if child.get('$string') == 'name':
                names[node_id] = child['value']
                break

    _string_cache[category] = names
    return names


def load_eqp_names():
    """Load equipment names from String.wz/Eqp.img.json (nested structure)."""
    if 'Eqp' in _string_cache:
        return _string_cache['Eqp']

    path = os.path.join(WZ_ROOT, 'String.wz', 'Eqp.img.json')
    if not os.path.exists(path):
        _string_cache['Eqp'] = {}
        return {}

    with open(path, 'r') as f:
        data = json.load(f)

    names = {}
    # Eqp has categories like Eqp/Cap, Eqp/Coat, etc.
    for category_node in data.get('$$', []):
        for sub_node in category_node.get('$$', []):
            for item_node in sub_node.get('$$', []):
                item_id = item_node.get('$imgdir', '')
                for child in item_node.get('$$', []):
                    if child.get('$string') == 'name':
                        names[item_id] = child['value']
                        break

    _string_cache['Eqp'] = names
    return names


def parse_wz_node(node):
    """Convert a WZ JSON node into a cleaner tree structure for the frontend."""
    result = {}

    if isinstance(node, dict):
        # Check what type of node this is
        if '$canvas' in node:
            result['_type'] = 'canvas'
            result['_name'] = node['$canvas']
            result['_width'] = node.get('width', '0')
            result['_height'] = node.get('height', '0')
            result['_base64'] = node.get('basedata', '')
            # Parse child properties
            for child in node.get('$$', []):
                parsed = parse_wz_node(child)
                result.update(parsed)
        elif '$imgdir' in node:
            name = node['$imgdir']
            children = {}
            for child in node.get('$$', []):
                parsed = parse_wz_node(child)
                children.update(parsed)
            result[name] = children
        elif '$int' in node:
            result[node['$int']] = int(node.get('value', 0))
        elif '$short' in node:
            result[node['$short']] = int(node.get('value', 0))
        elif '$float' in node:
            result[node['$float']] = float(node.get('value', 0))
        elif '$string' in node:
            result[node['$string']] = node.get('value', '')
        elif '$vector' in node:
            result[node['$vector']] = {'x': int(node.get('x', 0)), 'y': int(node.get('y', 0))}
        elif '$uol' in node:
            result[node['$uol']] = {'_type': 'uol', 'path': node.get('value', '')}
        else:
            # Generic dict
            for k, v in node.items():
                if k not in ('$$',):
                    result[k] = v
            for child in node.get('$$', []):
                parsed = parse_wz_node(child)
                result.update(parsed)

    return result


@app.route('/')
def index():
    return HTML_PAGE


@app.route('/api/tree')
def get_tree():
    """Return the directory tree of WZ files."""
    tree = []
    for wz_dir in sorted(os.listdir(WZ_ROOT)):
        wz_path = os.path.join(WZ_ROOT, wz_dir)
        if not os.path.isdir(wz_path):
            continue

        entry = {'name': wz_dir, 'children': []}

        for root, dirs, files in sorted(os.walk(wz_path)):
            rel = os.path.relpath(root, wz_path)
            json_files = sorted([f for f in files if f.endswith('.json')])

            if rel == '.':
                entry['children'] = [{'name': f, 'path': f'{wz_dir}/{f}'} for f in json_files]
                # Add subdirectories
                for d in sorted(dirs):
                    sub_files = []
                    sub_path = os.path.join(root, d)
                    for sf in sorted(os.listdir(sub_path)):
                        if sf.endswith('.json'):
                            sub_files.append({'name': sf, 'path': f'{wz_dir}/{d}/{sf}'})
                    if sub_files:
                        entry['children'].append({'name': d, 'children': sub_files})
                break

        tree.append(entry)
    return jsonify(tree)


@app.route('/api/file')
def get_file():
    """Return parsed contents of a WZ JSON file."""
    file_path = request.args.get('path', '')
    if not file_path or '..' in file_path:
        return jsonify({'error': 'Invalid path'}), 400

    full_path = os.path.join(WZ_ROOT, file_path)
    if not os.path.exists(full_path):
        return jsonify({'error': 'File not found'}), 404

    with open(full_path, 'r') as f:
        data = json.load(f)

    parsed = parse_wz_node(data)
    return jsonify(parsed)


@app.route('/api/file/raw')
def get_file_raw():
    """Return raw JSON contents of a WZ file."""
    file_path = request.args.get('path', '')
    if not file_path or '..' in file_path:
        return jsonify({'error': 'Invalid path'}), 400

    full_path = os.path.join(WZ_ROOT, file_path)
    if not os.path.exists(full_path):
        return jsonify({'error': 'File not found'}), 404

    with open(full_path, 'r') as f:
        data = json.load(f)

    return jsonify(data)


@app.route('/api/search')
def search():
    """Search for items/mobs/npcs by name or ID."""
    query = request.args.get('q', '').lower().strip()
    category = request.args.get('cat', 'all')
    if not query:
        return jsonify([])

    results = []

    categories = {
        'Mob': 'Mob',
        'Npc': 'Npc',
        'Consume': 'Consume',
        'Etc': 'Etc',
        'Cash': 'Cash',
        'Map': 'Map',
    }

    for cat_name, string_key in categories.items():
        if category != 'all' and category != cat_name:
            continue
        names = load_string_names(string_key)
        for item_id, name in names.items():
            if query in name.lower() or query in item_id:
                results.append({
                    'id': item_id,
                    'name': name,
                    'category': cat_name,
                })

    # Equipment
    if category in ('all', 'Eqp'):
        eqp_names = load_eqp_names()
        for item_id, name in eqp_names.items():
            if query in name.lower() or query in item_id:
                results.append({
                    'id': item_id,
                    'name': name,
                    'category': 'Eqp',
                })

    results.sort(key=lambda x: x['name'])
    return jsonify(results[:100])


@app.route('/api/sprites')
def get_sprites():
    """Get all canvas/sprite images from a WZ JSON file."""
    file_path = request.args.get('path', '')
    if not file_path or '..' in file_path:
        return jsonify({'error': 'Invalid path'}), 400

    full_path = os.path.join(WZ_ROOT, file_path)
    if not os.path.exists(full_path):
        return jsonify({'error': 'File not found'}), 404

    with open(full_path, 'r') as f:
        data = json.load(f)

    sprites = []
    _extract_sprites(data, '', sprites)
    return jsonify(sprites)


def _extract_sprites(node, path, sprites):
    """Recursively extract all canvas nodes."""
    if isinstance(node, dict):
        if '$canvas' in node:
            sprites.append({
                'path': f"{path}/{node['$canvas']}" if path else node['$canvas'],
                'name': node['$canvas'],
                'width': int(node.get('width', 0)),
                'height': int(node.get('height', 0)),
                'base64': node.get('basedata', ''),
            })

        name = node.get('$imgdir', '')
        child_path = f"{path}/{name}" if path and name else (path or name)

        for child in node.get('$$', []):
            _extract_sprites(child, child_path, sprites)
    elif isinstance(node, list):
        for item in node:
            _extract_sprites(item, path, sprites)


HTML_PAGE = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>WZ Explorer</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: #1a1a2e;
  color: #e0e0e0;
  display: flex;
  height: 100vh;
  overflow: hidden;
}
#sidebar {
  width: 300px;
  background: #16213e;
  border-right: 1px solid #0f3460;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
#search-box {
  padding: 10px;
  background: #0f3460;
}
#search-box input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #533483;
  border-radius: 6px;
  background: #1a1a2e;
  color: #e0e0e0;
  font-size: 14px;
  outline: none;
}
#search-box input:focus { border-color: #e94560; }
#search-box select {
  width: 100%;
  margin-top: 6px;
  padding: 6px;
  border: 1px solid #533483;
  border-radius: 6px;
  background: #1a1a2e;
  color: #e0e0e0;
  font-size: 13px;
}
#tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}
#tree::-webkit-scrollbar { width: 6px; }
#tree::-webkit-scrollbar-thumb { background: #533483; border-radius: 3px; }
.tree-folder { cursor: pointer; padding: 3px 0; }
.tree-folder > .folder-label {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 13px;
  color: #e94560;
}
.tree-folder > .folder-label:hover { background: rgba(233,69,96,0.1); }
.tree-folder > .folder-label::before { content: '\\25B6'; margin-right: 6px; font-size: 10px; transition: transform 0.15s; }
.tree-folder.open > .folder-label::before { transform: rotate(90deg); }
.tree-children { display: none; padding-left: 16px; }
.tree-folder.open > .tree-children { display: block; }
.tree-file {
  padding: 3px 8px 3px 24px;
  cursor: pointer;
  font-size: 13px;
  border-radius: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #a0a0c0;
}
.tree-file:hover { background: rgba(83,52,131,0.3); color: #e0e0e0; }
.tree-file.active { background: #533483; color: #fff; }

#main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
#toolbar {
  padding: 10px 16px;
  background: #16213e;
  border-bottom: 1px solid #0f3460;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}
#toolbar .path { color: #e94560; font-weight: 600; flex: 1; }
#toolbar button {
  padding: 6px 14px;
  border: 1px solid #533483;
  border-radius: 6px;
  background: #1a1a2e;
  color: #e0e0e0;
  cursor: pointer;
  font-size: 13px;
}
#toolbar button:hover { background: #533483; }
#toolbar button.active { background: #e94560; border-color: #e94560; }

#content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
#content::-webkit-scrollbar { width: 6px; }
#content::-webkit-scrollbar-thumb { background: #533483; border-radius: 3px; }

/* Search results */
.search-result {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 4px;
  border-radius: 6px;
  cursor: pointer;
  background: #16213e;
  border: 1px solid transparent;
}
.search-result:hover { border-color: #533483; }
.search-result .sr-id { color: #e94560; font-family: monospace; font-size: 13px; min-width: 80px; }
.search-result .sr-name { flex: 1; font-size: 14px; }
.search-result .sr-cat {
  font-size: 11px; padding: 2px 8px; border-radius: 10px;
  background: #533483; color: #e0e0e0;
}

/* Sprite grid */
.sprite-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.sprite-card {
  background: #16213e;
  border: 1px solid #0f3460;
  border-radius: 8px;
  padding: 8px;
  text-align: center;
  min-width: 100px;
  max-width: 200px;
}
.sprite-card img {
  image-rendering: pixelated;
  max-width: 180px;
  max-height: 180px;
  background: repeating-conic-gradient(#2a2a4a 0% 25%, #1a1a2e 0% 50%) 50% / 12px 12px;
  border-radius: 4px;
}
.sprite-card .sprite-info {
  margin-top: 6px;
  font-size: 11px;
  color: #a0a0c0;
  word-break: break-all;
}

/* Data tree */
.data-tree { font-family: 'Cascadia Code', 'Fira Code', monospace; font-size: 13px; }
.dt-key { color: #e94560; }
.dt-val { color: #a0d995; }
.dt-val.num { color: #6ec6ff; }
.dt-node {
  padding-left: 20px;
  border-left: 1px solid #0f3460;
  margin-left: 4px;
}
.dt-toggle {
  cursor: pointer;
  padding: 2px 0;
  display: flex;
  align-items: center;
}
.dt-toggle:hover { background: rgba(233,69,96,0.05); }
.dt-toggle::before { content: '\\25B6'; margin-right: 6px; font-size: 9px; color: #533483; transition: transform 0.15s; }
.dt-toggle.open::before { transform: rotate(90deg); }
.dt-leaf { padding: 2px 0 2px 20px; }
.dt-canvas-preview {
  display: inline-block;
  margin-left: 8px;
  vertical-align: middle;
}
.dt-canvas-preview img {
  image-rendering: pixelated;
  max-height: 40px;
  background: repeating-conic-gradient(#2a2a4a 0% 25%, #1a1a2e 0% 50%) 50% / 8px 8px;
  border-radius: 3px;
  vertical-align: middle;
}

/* Breadcrumb */
.breadcrumb {
  display: flex; align-items: center; gap: 4px;
  margin-bottom: 12px; font-size: 13px;
}
.breadcrumb span { color: #533483; }
.breadcrumb a { color: #6ec6ff; cursor: pointer; text-decoration: none; }
.breadcrumb a:hover { text-decoration: underline; }
</style>
</head>
<body>

<div id="sidebar">
  <div id="search-box">
    <input type="text" id="search-input" placeholder="Search by name or ID..." />
    <select id="search-category">
      <option value="all">All Categories</option>
      <option value="Mob">Mobs</option>
      <option value="Npc">NPCs</option>
      <option value="Eqp">Equipment</option>
      <option value="Consume">Consumables</option>
      <option value="Etc">Etc Items</option>
      <option value="Cash">Cash Items</option>
      <option value="Map">Maps</option>
    </select>
  </div>
  <div id="tree"></div>
</div>

<div id="main">
  <div id="toolbar">
    <span class="path" id="current-path">Select a file to explore</span>
    <button id="btn-sprites" onclick="toggleView('sprites')">Sprites</button>
    <button id="btn-data" class="active" onclick="toggleView('data')">Data</button>
    <button id="btn-raw" onclick="toggleView('raw')">Raw JSON</button>
  </div>
  <div id="content">
    <div style="text-align:center;padding:60px;color:#533483;">
      <h2>WZ Explorer</h2>
      <p style="margin-top:12px;color:#a0a0c0;">Browse the file tree or search for items, mobs, NPCs, and more.</p>
    </div>
  </div>
</div>

<script>
let currentView = 'data';
let currentFilePath = '';
let currentFileData = null;
let searchTimeout = null;

// Load tree
async function loadTree() {
  const res = await fetch('/api/tree');
  const tree = await res.json();
  const el = document.getElementById('tree');
  el.innerHTML = '';
  tree.forEach(wz => {
    el.appendChild(createTreeFolder(wz));
  });
}

function createTreeFolder(node) {
  const div = document.createElement('div');
  div.className = 'tree-folder';

  const label = document.createElement('div');
  label.className = 'folder-label';
  label.textContent = node.name;
  label.onclick = (e) => {
    e.stopPropagation();
    div.classList.toggle('open');
  };
  div.appendChild(label);

  const children = document.createElement('div');
  children.className = 'tree-children';

  (node.children || []).forEach(child => {
    if (child.children) {
      children.appendChild(createTreeFolder(child));
    } else {
      const fileDiv = document.createElement('div');
      fileDiv.className = 'tree-file';
      fileDiv.textContent = child.name;
      fileDiv.title = child.path;
      fileDiv.onclick = () => loadFile(child.path);
      children.appendChild(fileDiv);
    }
  });

  div.appendChild(children);
  return div;
}

async function loadFile(path) {
  currentFilePath = path;
  document.getElementById('current-path').textContent = path;

  // Highlight active file
  document.querySelectorAll('.tree-file').forEach(f => f.classList.remove('active'));
  document.querySelectorAll('.tree-file').forEach(f => {
    if (f.title === path) f.classList.add('active');
  });

  if (currentView === 'sprites') {
    await loadSprites(path);
  } else if (currentView === 'raw') {
    await loadRaw(path);
  } else {
    await loadData(path);
  }
}

async function loadData(path) {
  const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
  currentFileData = await res.json();
  renderDataTree(currentFileData);
}

async function loadSprites(path) {
  const res = await fetch(`/api/sprites?path=${encodeURIComponent(path)}`);
  const sprites = await res.json();
  const content = document.getElementById('content');

  if (sprites.length === 0) {
    content.innerHTML = '<p style="color:#a0a0c0;padding:20px;">No sprites found in this file.</p>';
    return;
  }

  let html = `<p style="margin-bottom:12px;color:#a0a0c0;">${sprites.length} sprites found</p><div class="sprite-grid">`;
  sprites.forEach(s => {
    if (s.base64) {
      html += `<div class="sprite-card">
        <img src="data:image/png;base64,${s.base64}" alt="${s.path}" />
        <div class="sprite-info">${s.path}<br>${s.width}x${s.height}</div>
      </div>`;
    }
  });
  html += '</div>';
  content.innerHTML = html;
}

async function loadRaw(path) {
  const res = await fetch(`/api/file/raw?path=${encodeURIComponent(path)}`);
  const data = await res.json();
  const content = document.getElementById('content');
  content.innerHTML = `<pre style="font-size:12px;color:#a0d995;white-space:pre-wrap;word-break:break-all;">${JSON.stringify(data, null, 2).replace(/</g, '&lt;')}</pre>`;
}

function renderDataTree(data) {
  const content = document.getElementById('content');
  content.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'data-tree';
  buildDataTree(container, data, '', 0);
  content.appendChild(container);
}

function buildDataTree(parent, obj, prefix, depth) {
  if (obj === null || obj === undefined) return;

  if (typeof obj !== 'object') {
    const leaf = document.createElement('div');
    leaf.className = 'dt-leaf';
    const isNum = typeof obj === 'number';
    leaf.innerHTML = `<span class="dt-val ${isNum ? 'num' : ''}">${String(obj).replace(/</g, '&lt;')}</span>`;
    parent.appendChild(leaf);
    return;
  }

  const entries = Object.entries(obj);
  entries.forEach(([key, val]) => {
    if (key.startsWith('_')) {
      // Special internal keys
      if (key === '_base64' && val) {
        const leaf = document.createElement('div');
        leaf.className = 'dt-leaf';
        leaf.innerHTML = `<span class="dt-key">image</span>: <span class="dt-canvas-preview"><img src="data:image/png;base64,${val}" /></span>`;
        parent.appendChild(leaf);
        return;
      }
      if (key === '_type' || key === '_name') return;
      const leaf = document.createElement('div');
      leaf.className = 'dt-leaf';
      leaf.innerHTML = `<span class="dt-key">${key.slice(1)}</span>: <span class="dt-val">${String(val).replace(/</g, '&lt;')}</span>`;
      parent.appendChild(leaf);
      return;
    }

    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      const childKeys = Object.keys(val);
      const hasSubObjects = childKeys.some(k => val[k] !== null && typeof val[k] === 'object');

      if (!hasSubObjects && childKeys.length <= 3 && !childKeys.some(k => k === '_base64')) {
        // Inline small objects
        const leaf = document.createElement('div');
        leaf.className = 'dt-leaf';
        const parts = childKeys.filter(k => !k.startsWith('_')).map(k => {
          const v = val[k];
          const isNum = typeof v === 'number';
          return `<span class="dt-key">${k}</span>: <span class="dt-val ${isNum ? 'num' : ''}">${String(v).replace(/</g, '&lt;')}</span>`;
        });

        // Check for canvas preview
        if (val._base64) {
          leaf.innerHTML = `<span class="dt-key">${key}</span> {${parts.join(', ')}} <span class="dt-canvas-preview"><img src="data:image/png;base64,${val._base64}" /></span>`;
        } else {
          leaf.innerHTML = `<span class="dt-key">${key}</span>: {${parts.join(', ')}}`;
        }
        parent.appendChild(leaf);
        return;
      }

      // Collapsible node
      const toggle = document.createElement('div');
      toggle.className = 'dt-toggle';
      const childCount = childKeys.filter(k => !k.startsWith('_')).length;
      let label = `<span class="dt-key">${key}</span> <span style="color:#533483;margin-left:6px;">(${childCount})</span>`;

      // Show canvas preview inline if present
      if (val._base64) {
        label += ` <span class="dt-canvas-preview"><img src="data:image/png;base64,${val._base64}" /></span>`;
      }
      toggle.innerHTML = label;

      const childContainer = document.createElement('div');
      childContainer.className = 'dt-node';
      childContainer.style.display = 'none';

      toggle.onclick = () => {
        const isOpen = toggle.classList.toggle('open');
        childContainer.style.display = isOpen ? 'block' : 'none';
        if (isOpen && childContainer.children.length === 0) {
          buildDataTree(childContainer, val, key, depth + 1);
        }
      };

      // Auto-expand first 2 levels
      if (depth < 1) {
        toggle.classList.add('open');
        childContainer.style.display = 'block';
        buildDataTree(childContainer, val, key, depth + 1);
      }

      parent.appendChild(toggle);
      parent.appendChild(childContainer);
    } else {
      const leaf = document.createElement('div');
      leaf.className = 'dt-leaf';
      const isNum = typeof val === 'number';
      leaf.innerHTML = `<span class="dt-key">${key}</span>: <span class="dt-val ${isNum ? 'num' : ''}">${String(val).replace(/</g, '&lt;')}</span>`;
      parent.appendChild(leaf);
    }
  });
}

function toggleView(view) {
  currentView = view;
  document.querySelectorAll('#toolbar button').forEach(b => b.classList.remove('active'));
  document.getElementById(`btn-${view}`).classList.add('active');
  if (currentFilePath) loadFile(currentFilePath);
}

// Search
const searchInput = document.getElementById('search-input');
const searchCategory = document.getElementById('search-category');

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(doSearch, 300);
});
searchCategory.addEventListener('change', doSearch);

async function doSearch() {
  const q = searchInput.value.trim();
  if (!q) {
    loadTree();
    return;
  }

  const cat = searchCategory.value;
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&cat=${cat}`);
  const results = await res.json();

  const tree = document.getElementById('tree');
  if (results.length === 0) {
    tree.innerHTML = '<p style="padding:16px;color:#a0a0c0;">No results found.</p>';
    return;
  }

  tree.innerHTML = '';
  results.forEach(r => {
    const div = document.createElement('div');
    div.className = 'search-result';
    div.innerHTML = `<span class="sr-id">${r.id}</span><span class="sr-name">${r.name}</span><span class="sr-cat">${r.category}</span>`;
    div.onclick = () => {
      // Try to find and open the corresponding file
      const filePath = resolveFilePath(r.id, r.category);
      if (filePath) loadFile(filePath);
    };
    tree.appendChild(div);
  });
}

function resolveFilePath(id, category) {
  // Build the expected file path based on category and ID
  const paddedId = id.padStart(7, '0');

  switch (category) {
    case 'Mob':
      return `Mob.wz/${paddedId}.img.json`;
    case 'Npc':
      return `Npc.wz/${paddedId}.img.json`;
    case 'Map': {
      // Maps are in Map.wz/Map/MapX/XXXXXXXXX.img.json
      const mapArea = Math.floor(parseInt(id) / 100000000);
      return `Map.wz/Map/Map${mapArea}/${id.padStart(9, '0')}.img.json`;
    }
    default:
      return null;
  }
}

// Init
loadTree();
</script>
</body>
</html>
'''

if __name__ == '__main__':
    print(f"WZ data root: {WZ_ROOT}")
    print(f"Starting WZ Explorer at http://localhost:5555")
    app.run(host='0.0.0.0', port=5555, debug=False)
