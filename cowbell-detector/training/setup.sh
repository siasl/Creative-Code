#!/bin/sh
# One-time setup for retraining from the app: a Python environment with PyTorch, outside Google Drive.
# The base model and STAR Drums replay data must already be in $DATA (see finetune.py).
set -e
DATA="${COWBELL_DATA:-$HOME/.cache/cowbell-detector}"
mkdir -p "$DATA"
python3 -m venv "$DATA/venv"
"$DATA/venv/bin/pip" install torch numpy
"$DATA/venv/bin/python" -c "import torch; print('PyTorch', torch.__version__, '- Apple GPU:', torch.backends.mps.is_available())"
