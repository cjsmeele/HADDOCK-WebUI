# Common form related functions.

from app import app, cache
import os.path
import json


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

class ModelFormatError(Exception):
    pass

class Model(object):
    def __init__(self, model_data, model_mtime, accesslevel_data, al_mtime):
        self.model_data       = model_data
        self.model_mtime      = model_mtime
        self.accesslevel_data = accesslevel_data
        self.al_mtime         = al_mtime

    @staticmethod
    def make():
        accesslevel_data, al_mtime = get_cached_json(
            'accesslevels',
            app.config['ACCESSLEVEL_FILE'],
            app.config['CACHE_ACCESSLEVELS'],
        )
        model_data, model_mtime = get_cached_json(
            'model',
            app.config['MODEL_FILE'],
            app.config['CACHE_MODEL'],
        )

        if accesslevel_data is None or model_data is None:
            raise ModelFormatError('Could not load model description and/or access levels')

        return Model(model_data, model_mtime, accesslevel_data, al_mtime)

    def get_version_tag(self):
        return 'v' + str(int(self.al_mtime)) + '-' + str(int(self.model_mtime));
