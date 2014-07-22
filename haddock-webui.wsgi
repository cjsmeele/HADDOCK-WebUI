#!/usr/bin/env python

import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

import sys
sys.path.insert(0, '.')

from app import app as application
