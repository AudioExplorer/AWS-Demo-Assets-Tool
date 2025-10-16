# AWS Demo Assets Tool

A lightweight Node.js command-line tool that lists S3 media assets, generates presigned URLs, and outputs a `demo-assets.json` file for easy integration into your audio, video, or SDK demos.  
Designed for developers who regularly work with secure Amazon S3 buckets to manage and refresh demo content.

![Node.js](https://img.shields.io/badge/node-%3E%3D18.0-green)  ![AWS SDK v3](https://img.shields.io/badge/AWS%20SDK-v3-blue)  ![License](https://img.shields.io/badge/license-MIT-lightgrey)


## Requirements

- **Node.js ≥ 18**  
- AWS credentials with access to your demo-assets bucket  
- Either local or global installation of AWS SDK dependencies (not both)

## Features

- Generates presigned URLs with secure expiration (default: 12 hours)  
- Automatically lists files from any S3 bucket path  
- Outputs a consistent, ready-to-use JSON structure  
- Works with standard AWS CLI credentials and profiles  
- Includes an NVM-aware global wrapper for cross-shell compatibility  
- Ideal for AudioShake or similar SDK demos where assets need periodic refreshing  

---

## TL;DR  Quick Start 

The new `create-demo-assets` CLI can be run instantly with NPX — no manual dependency or wrapper installation required.

```bash
# First-time setup (interactive)
npx create-demo-assets --setup

# Once installed you can reference it without the npx

# List your current demo assets
create-demo-assets --list

# Upload a local file
create-demo-assets --upload ./file.mp3

Configuration

During setup, you’ll be prompted for:
	•	AWS Region
	•	S3 Bucket name
	•	S3 Prefix (e.g., demo-assets/)
	•	AWS Profile name

The tool saves your configuration locally (per project) or globally (for all projects).
You can manage it anytime with:

# Show current configuration
create-demo-assets --showConfig

# Reset and reconfigure
create-demo-assets --resetConfig

If your AWS credentials are missing or invalid, you can configure them manually:

aws configure --profile <your-profile>

Then re-run setup:

create-demo-assets --setup

💡 The tool validates your AWS credentials automatically during setup, ensuring you’re ready to upload and list assets immediately.

```


## AWS Credential Setup

### 1. Configure AWS Credentials

 This command lists all configured AWS credential profiles available on your system.

 ```Bash
 # list existing profiles
aws configure list-profiles

% dev
amplify-profile-dan
admin
```

Ensure you have AWS credentials with access to your demo-assets bucke. This command will use them to create a reusable AWS profile.

```bash
# Create a profile
aws configure --profile admin
# Region: us-east-1
# Output: json
```
### 2. Run the Tool
At it's simplest, this will generate a JSON file containing all your aws assets in a bucket and prefix location.

#### Generate demo-assets.json

```bash
create-demo-assets
```

This command:  
- Lists all objects in your configured S3 folder  
- Generates presigned URLs with the correct signer region  
- Saves a fresh `demo-assets.json` in your current working directory  

Example output:

```json
{
  "assets": [
    {
      "src": "https://audioshake.s3.us-east-1.amazonaws.com/demo-assets/example.wav?...",
      "title": "example.wav",
      "format": "audio/wav",
      "expiry": "2025-10-14T09:45:00.000Z"
    }
  ]
}
```


## Usage Options
```Bash
AudioShake Demo Asset Builder (v2)
----------------------------------
Usage:
  npx create-demo-assets [options]
  create-demo-assets [options]

Options:
  --upload <file>             Upload a single file to s3://${BUCKET}/${PREFIX}
  --uploadDir <directory>     Upload all supported files from a directory
  --type <ext[,ext]>          Optional. Filter uploads or JSON output by file type (e.g., mp3,mp4,wav)
  --list                      List existing assets in the bucket (no JSON generation)
  --hours <n>                 Set the presigned URL expiry (default: 12h)
  --profile <aws-profile>     Use a specific AWS profile (default: admin)
  --help, -h                  Show this help message
  --setup                     Run interactive setup for configuration
  --showConfig                Display current configuration
  --resetConfig               Remove both local and global configuration files

Examples:
  create-demo-assets --upload ./song.mp3
  create-demo-assets --uploadDir ./assets --type=mp3,mp4
  create-demo-assets --type=mp3,mp4
  create-demo-assets --list

Supported File Types:
  Audio: mp3, wav, m4a, aac
  Video: mp4, mov
  Text: txt, md, srt, json, csv, xml
  Images: jpg, jpeg, png, gif, webp

💡 To extend support, edit the mimeMap inside scripts/create-demo-assets.mjs.

Docs & Updates:
  https://github.com/AudioExplorer/AWS-Demo-Assets-Tool
```
---

## Repository Structure

```
/bin
 └── create-demo-assets       → global wrapper (NVM-compatible)
/scripts
 └── create-demo-assets.mjs   → Node script using AWS SDK v3
/docs
 └── tutorial.md              → detailed setup and usage guide
```


## Why This Exists

When working with AudioShake APIs or other SDKs, demo assets often live in protected S3 buckets.  
This tool eliminates the need to manually generate presigned URLs every time they expire, enabling safe, repeatable integration of media in test apps or demo environments.

---

## Troubleshooting
- **SignatureDoesNotMatch** — Ensure your bucket region is correct (set to `us-east-1` if `LocationConstraint` is `null`).  
- **Cannot find package '@aws-sdk/client-s3'** — Confirm packages are globally installed for your current NVM Node version.  
- **Permission denied** — Use `sudo chmod +x /usr/local/bin/create-demo-assets` to make the wrapper executable.


## Maintained By

#### Dan Zeitman  
AudioShake Developer Website  
[https://developer.audioshake.ai](https://developer.audioshake.ai)

---

**Suggested Topics:**  
`nodejs`, `aws`, `s3`, `cli`, `devtools`, `audioshake`, `presigned-url`, `nvm`, `automation`