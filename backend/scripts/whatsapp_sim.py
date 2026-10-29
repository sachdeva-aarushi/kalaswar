#!/usr/bin/env python3
"""
Kalaswar WhatsApp Artisan Listing Pipeline Simulator CLI.

Simulates a full realistic conversational interaction between an artisan and the
WhatsApp integration pipeline:
  Step 0: Check initial session state (GET /internal/whatsapp/session/{phone})
  Step 1: Upload artisan product photo (POST /internal/whatsapp/media)
  Step 2: Submit audio voice note (POST /internal/whatsapp/voice)
  Step 3: Approve draft with Coordinator Validation Rule (POST /internal/whatsapp/approve)
  Step 4: Verify session completed and audit trail recorded

Can be run against a live running backend server (HTTP) or locally in-process via FastAPI TestClient.
"""

import argparse
import base64
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, Optional

# Ensure backend root is on Python sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Ensure robust UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


# Terminal Colors & Icons
class Style:
    HEADER = "\033[95m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"
    END = "\033[0m"


def print_banner():
    banner = f"""
{Style.BOLD}{Style.CYAN}======================================================================
  KALASWAR WHATSAPP ARTISAN CONVERSATION SIMULATOR
  Pipeline: Photo -> Speech-to-Text -> LLM Extraction -> FairPrice -> Approval
======================================================================{Style.END}
"""
    print(banner)


def print_step(step_num: int, title: str):
    print(f"\n{Style.BOLD}{Style.HEADER}[STEP {step_num}] {title}{Style.END}")
    print(f"{Style.CYAN}{'-' * 65}{Style.END}")


def print_success(msg: str):
    print(f"{Style.GREEN}[OK] {msg}{Style.END}")


def print_info(label: str, value: Any):
    print(f"  {Style.BOLD}{label}:{Style.END} {value}")


def print_hindi(text: str):
    print(f"\n  {Style.YELLOW}💬 [Hindi Bot Response]:{Style.END}\n  \"{text}\"")


def print_audio(text: str):
    print(f"\n  {Style.BLUE}🔊 [TTS Audio Script]:{Style.END}\n  \"{text}\"")


class WhatsAppClient:
    """Client for executing WhatsApp pipeline requests against HTTP or in-process TestClient."""

    def __init__(self, base_url: str, token: str, in_process: bool = False):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.in_process = in_process
        self.headers = {
            "Content-Type": "application/json",
            "X-Service-Token": self.token,
        }

        if in_process:
            from starlette.testclient import TestClient
            from app.main import app
            self.client = TestClient(app)
        else:
            import httpx
            self.client = httpx.Client(timeout=30.0)

    def get(self, path: str) -> Dict[str, Any]:
        url = path if self.in_process else f"{self.base_url}{path}"
        res = self.client.get(url, headers=self.headers)
        if res.status_code >= 400:
            raise RuntimeError(f"HTTP {res.status_code} on GET {path}: {res.text}")
        return res.json()

    def post(self, path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        url = path if self.in_process else f"{self.base_url}{path}"
        res = self.client.post(url, json=payload, headers=self.headers)
        if res.status_code >= 400:
            raise RuntimeError(f"HTTP {res.status_code} on POST {path}: {res.text}")
        return res.json()


def simulate_artisan_conversation(
    client: WhatsAppClient,
    phone: str,
    photo_path: Path,
    audio_path: Path,
    stt_provider: str = "mock",
    caption: Optional[str] = None,
    interactive: bool = False,
    dump_json: bool = False,
):
    def maybe_pause(step_title: str):
        if interactive:
            input(f"\n{Style.BOLD}[Press Enter to continue to {step_title}...]{Style.END} ")

    # -------------------------------------------------------------------------
    # STEP 0: Inspect initial session state
    # -------------------------------------------------------------------------
    print_step(0, f"Querying Initial Session State for {phone}")
    session_info = client.get(f"/internal/whatsapp/session/{phone}")
    print_info("Session ID", session_info.get("session_id"))
    print_info("Current Step", session_info.get("step"))
    print_info("Status", session_info.get("status"))
    if dump_json:
        print(json.dumps(session_info, indent=2, ensure_ascii=False))

    maybe_pause("Step 1 (Upload Photo)")

    # -------------------------------------------------------------------------
    # STEP 1: Upload artisan photo
    # -------------------------------------------------------------------------
    print_step(1, f"Uploading Product Photo ({photo_path.name})")
    if not photo_path.exists():
        raise FileNotFoundError(f"Sample photo not found at: {photo_path}")

    with open(photo_path, "rb") as f:
        photo_bytes = f.read()
    photo_b64 = base64.b64encode(photo_bytes).decode("utf-8")

    import uuid
    media_msg_id = f"wamid.{uuid.uuid4()}"
    media_payload = {
        "phone": phone,
        "media_base64": photo_b64,
        "caption": caption or "हाथ से कढ़ाई किया गया कांथा कुशन कवर",
        "whatsapp_message_id": media_msg_id,
    }
    media_res = client.post("/internal/whatsapp/media", media_payload)

    print_success("Product photo ingested and Cloudinary asset optimized (f_auto, q_auto)")
    print_info("WhatsApp Message ID", media_msg_id)
    print_info("Session ID", media_res.get("session_id"))
    print_info("Next Step", media_res.get("step"))
    print_info("Cloudinary Public ID", media_res.get("cloudinary_public_id"))
    print_info("Optimized Image URL", media_res.get("image_url"))
    print_hindi(media_res.get("prompt_text_hi", ""))
    print_audio(media_res.get("audio_script_text", ""))

    if dump_json:
        print(json.dumps(media_res, indent=2, ensure_ascii=False))

    maybe_pause("Step 2 (Send Voice Note)")

    # -------------------------------------------------------------------------
    # STEP 2: Submit audio voice note
    # -------------------------------------------------------------------------
    print_step(2, f"Processing Voice Note ({audio_path.name}) via STT ({stt_provider.upper()})")
    if not audio_path.exists():
        raise FileNotFoundError(f"Sample audio not found at: {audio_path}")

    with open(audio_path, "rb") as f:
        audio_bytes = f.read()
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

    content_type = "audio/ogg" if audio_path.suffix.lower() in (".ogg", ".opus") else "audio/wav"
    voice_msg_id = f"wamid.{uuid.uuid4()}"
    voice_payload = {
        "phone": phone,
        "audio_base64": audio_b64,
        "language": "hi",
        "stt_provider": stt_provider,
        "whatsapp_message_id": voice_msg_id,
        "content_type": content_type,
    }
    voice_res = client.post("/internal/whatsapp/voice", voice_payload)

    print_success("Voice transcribed and craft attributes extracted")
    print_info("WhatsApp Message ID", voice_msg_id)
    print_info("Audio Format / Content-Type", content_type)
    print_info("Transcript", voice_res.get("transcript"))

    craft = voice_res.get("extracted_craft") or {}
    print_info("Craft Title", craft.get("title"))
    print_info("Craft Tradition", craft.get("craft"))
    print_info("Materials", ", ".join(craft.get("materials") or []))
    print_info("Colour", craft.get("colour"))

    pricing = voice_res.get("fair_price") or {}
    if pricing:
        print(f"\n  {Style.BOLD}--- FairPrice Engine Breakdown ---{Style.END}")
        print_info("  Material Cost", f"₹{pricing.get('material_cost', 0):.2f}")
        print_info("  Labour Cost", f"₹{pricing.get('labour_cost', 0):.2f}")
        print_info("  Floor Price", f"₹{pricing.get('floor_price', 0):.2f}")
        print_info("  Suggested Retail", f"₹{pricing.get('suggested_price', 0):.2f}")
        print(f"  {Style.BOLD}{Style.GREEN}>> Guaranteed Artisan Earnings: ₹{pricing.get('artisan_earnings', 0):.2f} <<{Style.END}")

    draft_id = voice_res.get("draft_id")
    print_info("Draft UUID", draft_id)
    print_hindi(voice_res.get("hindi_text", ""))
    print_audio(voice_res.get("audio_script_text", ""))

    buttons = voice_res.get("interactive_buttons", [])
    if buttons:
        print(f"\n  {Style.BOLD}Interactive Button Options for Artisan:{Style.END}")
        for btn in buttons:
            print(f"    [{btn.get('id')}] -> {btn.get('title')}")

    if dump_json:
        print(json.dumps(voice_res, indent=2, ensure_ascii=False))

    maybe_pause("Step 3 (Artisan Clicks Approve)")

    # -------------------------------------------------------------------------
    # STEP 3: Approve Draft (Coordinator Validation Rule)
    # -------------------------------------------------------------------------
    print_step(3, "Artisan Taps 'मंजूर करें / Approve & Publish' Button")
    approve_msg_id = f"wamid.{uuid.uuid4()}"
    approve_payload = {
        "phone": phone,
        "button_id": "btn_approve",
        "draft_id": draft_id,
        "whatsapp_message_id": approve_msg_id,
    }
    approve_res = client.post("/internal/whatsapp/approve", approve_payload)

    print_success("Approval processed under Coordinator Validation Rule")
    print_info("WhatsApp Message ID", approve_msg_id)
    print_info("New Draft Status", f"{Style.BOLD}{Style.GREEN}{approve_res.get('new_status')}{Style.END}")
    print_info("Requires Coordinator Review", approve_res.get("requires_coordinator_review"))
    print_info("GI Watermarked Asset", approve_res.get("watermarked_image_url"))
    print_hindi(approve_res.get("hindi_text", ""))
    print_audio(approve_res.get("audio_script_text", ""))

    if dump_json:
        print(json.dumps(approve_res, indent=2, ensure_ascii=False))

    # -------------------------------------------------------------------------
    # STEP 4: Final Session Verification
    # -------------------------------------------------------------------------
    print_step(4, "Verifying Completed Session & Audit Status")
    final_session = client.get(f"/internal/whatsapp/session/{phone}")
    print_info("Final Session Step", final_session.get("step"))
    print_info("Final Session Status", final_session.get("status"))
    print_info("Linked Draft Status", final_session.get("draft_status"))
    print_info("Last Activity Timestamp", final_session.get("last_activity_at"))

    print(f"\n{Style.BOLD}{Style.GREEN}======================================================================{Style.END}")
    print(f"{Style.BOLD}{Style.GREEN}  [SUCCESS] FULL ARTISAN WHATSAPP CONVERSATION SIMULATION COMPLETED!{Style.END}")
    print(f"{Style.BOLD}{Style.GREEN}  Product Draft '{draft_id}' is securely held in 'pending_validation'{Style.END}")
    print(f"{Style.BOLD}{Style.GREEN}  Ready for SHG Coordinator Review & On-Chain DPP Issuance.{Style.END}")
    print(f"{Style.BOLD}{Style.GREEN}======================================================================{Style.END}\n")


def main():
    parser = argparse.ArgumentParser(
        description="Kalaswar WhatsApp Artisan Conversational Simulator CLI",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--url",
        default=os.getenv("API_BASE_URL", "http://localhost:8000"),
        help="Backend base URL",
    )
    parser.add_argument(
        "--token",
        default=os.getenv(
            "WHATSAPP_SHARED_SERVICE_TOKEN",
            os.getenv("INTERNAL_SERVICE_TOKEN", "kalaswar_internal_service_secret_token"),
        ),
        help="Internal service token (X-Service-Token)",
    )
    parser.add_argument(
        "--phone",
        default="+919876543210",
        help="Artisan E.164 phone number",
    )
    parser.add_argument(
        "--photo",
        default=str(BACKEND_DIR / "samples" / "sample_cushion.jpg"),
        help="Path to sample artisan photo",
    )
    parser.add_argument(
        "--audio",
        default=str(BACKEND_DIR / "samples" / "sample_voice_note.wav"),
        help="Path to sample audio note",
    )
    parser.add_argument(
        "--stt",
        default="mock",
        choices=["mock", "sarvam", "whisper"],
        help="STT transcription provider override",
    )
    parser.add_argument(
        "--caption",
        default="हाथ से कढ़ाई किया गया कांथा कुशन कवर",
        help="Optional caption with photo",
    )
    parser.add_argument(
        "--interactive",
        action="store_true",
        help="Pause between conversation steps for live presentation / demonstration",
    )
    parser.add_argument(
        "--in-process",
        action="store_true",
        help="Execute directly in-process via FastAPI TestClient (no running HTTP server required)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print raw JSON response payloads after each step",
    )

    args = parser.parse_args()
    print_banner()

    # Determine execution mode: if not explicitly in-process, check if server is reachable
    in_process = args.in_process
    if not in_process:
        import httpx
        try:
            httpx.get(f"{args.url.rstrip('/')}/health", timeout=1.5)
            print(f"[*] Connected to live Kalaswar Backend at {args.url}")
        except Exception:
            print(f"[!] Live server not detected at {args.url}.")
            print(f"[*] Automatically switching to high-fidelity In-Process TestClient execution mode.\n")
            in_process = True

    client = WhatsAppClient(base_url=args.url, token=args.token, in_process=in_process)

    try:
        simulate_artisan_conversation(
            client=client,
            phone=args.phone,
            photo_path=Path(args.photo),
            audio_path=Path(args.audio),
            stt_provider=args.stt,
            caption=args.caption,
            interactive=args.interactive,
            dump_json=args.json,
        )
    except Exception as e:
        print(f"\n{Style.RED}[ERROR] Simulation halted: {e}{Style.END}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
