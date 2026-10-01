# Tiempos por palabra de cada audio de public/voz (para sincronizar el video con la voz).
#   uv run --python 3.12 --with faster-whisper palabras.py  → public/voz/palabras.json
import json, pathlib, subprocess
import numpy as np
from faster_whisper import WhisperModel

modelo = WhisperModel("small", device="cpu", compute_type="int8")
out = {}
for mp3 in sorted(pathlib.Path("public/voz").glob("*.mp3")):
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", str(mp3), "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
    segs, _ = modelo.transcribe(np.frombuffer(pcm, np.int16).astype(np.float32) / 32768, language="es", word_timestamps=True)
    palabras = [[w.word.strip(), round(w.start, 2)] for s in segs for w in s.words]
    out[mp3.stem] = {"dur": round(len(pcm) / 2 / 16000, 2), "palabras": palabras}
    print(mp3.stem, " ".join(w for w, _ in palabras))
pathlib.Path("public/voz/palabras.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
