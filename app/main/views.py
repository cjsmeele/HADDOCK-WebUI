from flask import render_template, current_app
from . import main

import json
import logging

class ModelFormatError(Exception):
    pass

class RequestError(Exception):
    pass

@main.route('/')
def index():
    accesslevels = json.load(file(current_app.config['FRONTEND_ACCESSLEVEL_FILE']))
    return render_template("index.html", accesslevels=accesslevels)

@main.route('/form/<level>')
def form(level):
    accesslevels = json.load(file(current_app.config['FRONTEND_ACCESSLEVEL_FILE']))
    model        = json.load(file(current_app.config['FRONTEND_MODEL_FILE']))

    # NOTE: The model JSON may need to be cached for performance reasons
    #       The form HTML as generated by the template should be cached server-side as well

    if accesslevels is None or model is None:
        raise ModelFormatError('Could not load model description and access levels')

    for i, accesslevel in enumerate(accesslevels):
        print level, accesslevel['name']
        if accesslevel['name'] == level:
            accesslevel_index = i
            break
    else:
        raise RequestError('Unknown access level specified')

    return render_template(
        'form.html',
        title='HADDOCK Form',
        accesslevels=accesslevels,
        accesslevel_index=accesslevel_index,
        model=model,
        user_accesslevel_index=2 # TODO: Get this information through auth
    )

