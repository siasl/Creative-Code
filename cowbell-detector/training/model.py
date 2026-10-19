"""Cowbell onset CNN and its export to the TF.js weight format used by index.html."""
import base64

import numpy as np
import torch
import torch.nn as nn

NM = 64  # mel bands, must match Mel.NM in index.html


class Net(nn.Module):
    def __init__(self):
        super().__init__()

        def cb(i, o):
            return nn.Sequential(nn.Conv2d(i, o, 3, padding=1), nn.BatchNorm2d(o), nn.ReLU())

        self.f = nn.Sequential(cb(1, 16), cb(16, 16), nn.MaxPool2d((2, 1)), cb(16, 32), cb(32, 32), nn.MaxPool2d((2, 1)),
                               cb(32, 32), nn.MaxPool2d((2, 1)), nn.Dropout(0.2))
        self.t0 = nn.Sequential(nn.Conv1d(256, 64, 3, padding=1), nn.BatchNorm1d(64), nn.ReLU())
        self.ts = nn.ModuleList([nn.Sequential(nn.Conv1d(64, 64, 3, padding=d, dilation=d), nn.BatchNorm1d(64), nn.ReLU())
                                 for d in (2, 4, 8)])
        self.out = nn.Conv1d(64, 1, 1)

    def forward(self, x):  # x: [B, 1, NM, T] normalized log-mel -> [B, T] logits
        h = self.f(x)
        B, C, Fq, T = h.shape
        h = self.t0(h.reshape(B, C * Fq, T))
        for layer in self.ts:
            h = h + layer(h)
        return self.out(h).squeeze(1)


def export_spec(state, mu, sd):
    """Fold BatchNorm into the convolutions and pack weights for CowbellNet.run in the page."""
    st = {k: v.detach().cpu().numpy().astype(np.float64) for k, v in state.items()}

    def fold(conv, bn):
        w, b = st[conv + ".weight"], st.get(conv + ".bias", 0)
        g, be, m, v = st[bn + ".weight"], st[bn + ".bias"], st[bn + ".running_mean"], st[bn + ".running_var"]
        s = g / np.sqrt(v + 1e-5)
        return w * s.reshape(-1, *([1] * (w.ndim - 1))), (b - m) * s + be

    layers = []
    for i in (0, 1, 3, 4, 6):
        w, b = fold(f"f.{i}.0", f"f.{i}.1")
        layers.append(("c2", w.transpose(2, 3, 1, 0), b, None))
    w, b = fold("t0.0", "t0.1")
    layers.append(("c1", w.transpose(2, 1, 0), b, 1))
    for j, d in enumerate((2, 4, 8)):
        w, b = fold(f"ts.{j}.0", f"ts.{j}.1")
        layers.append(("c1", w.transpose(2, 1, 0), b, d))
    layers.append(("out", st["out.weight"].transpose(2, 1, 0), st["out.bias"], None))

    def enc(a):
        return base64.b64encode(np.ascontiguousarray(a, dtype=np.float32).tobytes()).decode()

    spec = {"mu": [round(float(x), 5) for x in mu], "sd": [round(float(x), 5) for x in sd], "layers": []}
    for kind, w, b, dil in layers:
        L = {"type": kind, "shape": list(w.shape), "w": enc(w), "b": enc(b)}
        if dil is not None:
            L["dil"] = dil
        spec["layers"].append(L)
    return spec
