#!/bin/bash
gunicorn app:app --bind 0.0.0.0:${PORT:-3001} --workers 2 --threads 4 --timeout 120
