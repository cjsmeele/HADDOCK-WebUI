from flask import render_template
from app import app, cache

import os.path
import json
import logging

class ModelFormatError(Exception):
    pass

class RequestError(Exception):
    pass


# TODO: This function should be generalized
def get_accesslevels():
    if not hasattr(get_accesslevels, 'lastmtime'):
        get_accesslevels.lastmtime = 0

    newmtime = os.path.getmtime(app.config['FRONTEND_ACCESSLEVEL_FILE'])

    # Caching is disabled or the access levels file has changed, reload it
    if newmtime > get_accesslevels.lastmtime or not app.config['CACHE_ACCESSLEVELS']:
        get_accesslevels.lastmtime = newmtime
        accesslevels = json.load(file(app.config['FRONTEND_ACCESSLEVEL_FILE']))
        if app.config['CACHE_ACCESSLEVELS']:
            cache.set('accesslevels', accesslevels)

    if app.config['CACHE_ACCESSLEVELS']:
        return cache.get('accesslevels')
    else:
        return accesslevels

def get_model():
    if not hasattr(get_model, 'lastmtime'):
        get_model.lastmtime = 0

    newmtime = os.path.getmtime(app.config['FRONTEND_MODEL_FILE'])

    # Caching is disabled or the access levels file has changed, reload it
    if newmtime > get_model.lastmtime or not app.config['CACHE_MODEL']:
        get_model.lastmtime = newmtime
        model = json.load(file(app.config['FRONTEND_MODEL_FILE']))
        if app.config['CACHE_MODEL']:
            cache.set('model', model)

    if app.config['CACHE_MODEL']:
        return cache.get('model')
    else:
        return model


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
    accesslevels = get_accesslevels()
    return render_template("index.html", accesslevels=accesslevels)

@app.route('/form')
def form():
    accesslevels = get_accesslevels()
    model        = get_model()

    if accesslevels is None or model is None:
        raise ModelFormatError('Could not load model description and/or access levels')

    # TODO: Get user access level through auth
    return render_form(model, accesslevels, 2)
