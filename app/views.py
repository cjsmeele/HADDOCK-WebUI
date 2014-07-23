from flask import render_template
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
            return data
    else:
        return data

def render_form_template(model, accesslevels, user_accesslevel):
    return render_template(
        'form.html',
        title='HADDOCK Form',
        accesslevels=accesslevels,
        accesslevel_index=0,
        model=model,
        user_accesslevel_index=2
    )

# Caching is optional. We need the second function definition when cache is not defined.
if app.config['CACHE_HTML']:
    @cache.memoize()
    def render_form(model, accesslevels, user_accesslevel):
        return render_form_template(model, accesslevels, user_accesslevel)
else:
    def render_form(model, accesslevels, user_accesslevel):
        return render_form_template(model, accesslevels, user_accesslevel)


@app.route('/')
def index():
    accesslevels = get_cached_json(
        'accesslevels',
        app.config['FRONTEND_ACCESSLEVEL_FILE'],
        app.config['CACHE_ACCESSLEVELS'],
    )
    return render_template("index.html", accesslevels=accesslevels)

@app.route('/form')
def form():
    accesslevels = get_cached_json(
        'accesslevels',
        app.config['FRONTEND_ACCESSLEVEL_FILE'],
        app.config['CACHE_ACCESSLEVELS'],
    )
    model = get_cached_json(
        'model',
        app.config['FRONTEND_MODEL_FILE'],
        app.config['CACHE_MODEL'],
    )

    if accesslevels is None or model is None:
        raise ModelFormatError('Could not load model description and/or access levels')

    # TODO: Get user access level through auth
    return render_form(model, accesslevels, 2)
