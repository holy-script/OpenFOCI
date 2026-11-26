#!/usr/bin/env bash
# OpenFOCI Automated Android APK Offline Patcher
# Bypasses the shuttered Tinylogics authentication gate by patching smali bytecode
# in TrackerSDK, AccountManager, and SplashViewPagerActivity.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APKTOOL="${SCRIPT_DIR}/apktool.jar"
UBER_SIGNER="${SCRIPT_DIR}/uber-apk-signer.jar"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <path_to_original_foci.apk> [output_directory]"
  exit 1
fi

INPUT_APK="$1"
OUT_DIR="${2:-${SCRIPT_DIR}}"
WORK_DIR="/tmp/foci_patch_work_$$"

if [[ ! -f "$INPUT_APK" ]]; then
  echo "Error: Input APK '$INPUT_APK' not found."
  exit 1
fi

# Ensure apktool.jar exists
if [[ ! -f "$APKTOOL" ]]; then
  echo "Downloading apktool 2.10.0..."
  curl -sL https://github.com/iBotPeaches/Apktool/releases/download/v2.10.0/apktool_2.10.0.jar -o "$APKTOOL"
fi

# Ensure uber-apk-signer exists
if [[ ! -f "$UBER_SIGNER" ]]; then
  echo "Downloading uber-apk-signer 1.3.0..."
  curl -sL https://github.com/patrickfav/uber-apk-signer/releases/download/v1.3.0/uber-apk-signer-1.3.0.jar -o "$UBER_SIGNER"
fi

echo "==> 1. Disassembling APK..."
java -jar "$APKTOOL" d "$INPUT_APK" -o "$WORK_DIR" -f

echo "==> 2. Patching TrackerSDK smali (checkLoginStatus -> always true)..."
TRACKER_SDK=$(find "$WORK_DIR" -name "TrackerSDK.smali" | head -n 1)
if [[ -f "$TRACKER_SDK" ]]; then
  python3 -c "
with open('$TRACKER_SDK', 'r') as f:
    content = f.read()
import re
pattern = r'(\.method public static checkLoginStatus\(Landroid/app/Activity;\)Z\s*\.locals \d+)(.*?)(?=\.end method)'
replacement = r'\1\n\n    const/4 v0, 0x1\n\n    return v0\n'
new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
with open('$TRACKER_SDK', 'w') as f:
    f.write(new_content)
"
fi

echo "==> 3. Patching AccountManager smali (hasAutoLoginToken -> true, default UID 1001)..."
ACCOUNT_MGR=$(find "$WORK_DIR" -name "AccountManager.smali" | head -n 1)
if [[ -f "$ACCOUNT_MGR" ]]; then
  python3 -c "
with open('$ACCOUNT_MGR', 'r') as f:
    content = f.read()
import re
pat1 = r'(\.method public hasAutoLoginToken\(\)Z\s*\.locals \d+)(.*?)(?=\.end method)'
rep1 = r'\1\n\n    const/4 v0, 0x1\n\n    return v0\n'
content = re.sub(pat1, rep1, content, flags=re.DOTALL)

pat2 = r'(\.method public getUid\(\)J\s*\.locals \d+)(.*?)(?=\.end method)'
rep2 = r'''\1\n\n    iget-wide v0, p0, Lcom/tinylogics/sdk/core/app/AccountManager;->mUid:J\n\n    const-wide/16 v2, 0x0\n\n    cmp-long v2, v0, v2\n\n    if-gtz v2, :cond_0\n\n    const-wide/16 v0, 0x3e9\n\n    :cond_0\n    return-wide v0\n'''
content = re.sub(pat2, rep2, content, flags=re.DOTALL)

with open('$ACCOUNT_MGR', 'w') as f:
    f.write(content)
"
fi

echo "==> 4. Patching SplashViewPagerActivity smali (launch MainActivity on onCreate)..."
SPLASH_ACT=$(find "$WORK_DIR" -name "SplashViewPagerActivity.smali" | head -n 1)
if [[ -f "$SPLASH_ACT" ]]; then
  python3 -c "
with open('$SPLASH_ACT', 'r') as f:
    content = f.read()
content = content.replace(
    'invoke-virtual {p1, v0}, Landroid/view/Window;->setStatusBarColor(I)V\n\n    return-void',
    'invoke-virtual {p1, v0}, Landroid/view/Window;->setStatusBarColor(I)V\n\n    invoke-direct {p0}, Lcom/tinylogics/sdk/ui/feature/login/SplashViewPagerActivity;->loginSuccessFinished()V\n\n    return-void'
)
with open('$SPLASH_ACT', 'w') as f:
    f.write(content)
"
fi

echo "==> 5. Rebuilding patched APK..."
UNSIGNED_APK="${WORK_DIR}/unsigned.apk"
java -jar "$APKTOOL" b "$WORK_DIR" -o "$UNSIGNED_APK"

echo "==> 6. Signing APK with debug certificate (zipalign + v1/v2/v3 signing)..."
java -jar "$UBER_SIGNER" -a "$UNSIGNED_APK" -o "$OUT_DIR"

SIGNED_APK=$(find "$OUT_DIR" -name "unsigned-aligned-debugSigned.apk" | head -n 1)
FINAL_APK="${OUT_DIR}/FOCI_Offline_Patched.apk"
mv "$SIGNED_APK" "$FINAL_APK"

rm -rf "$WORK_DIR"
echo "✅ Success! Offline patched APK ready at: $FINAL_APK"
