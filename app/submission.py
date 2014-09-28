from flask import jsonify, request
from app   import app

from form_common import Model

import json


def handle_form_post(request, model):
    # Our return value (which should be JSON encoded) will be passed back to the client.

    if 'json' in request.form:
        try:
            data = json.loads(request.form['json'])
        except ValueError:
            return jsonify(success=False, message='Invalid POST format (no valid JSON)')

        try:
            if data['form_version'] != model.get_version_tag():
                return jsonify(
                    success=False,
                    message='The data model has changed since you loaded this form,'
                            ' please reload and try again.'
                )

            accesslevel_names = [ level['name'] for level in model.accesslevel_data ]

            # TODO: Check with actual user access level.
            if data['level'] not in accesslevel_names or accesslevel_names.index(data['level']) > 999:
                return jsonify(
                    success=False,
                    message='The selected form level is too high,'
                            ' please request a higher access level or select a different level above.'
                )
        except KeyError:
            return jsonify(success=False, message='Submitted form data is incomplete.')

        # TODO: Save uploaded files
        # TODO: Call jsontocns.py

        # run_directory = app.config['OUTPUT_ROOT'] ...

        return jsonify(success=False, message='Unimplemented.')
    else:
        return jsonify(success=False, message='Invalid POST format.')
