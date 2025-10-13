## Keep Your AWS S3 Demo Assets Live: Automating Presigned URLs with Node.js

### TL;DR
You work with audio (or any media) all the time and have **demo assets** stored securely on Amazon S3.  
You want to load these into your apps or SDK demos — but your **signed URLs keep expiring**.  

This little Node.js CLI lets you:
- Generate presigned URLs for your S3 bucket (`demo-assets/`)
- Save them in a JSON file for easy import into any project  
- Refresh them anytime with a single command

Let’s walk through how to build it.

---

## Use Case

You might have something like:
```
s3://audioshake/demo-assets/
├── Chupe-Jaae-English.mp4
├── Vocal-Demo.wav
├── Guitar-Solo.mp3
```

These are your demo media files — used for testing APIs, web players, or internal demos.

You could manually create a presigned URL each time, but that’s tedious.  
Instead, you’ll use this lightweight CLI to generate a simple `demo-assets.json`:

```json
{
  "assets": [
    {
      "src": "https://audioshake.s3.us-east-1.amazonaws.com/demo-assets/Vocal-Demo.wav?...",
      "title": "Vocal-Demo.wav",
      "format": "audio/wav",
      "expiry": "2025-10-14T09:45:00.000Z"
    }
  ]
}
```

Now your local or web app can fetch demo assets reliably — and when URLs expire, just rerun `create-demo-assets`.

---

## Step 1: Configure AWS

Make sure you have the AWS CLI set up with a profile that can read from your bucket:

```bash
aws configure --profile admin
# Region: us-east-1
# Output: json
```

You can verify:
```bash
aws sts get-caller-identity --profile admin
aws s3 ls s3://audioshake/demo-assets/ --profile admin
```

---

## Step 2: Install the CLI

Clone the repo (coming soon on GitHub):
```bash
git clone https://github.com/AudioExplorer/audioshake-developer-tools-AWS-Demo-Assets-Tool
cd audioshake-developer-tools-AWS-Demo-Assets-Tool
```

Then install the dependencies globally:
```bash
npm install -g @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/credential-providers
```

And link the CLI so it can be used from anywhere:
```bash
sudo cp ./bin/create-demo-assets /usr/local/bin/create-demo-assets
sudo chmod +x /usr/local/bin/create-demo-assets
```

---

## Step 3: Run It

From any directory:
```bash
create-demo-assets
```

It will:
- List all objects in your S3 folder  
- Generate presigned URLs (default 12h expiry)  
- Save `demo-assets.json` in your current working directory  

---

## How It Works (Under the Hood)

The script uses the AWS SDK v3:
```js
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { fromIni } from "@aws-sdk/credential-providers";
```

It lists objects, creates presigned URLs via `GetObjectCommand`, and writes them to JSON.

If your bucket’s `LocationConstraint` is `null`, it automatically signs requests for `us-east-1` (the classic region quirk).

---

## Refreshing URLs

Each URL has a 12-hour expiry by default.  
When your links expire, just re-run:
```bash
create-demo-assets
```
and it’ll overwrite the old JSON with fresh URLs.

---

## Example Output

```
🔍 Listing objects in s3://audioshake/demo-assets/ ...
demo-assets.json created with 8 assets
```

`demo-assets.json` now contains:
```json
{
  "assets": [
    { "src": "...", "title": "Guitar-Solo.mp3", "format": "audio/mpeg", "expiry": "2025-10-14T10:00:00Z" }
  ]
}
```

---

## 🪄 Bonus Tip

If you use NVM and global modules, the provided wrapper ensures this CLI works even in fresh shells — no path or version headaches.

---

#### Grab the GitHub **Repository:** [audioshake-developer-tools-AWS-Demo-Assets-Tool](https://github.com/AudioExplorer/audioshake-developer-tools-AWS-Demo-Assets-Tool)  
Includes:
- `/scripts/create-demo-assets.mjs` (Node script)  
- `/bin/create-demo-assets` (NVM-aware global wrapper)  
- `tutorial.md` (full install guide)  

---

## Why It’s Useful
This simple tool bridges your secure S3 assets with live demos or dev environments — without exposing buckets or manually generating signed URLs every time.  

Perfect for:
- API demos
- Audio/Video SDK previews
- Internal or hackathon projects

---

**Tags:** `#aws` `#nodejs` `#cli` `#developers` `#audioshake`
