from flask import request, jsonify, render_template
from app import app, cache

import os.path
import json
import logging

class ModelFormatError(Exception):
    pass

class RequestError(Exception):
    pass


def get_cached_json(key, filename, cache_condition=True, force_renew=False, auto_retry=True):
    """\
    Cache a JSON object stored in a file, and only reload it when the file has
    changed or an update is forced.

    If cache_condition is given, it will be checked before trying to access or
    store data in the cache. This can be used to force an object to always be
    loaded from a file, for example on systems where Flask-Cache is not installed.

    force_renew does almost the same, but does not prevent the object from
    being stored in the cache.

    auto_retry was added in an attempt to fix a bug that seemed to destroy cached
    JSON data. When retrieved cache data is None, get_cached_json will force a
    refresh once and continue.
    """
    if not hasattr(get_cached_json, 'lastmtimes'):
        get_cached_json.lastmtimes = {}

    if key not in get_cached_json.lastmtimes:
        get_cached_json.lastmtimes[key] = 0

    newmtime = os.path.getmtime(filename)

    # Caching is disabled or the file has changed, reload it
    if force_renew or newmtime > get_cached_json.lastmtimes[key] or not cache_condition:
        get_cached_json.lastmtimes[key] = newmtime
        data = json.load(file(filename))
        if cache_condition:
            cache.set(key, data)

    if cache_condition:
        data = cache.get(key)
        # If this cache object becomes invalid somehow...
        if data is None and auto_retry:
            return get_cached_json(key, filename, cache_condition, True, False)
        else:
            return data, newmtime
    else:
        return data, newmtime

def generateVersionTag(al_mtime, model_mtime):
    return 'v' + str(int(al_mtime)) + '-' + str(int(model_mtime));


def render_form_template(model, accesslevels, user_accesslevel, al_mtime, model_mtime):
    return render_template(
        'form.html',
        title                  = 'HADDOCK Form',
        accesslevels           = accesslevels,
        accesslevel_index      = 0,
        model                  = model,
        user_accesslevel_index = 2,
        al_mtime               = al_mtime,
        model_mtime            = model_mtime,
        version_tag            = generateVersionTag(al_mtime, model_mtime),
    )

# Caching is optional. We need the second function definition when cache is not defined.
if app.config['CACHE_HTML']:
    @cache.memoize()
    def render_form(model, accesslevels, user_accesslevel, al_mtime, model_mtime):
        return render_form_template(model, accesslevels, user_accesslevel, al_mtime, model_mtime)
else:
    def render_form(model, accesslevels, user_accesslevel, al_mtime, model_mtime):
        return render_form_template(model, accesslevels, user_accesslevel, al_mtime, model_mtime)


@app.route('/')
def index():
    accesslevels = get_cached_json(
        'accesslevels',
        app.config['FRONTEND_ACCESSLEVEL_FILE'],
        app.config['CACHE_ACCESSLEVELS'],
    )
    return render_template("index.html", accesslevels=accesslevels)

@app.route('/form', methods=['GET', 'POST'])
def form():
    accesslevels, al_mtime = get_cached_json(
        'accesslevels',
        app.config['FRONTEND_ACCESSLEVEL_FILE'],
        app.config['CACHE_ACCESSLEVELS'],
    )
    model, model_mtime = get_cached_json(
        'model',
        app.config['FRONTEND_MODEL_FILE'],
        app.config['CACHE_MODEL'],
    )

    if accesslevels is None or model is None:
        raise ModelFormatError('Could not load model description and/or access levels')

    if request.method == 'GET':
        # TODO: Get user access level through auth
        return render_form(model, accesslevels, 2, al_mtime, model_mtime)

    elif request.method == 'POST':
        if 'json' in request.form:
            jsonForm = request.form['json']
            try:
                data = json.loads(request.form['json'])
            except ValueError:
                return jsonify(success=False, message='Invalid POST format (no valid JSON)')

            print(json.dumps(data,
                sort_keys=True,
                indent=(4),
            ))

            try:
                if data['form_version'] != generateVersionTag(al_mtime, model_mtime):
                    return jsonify(success=False, message='The data model has changed since you loaded this form, please reload and try again.')

                accesslevel_names = [ level['name'] for level in accesslevels ]

                if data['level'] not in accesslevel_names or accesslevel_names.index(data['level']) > 999: # TODO: <-- user access level index
                    return jsonify(success=False, message='The selected form level is too high, please request a higher access level or select a different level above.')
            except KeyError:
                return jsonify(success=False, message='Submitted form data is incomplete.')

            # TODO: Save uploaded files
            # TODO: Call jsontocns.py

            return jsonify(success=False, message='Unimplemented.')
        else:
            return jsonify(success=False, message='Invalid POST format.')
