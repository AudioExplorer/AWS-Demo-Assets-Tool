# AWS Demo Assets Tool

**TL;DR Quick Run:**

```bash
# Configure AWS profile (if needed)
aws configure --profile admin

# Install dependencies (choose ONE):
# Local project:
npm init -y
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/credential-providers
# OR Global:
npm install -g @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/credential-providers


# Before running globally, update your bucket and prefix!
# Edit the following constants in scripts/create-demo-assets.mjs:
# const BUCKET = "<your-s3-bucket-name>";
# const PREFIX = "demo-assets/";


# Install CLI wrapper globally:
sudo cp ./bin/create-demo-assets /usr/local/bin/create-demo-assets
sudo chmod +x /usr/local/bin/create-demo-assets
```


---

A lightweight Node.js command-line tool that lists S3 media assets, generates presigned URLs, and outputs a `demo-assets.json` file for easy integration into your audio, video, or SDK demos.  
Designed for developers who regularly work with secure Amazon S3 buckets to manage and refresh demo content.

![Node.js](https://img.shields.io/badge/node-%3E%3D18.0-green)  
![AWS SDK v3](https://img.shields.io/badge/AWS%20SDK-v3-blue)  
![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## Requirements

- **Node.js ≥ 18**  
- AWS credentials with access to your demo-assets bucket  
- Either local or global installation of AWS SDK dependencies (not both)

---

## Features

- Generates presigned URLs with secure expiration (default: 12 hours)  
- Automatically lists files from any S3 bucket path  
- Outputs a consistent, ready-to-use JSON structure  
- Works with standard AWS CLI credentials and profiles  
- Includes an NVM-aware global wrapper for cross-shell compatibility  
- Ideal for AudioShake or similar SDK demos where assets need periodic refreshing  

---

## Quick Start

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

### 2. Install Project Dependencies

> **Note:** Choose *either* Option A *or* Option B — do **not** install both.

#### Option A: Local Project Installation

```bash
# Init and install SDKs
npm init -y
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/credential-providers
```

#### Option B: Global Installation
Alternatively, intall the dependencies locally enable cmd tool access anywhere.
```bash
# Init and install SDK globally
npm install -g @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/credential-providers
```

### 3. Install the CLI Wrapper Globally
If you chose option B, then this cmd will copy the files to your /**usr/local/bin** 

```bash
sudo cp ./bin/create-demo-assets /usr/local/bin/create-demo-assets
sudo chmod +x /usr/local/bin/create-demo-assets
```

### 4. Run the Tool

#### Within this Project

```bash
node scripts/create-demo-assets.mjs
```

#### Using the Global CLI Wrapper

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

---

## Usage Options (Global)

```bash
# From the project root

# Default (uses AWS profile 'admin', 12h expiry)
create-demo-assets

# Display Help
create-demo-assets --help

# Using custom AWS profile
create-demo-assets --profile=dev

# Longer expiry (24h)
create-demo-assets --hours=24

# Combined options
create-demo-assets --hours=6 --profile=<your-aws-profile>
```

### Filter JSON Output by File Type

You can also limit the generated `demo-assets.json` to specific file types.

```bash
create-demo-assets --type=mp3,mp4
```

This will include only `.mp3` and `.mp4` assets in the generated JSON file.

If no files of those types exist, you’ll see:
```
Currently you do not have any mp3 or mp4 assets in s3://your-bucket/demo-assets/
💡 Use --upload or --uploadDir to add these files to your AWS demo-assets bucket.
```

---

## Upload & List Features

The tool can upload local files or entire directories directly to your AWS demo-assets bucket and list existing contents without regenerating `demo-assets.json`.

### Upload a Single File
```bash
create-demo-assets --upload ./my-audio.mp3
```

### Upload All Files in a Directory
```bash
create-demo-assets --uploadDir ./assets
```

### Filter by File Type
Optionally limit uploads to specific extensions:
```bash
create-demo-assets --uploadDir ./assets --type=mp3,mp4,wav
```
If `--type` is omitted, all recognized file types will be uploaded.

### Supported File Types

| Category | Extensions | MIME Type |
|-----------|-------------|-----------|
| **Audio** | mp3, wav, m4a, aac | audio/mpeg, audio/wav, audio/m4a, audio/aac |
| **Video** | mp4, mov | video/mp4, video/quicktime |
| **Text / Data** | txt, md, json, csv, xml, srt | text/plain, text/markdown, application/json, text/csv, application/xml, application/x-subrip |
| **Images** | jpg, jpeg, png, gif, webp | image/jpeg, image/png, image/gif, image/webp |

> 💡 **To extend support**, edit the `mimeMap` inside `scripts/create-demo-assets.mjs` and add your preferred extensions and MIME types.

### List Existing Files
You can view all files under your configured prefix:
```bash
create-demo-assets --list
```

Example output:
```
🔍 Listing s3://audioshake/demo-assets/ (list-only mode)...
• demo-assets/song.mp3 (3.4 MB)
• demo-assets/video.mp4 (12.1 MB)
✅ Total files: 17
```


## Why This Exists

When working with AudioShake APIs or other SDKs, demo assets often live in protected S3 buckets.  
This tool eliminates the need to manually generate presigned URLs every time they expire, enabling safe, repeatable integration of media in test apps or demo environments.

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

---

## Troubleshooting

- **SignatureDoesNotMatch** — Ensure your bucket region is correct (set to `us-east-1` if `LocationConstraint` is `null`).  
- **Cannot find package '@aws-sdk/client-s3'** — Confirm packages are globally installed for your current NVM Node version.  
- **Permission denied** — Use `sudo chmod +x /usr/local/bin/create-demo-assets` to make the wrapper executable.

---

## Maintained By

#### Dan Zeitman  
AudioShake Developer Website  
[https://developer.audioshake.ai](https://developer.audioshake.ai)

---

**Suggested Topics:**  
`nodejs`, `aws`, `s3`, `cli`, `devtools`, `audioshake`, `presigned-url`, `nvm`, `automation`