from flask import request, render_template
from app   import app, cache

import logging

from form_common import Model
from submission  import handle_form_post


def render_form(model, user_accesslevel):
    return render_template(
        'form.html',
        title                  = 'HADDOCK Form',
        accesslevels           = model.accesslevel_data,
        accesslevel_index      = 0,
        model                  = model.model_data,
        user_accesslevel_index = user_accesslevel,
        al_mtime               = model.al_mtime,
        model_mtime            = model.model_mtime,
        version_tag            = model.get_version_tag(),
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
        # POST handling is done in submission.py.
        return handle_form_post(request, model)
