"""
Audio conversion and transcoding utilities for incoming voice notes.
WhatsApp voice notes are encoded as Ogg/Opus (audio/ogg; codecs=opus).
This adapter transcodes Opus/Ogg to 16kHz mono PCM WAV via ffmpeg when required
by Indic Speech-to-Text engines such as Sarvam AI.
"""

import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Optional
from app.core.logging import logger


def is_ogg_audio(data: bytes) -> bool:
    """Checks whether the raw audio bytes start with the OGG container magic header ('OggS')."""
    return bool(data and data.startswith(b"OggS"))


def is_wav_audio(data: bytes) -> bool:
    """Checks whether the raw audio bytes start with the RIFF/WAV header."""
    return bool(data and data.startswith(b"RIFF"))


def convert_audio_to_wav(
    audio_bytes: bytes,
    source_format: str = "ogg",
    target_sample_rate: int = 16000,
    ffmpeg_binary: Optional[str] = None,
) -> bytes:
    """
    Transcodes incoming audio bytes (e.g. WhatsApp Ogg/Opus) into standardized
    16kHz mono PCM WAV format for speech-to-text engines.

    If the audio is already in WAV format, it is returned without modification.
    If ffmpeg is not installed or available on PATH, logs a warning and returns
    the original bytes to preserve pipeline execution.
    """
    if not audio_bytes:
        return audio_bytes

    # If already a valid WAV file, no conversion is necessary
    if is_wav_audio(audio_bytes):
        return audio_bytes

    ffmpeg_bin = ffmpeg_binary or shutil.which("ffmpeg")
    if not ffmpeg_bin:
        logger.warning(
            "[AudioTranscoder] ffmpeg binary not located on PATH; "
            "forwarding original %s bytes without transcoding.",
            source_format,
        )
        return audio_bytes

    ext = source_format.lstrip(".") or "ogg"
    temp_in_path: Optional[str] = None
    temp_out_path: Optional[str] = None

    try:
        with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as in_file:
            in_file.write(audio_bytes)
            temp_in_path = in_file.name

        temp_out_path = f"{temp_in_path}.wav"

        cmd = [
            ffmpeg_bin,
            "-y",
            "-i",
            temp_in_path,
            "-acodec",
            "pcm_s16le",
            "-ac",
            "1",
            "-ar",
            str(target_sample_rate),
            temp_out_path,
        ]

        logger.info(
            "[AudioTranscoder] Transcoding %s audio (%d bytes) to 16kHz mono WAV using ffmpeg...",
            source_format,
            len(audio_bytes),
        )

        res = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=15,
        )

        if res.returncode == 0 and os.path.exists(temp_out_path):
            with open(temp_out_path, "rb") as out_file:
                transcoded_bytes = out_file.read()
            logger.info(
                "[AudioTranscoder] Transcoding successful (%d -> %d bytes).",
                len(audio_bytes),
                len(transcoded_bytes),
            )
            return transcoded_bytes
        else:
            stderr_msg = res.stderr.decode("utf-8", errors="replace")
            logger.warning(
                "[AudioTranscoder] ffmpeg exited with code %d: %s. Using original bytes.",
                res.returncode,
                stderr_msg[:200],
            )
            return audio_bytes

    except Exception as e:
        logger.error("[AudioTranscoder] Transcoding exception: %s. Using original bytes.", e)
        return audio_bytes

    finally:
        for p in (temp_in_path, temp_out_path):
            if p and os.path.exists(p):
                try:
                    os.unlink(p)
                except Exception:
                    pass
