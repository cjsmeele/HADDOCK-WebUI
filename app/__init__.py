from flask import Flask
import os

class HADDOCKApp(Flask):
    def __init__(self, name):
        super(HADDOCKApp, self).__init__(name)

# Initialize application.
app = HADDOCKApp(__name__)

# Load config.
from config import config
app.config.from_object(config)

if app.config['CACHE_MODEL'] or app.config['CACHE_ACCESSLEVELS']:
    from flask.ext.cache import Cache
    cache = Cache(app,config={'CACHE_TYPE': app.config['CACHE_BACKEND']})
    cache.init_app(app)
else:
    cache = None

# Check paths.
if not os.path.exists(app.config['JSON_TO_CNS']):
	raise Exception('Could not find jsontocns script at "' + app.config['JSON_TO_CNS'] + '"')
if not os.path.exists(app.config['ACCESSLEVEL_FILE']):
	raise Exception('Accesslevels file does not exist at "' + app.config['ACCESSLEVEL_FILE'] + '"')
if not os.path.exists(app.config['MODEL_FILE']):
	raise Exception('JSON model does not exist at "' + app.config['MODEL_FILE'] + '"')
if not os.path.exists(app.config['TEMPLATE_FILE']):
	raise Exception('CNS template file does not exist at "' + app.config['TEMPLATE_FILE'] + '"')
if not os.path.isdir(app.config['OUTPUT_ROOT']):
	raise Exception('Output job directory does not exist at "' + app.config['OUTPUT_ROOT'] + '"')

# Set up logger.
import logging
from logging.handlers import RotatingFileHandler

handler = RotatingFileHandler('log/server.log', maxBytes=4*1024**2, backupCount=1)
handler.setLevel(logging.WARNING)
app.logger.addHandler(handler)

# Import view and error scripts.
from app import views, errors
