from flask import request, render_template
from app   import app, cache

import logging
import json

from form_common import Model
from submission  import handle_form_post


def render_form(model, user_accesslevel, form_data=None):
    if form_data is not None:
        for level_no, level in enumerate(model.accesslevel_data):
            if level['name'] == form_data['level']:
                form_level_index = level_no
                break
        else:
            # Form level does not exist.
            form_level_index = 0
    else:
        form_level_index = 0

    return render_template(
        'form.html',
        title                  = 'HADDOCK Form',
        accesslevels           = model.accesslevel_data,
        accesslevel_index      = form_level_index,
        model                  = model.model_data,
        user_accesslevel_index = user_accesslevel,
        al_mtime               = model.al_mtime,
        model_mtime            = model.model_mtime,
        version_tag            = model.get_version_tag(),
        form_data              = form_data,
    )

@app.route('/')
def index():
    return render_template("index.html")

@app.route('/form', methods=['GET', 'POST'])
def form():
    model = Model.make()

    if request.method == 'GET':
        # TODO: Get user access level through auth (but only if not run locally)
        return render_form(model, len(model.accesslevel_data)-1)

    elif request.method == 'POST':
        if 'action' in request.args and request.args['action'] == 'resume':
            assert 'form_data' in request.files;
            form_data = json.load(request.files['form_data'])

            # NOTE: Files are not stored in formdata.json, they will have to be re-uploaded.

            return render_form(model, len(model.accesslevel_data)-1, form_data)
        else:
            # POST handling is done in submission.py.
            return handle_form_post(request, model)
