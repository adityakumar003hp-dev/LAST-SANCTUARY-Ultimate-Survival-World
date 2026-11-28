import os
import zipfile
import shutil

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUTPUT_ZIP = os.path.join(ROOT_DIR, 'public', 'LAST_SANCTUARY_COMPLETE_DAY1_DAY2_STORYLINE.zip')
MIRROR_ZIP_1 = os.path.join(ROOT_DIR, 'public', 'assets', 'aistudio', 'LAST_SANCTUARY_COMPLETE_DAY1_DAY2_STORYLINE.zip')
MIRROR_ZIP_2 = os.path.join(ROOT_DIR, 'public', 'assets', 'aistudio', 'LAST_SANCTUARY_REBIRTH_FINAL_MASTER_IMPLEMENTATION_cde8eb36.zip')

EXCLUDE_DIRS = {'node_modules', 'dist', '.git', '.aistudio'}
EXCLUDE_EXTS = {'.zip'}

def make_zip():
    temp_zip = '/tmp/master_source.zip'
    if os.path.exists(temp_zip):
        os.remove(temp_zip)

    with zipfile.ZipFile(temp_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(ROOT_DIR):
            # prune excluded directories
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

            for file in files:
                if any(file.endswith(ext) for ext in EXCLUDE_EXTS):
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, ROOT_DIR)
                zf.write(full_path, rel_path)

    os.makedirs(os.path.dirname(OUTPUT_ZIP), exist_ok=True)
    os.makedirs(os.path.dirname(MIRROR_ZIP_1), exist_ok=True)

    shutil.copyfile(temp_zip, OUTPUT_ZIP)
    shutil.copyfile(temp_zip, MIRROR_ZIP_1)
    shutil.copyfile(temp_zip, MIRROR_ZIP_2)

    size = os.path.getsize(OUTPUT_ZIP)
    print(f"Packaged ZIP successfully: {OUTPUT_ZIP} ({size:,} bytes)")
    print(f"Mirrored to: {MIRROR_ZIP_1}")
    print(f"Mirrored to: {MIRROR_ZIP_2}")

if __name__ == '__main__':
    make_zip()
