## Keep Your AWS S3 Demo Assets Live: Automating Presigned URLs with Node.js

### TL;DR
You work with audio (or any media) all the time and have **demo assets** stored securely on Amazon S3.  
You want to load these into your apps or SDK demos — but your **presigned URLs keep expiring**.  

*Update:* The CLI now also supports uploading files or directories to your S3 demo‑assets bucket and listing bucket contents — all with one command.

This little Node.js CLI lets you:
- generate presigned URLs for your S3 bucket (`demo-assets/`)
- save them in a JSON file for easy import into any project  
- refresh them anytime with a single command

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

Ensure your IAM policy allows `s3:ListBucket` and `s3:GetObject` for your demo‑assets prefix.

---

## Step 2: Install the tool

Install with our NPX package:
```bash
npx create-demo-assets 
```

Then install the dependencies globally and creates a config file that stores your bucket information and which AWS profile to use.
```bash
# Run setup again to change the config
create-demo-assets --setup
```

---

## Step 3: Run It

From any directory:
```bash
create-demo-assets
```

It will:
- list all objects in your S3 folder  
- generate presigned URLs (default 12‑hour expiry)  
- save `demo-assets.json` in your current working directory  

---

```
🔍 Listing objects in s3://audioshake/demo-assets/ ...
demo-assets.json created with 8 assets
```

## Step 4: Upload or List Assets

You can now upload new demo files or check what’s in your bucket without generating JSON.

Upload a single file:
```bash
create-demo-assets --upload ./song.mp3
```

Upload a directory:
```bash
create-demo-assets --uploadDir ./assets --type=mp3,mp4
```

List all files:
```bash
create-demo-assets --list
```

If you pass `--type`, only matching file extensions are included. Supported formats include mp3, wav, mp4, mov, json, txt, md, and more.

---

## How It Works (Under the Hood)

The script uses the AWS SDK v3:
```js
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { fromIni } from "@aws-sdk/credential-providers";
```

It lists objects, creates presigned URLs via `GetObjectCommand`, and writes them to JSON.

If your bucket has no `LocationConstraint` (the classic us‑east‑1 case), the CLI automatically signs requests for that region.

The same script now handles uploads and listing via the same S3 client — no extra configuration required.

---

## Refreshing URLs

Each URL has a 12‑hour expiry by default.  
When your links expire, just rerun:
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

#### Grab the GitHub **Repository:** [AWS-Demo-Assets-Tool](https://github.com/AudioExplorer/AWS-Demo-Assets-Tool)  
Includes:
- `/scripts/create-demo-assets.mjs` (Node script)  
- `/docs/tutorial.md` (full install guide)  
- `README.MD`

---

## Why It’s Useful
This simple tool bridges your secure S3 assets with live demos or dev environments — without exposing buckets or manually generating presigned URLs every time.  

Recent updates make it easier to keep demo assets synchronized: you can upload, list, and regenerate presigned URLs from one CLI.

Perfect for:
- API demos
- Audio/Video SDK previews
- Internal or hackathon projects

---

**Tags:** `#aws` `#nodejs` `#cli` `#developers` `#audioshake`

The roadmap includes additional S3 management features and examples. Stay tuned for more developer-facing utilities.

---

**Caution:** Avoid exposing your presigned JSON publicly or using overly long expirations.
