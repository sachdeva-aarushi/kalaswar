"""
Generates OpenAPI schema from the FastAPI app and produces TypeScript types
for both the web and mobile client applications using openapi-typescript.
"""

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

# Add backend directory to sys.path so app can be imported
BACKEND_DIR = Path(__file__).resolve().parent.parent
WORKSPACE_DIR = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app


def export_openapi_json(output_path: Path) -> Path:
    """Exports OpenAPI specification from FastAPI application instance."""
    schema = app.openapi()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(schema, f, indent=2)
    print(f"[OK] Exported OpenAPI specification to {output_path}")
    return output_path


def generate_typescript_types(openapi_path: Path, target_dir: Path, output_filename: str = "schema.d.ts") -> Path:
    """Invokes openapi-typescript CLI to produce strongly-typed TypeScript definitions."""
    target_dir.mkdir(parents=True, exist_ok=True)
    output_file = target_dir / output_filename

    # Resolve npx binary (support Windows .cmd)
    npx_cmd = shutil.which("npx.cmd") if sys.platform == "win32" else None
    if not npx_cmd:
        npx_cmd = shutil.which("npx") or "npx"

    cmd = [
        npx_cmd,
        "--yes",
        "openapi-typescript",
        str(openapi_path.resolve()),
        "-o",
        str(output_file.resolve()),
    ]

    print(f"[*] Generating TypeScript types for {target_dir.name} -> {output_file}...")
    try:
        res = subprocess.run(
            cmd,
            cwd=str(WORKSPACE_DIR),
            check=True,
            capture_output=True,
            text=True,
            shell=(sys.platform == "win32"),
        )
        print(f"[OK] Generated {output_file} successfully.")
        return output_file
    except subprocess.CalledProcessError as e:
        print(f"[FAIL] Error generating types for {target_dir}: {e.stderr or e.stdout}", file=sys.stderr)
        raise


def main():
    openapi_file = BACKEND_DIR / "openapi.json"
    export_openapi_json(openapi_file)

    web_target = WORKSPACE_DIR / "web" / "src" / "lib" / "api"
    mobile_target = WORKSPACE_DIR / "mobile" / "src" / "api"

    print(f"[*] Target web directory: {web_target}")
    print(f"[*] Target mobile directory: {mobile_target}")

    generate_typescript_types(openapi_file, web_target, "schema.d.ts")
    generate_typescript_types(openapi_file, mobile_target, "schema.d.ts")

    # Also generate convenient client helper index.ts in web/src/lib/api if not present
    web_index = web_target / "index.ts"
    if not web_index.exists():
        with open(web_index, "w", encoding="utf-8") as f:
            f.write("export type * from './schema';\n")
        print(f"[OK] Created helper export {web_index}")

    mobile_index = mobile_target / "index.ts"
    if not mobile_index.exists():
        with open(mobile_index, "w", encoding="utf-8") as f:
            f.write("export type * from './schema';\n")
        print(f"[OK] Created helper export {mobile_index}")

    print("\n[SUCCESS] OpenAPI schema and TypeScript definitions generated successfully!")


if __name__ == "__main__":
    main()
