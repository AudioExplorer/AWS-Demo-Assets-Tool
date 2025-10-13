# AWS Demo Assets Tool

A lightweight Node.js command-line tool that lists S3 media assets, generates presigned URLs, and outputs a `demo-assets.json` file for easy integration into your audio, video, or SDK demos.  
Designed for developers who regularly work with secure Amazon S3 buckets to manage and refresh demo content.

---

## Features
- Generates presigned URLs with secure expiration (default: 12 hours)
- Automatically lists files from any S3 bucket path
- Outputs a consistent, ready-to-use JSON structure
- Works with standard AWS CLI credentials and profiles
- Includes an NVM-aware global wrapper for cross-shell compatibility
- Useful for AudioShake or similar SDK demos where assets need to refresh periodically

---

## Quick Start

### 1. Configure AWS
Ensure you have AWS credentials with access to your demo-assets bucket:

```bash
aws configure --profile admin
# Region: us-east-1
# Output: json
```

### 2. Install Dependencies
Install AWS SDK components globally:

```bash
npm install -g @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/credential-providers
```

### 3. Install the CLI Wrapper
```bash
sudo cp ./bin/create-demo-assets /usr/local/bin/create-demo-assets
sudo chmod +x /usr/local/bin/create-demo-assets
```

### 4. Run the Tool
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

## Why This Exists
When working with AudioShake APIs or other SDKs, demo assets often live in protected S3 buckets.  
This tool eliminates the need to manually generate presigned URLs every time they expire, allowing for safe, repeatable integration of media in test apps or demo environments.

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
Dan Zeitman
AudioShake Developer Website
[https://developer.audioshake.ai](https://developer.audioshake.ai)

---

**Suggested Topics:**  
`nodejs`, `aws`, `s3`, `cli`, `devtools`, `audioshake`, `presigned-url`, `nvm`, `automation`
