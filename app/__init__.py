from flask import Flask

# Initialize application
app = Flask(__name__)

# Load config
from config import config
app.config.from_object(config['default'])

# Set up logger
import logging
from logging.handlers import RotatingFileHandler
handler = RotatingFileHandler('log/server.log', maxBytes=4*1024**2, backupCount=1)
handler.setLevel(logging.WARNING)
app.logger.addHandler(handler)

# Import view and error scripts
from app import views, errors
