# E141 NODE CAPSULE REQUEST
- status: SATISFIED
- pin_version: 24.12.0
- platform: linux-x64
- required_file_1: node-v24.12.0-linux-x64.tar.xz
- required_file_2: node-v24.12.0-linux-x64.tar.xz.sha256
- destination_dir: artifacts/incoming/node/
- expected_sha256: bdebee276e58d0ef5448f3d5ac12c67daa963dd5e0a9bb621a53d1cefbc852fd
## RAW
- fetch_url: https://nodejs.org/dist/v24.12.0/node-v24.12.0-linux-x64.tar.xz
- shasums_url: https://nodejs.org/dist/v24.12.0/SHASUMS256.txt
- place_then_run: CI=true npm run -s verify:e141
