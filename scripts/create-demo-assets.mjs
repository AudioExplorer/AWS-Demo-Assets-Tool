#!/usr/bin/env node
import child_process from "child_process";

if (process.argv.includes("--install")) {
    const INSTALL_DIR = "/usr/local/lib/create-demo-assets";
    const WRAPPER_PATH = "/usr/local/bin/create-demo-assets";
    const SCRIPT_PATH = decodeURIComponent(new URL(import.meta.url).pathname);
    const fs = await import("fs");
    let needsSudo = false;
    // Determine if we need sudo for /usr/local/lib and /usr/local/bin
    try {
        fs.accessSync("/usr/local/lib", fs.constants.W_OK);
        fs.accessSync("/usr/local/bin", fs.constants.W_OK);
    } catch (e) {
        // Not writable, check if root
        if (typeof process.getuid === "function" && process.getuid() !== 0) {
            needsSudo = true;
            console.log("⚠️  Elevated privileges required for install");
        }
    }
    console.log("Debug:", { getuid: process.getuid?.(), needsSudo });

    // Helper to run commands with or without sudo (interactive with TTY)
    function run(cmd) {
        if (needsSudo && !cmd.trim().startsWith("sudo")) {
            // Escape quotes and force interactive password prompt
            cmd = `sudo -S bash -c "${cmd.replace(/"/g, '\\"')}"`;
            console.log(`🔒 Running with elevated privileges: ${cmd}`);
        }
        child_process.execSync(cmd, { stdio: "inherit" });
    }

    console.log(`Copying from ${SCRIPT_PATH} → ${INSTALL_DIR}/create-demo-assets.mjs`);
    console.log("Installing create-demo-assets CLI...");

    try {
        // Ensure target directory exists (robust Node-based check)
        console.log("📁 Ensuring install directory exists...");
        try {
            const target = "/usr/local/lib/create-demo-assets";
            if (fs.existsSync(target)) {
                const stat = fs.lstatSync(target);
                if (!stat.isDirectory()) {
                    console.log("⚙️ Removing blocking file at install path...");
                    run(`rm -f "${target}"`);
                }
            }
            run(`mkdir -p "${target}"`);
        } catch (err) {
            console.error("❌ Could not prepare install directory:", err.message);
        }
        run(`cp ${SCRIPT_PATH} ${INSTALL_DIR}/create-demo-assets.mjs`);
        run(`npm install --prefix ${INSTALL_DIR} @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/credential-providers`);

        const wrapperContent = `#!/bin/bash
INSTALL_DIR="/usr/local/lib/create-demo-assets"
SCRIPT_PATH="$INSTALL_DIR/create-demo-assets.mjs"
NODE_BIN=$(command -v node)
export NODE_PATH="$INSTALL_DIR/node_modules"
export NODE_OPTIONS="--experimental-specifier-resolution=node"
exec "$NODE_BIN" "$SCRIPT_PATH" "$@"
`;
        fs.writeFileSync("/tmp/create-demo-assets-wrapper", wrapperContent);
        run(`mv /tmp/create-demo-assets-wrapper ${WRAPPER_PATH}`);
        run(`chmod +x ${WRAPPER_PATH}`);

        console.log("✅ Installation complete! Try running: create-demo-assets --help");
        process.exit(0);
    } catch (err) {
        console.error("❌ Installation failed:", err.message);
        process.exit(1);
    }
}

/**
 * AudioShake Demo Asset Builder (v2)
 *
 * Lists all files in s3://audioshake/demo-assets/,
 * generates presigned URLs (default: 12h expiry),
 * and writes demo-assets.json in the same directory as this script.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { fromIni } from "@aws-sdk/credential-providers";

// --- resolve __dirname for ESM ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Ensure NVM global modules (non-fatal) ---
try {
    const nvmBase = path.resolve(process.env.HOME, ".nvm/versions/node");
    if (fs.existsSync(nvmBase)) {
        const versions = fs.readdirSync(nvmBase).filter(v => v.startsWith("v"));
        const latest = versions.sort().pop();
        if (latest) {
            const nvmGlobal = path.join(nvmBase, latest, "lib/node_modules");
            process.env.NODE_PATH = process.env.NODE_PATH
                ? `${process.env.NODE_PATH}:${nvmGlobal}`
                : nvmGlobal;
            // initialize require paths
            const { createRequire } = await import("module");
            createRequire(import.meta.url)("module").Module._initPaths();
        }
    }
} catch (err) {
    console.warn("⚠️  NVM module path not set (non-critical):", err.message);
}

// --- Configuration defaults ---
const REGION = "us-east-1";
const BUCKET = "audioshake";
const PREFIX = "demo-assets/";

// --- CLI arguments ---
const args = process.argv.slice(2);

function getArgValue(flag, fallback = null) {
    const index = args.findIndex(a => a === flag || a.startsWith(flag + "="));
    if (index === -1) return fallback;
    if (args[index].includes("=")) return args[index].split("=")[1];
    return args[index + 1] && !args[index + 1].startsWith("--") ? args[index + 1] : fallback;
}

const PROFILE = getArgValue("--profile", process.env.AWS_PROFILE || "admin");
const EXPIRY_HOURS = Number(getArgValue("--hours", 12));

const UPLOAD_PATH = getArgValue("--upload");
const UPLOAD_DIR = getArgValue("--uploadDir");
const typeArgRaw = getArgValue("--type");
const ALLOWED_TYPES = typeArgRaw
    ? typeArgRaw.split(",").map(t => t.trim().toLowerCase())
    : null;

const listOnly = args.includes("--list");
const showHelp = args.includes("--help") || args.includes("-h");

// --- AWS S3 Client ---
const s3 = new S3Client({
    region: REGION,
    signerRegion: REGION,
    credentials: fromIni({ profile: PROFILE }),
});

// --- Common MIME Type Map ---
const mimeMap = {
    mp4: "video/mp4",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/m4a",
    aac: "audio/aac",
    txt: "text/plain",
    md: "text/markdown",
    srt: "application/x-subrip",
    json: "application/json",
    csv: "text/csv",
    xml: "application/xml",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
};

import { PutObjectCommand } from "@aws-sdk/client-s3";

async function uploadFile(filePath) {
    const resolvedPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(resolvedPath)) {
        console.error(`❌ File not found: ${resolvedPath}`);
        return;
    }
    const ext = path.extname(resolvedPath).replace(".", "").toLowerCase();
    if (ALLOWED_TYPES && !ALLOWED_TYPES.includes(ext)) {
        console.log(`⚠️ Skipped ${path.basename(filePath)} (type filtered)`);
        return;
    }
    const contentType = mimeMap[ext] || "application/octet-stream";
    const key = `${PREFIX}${path.basename(resolvedPath)}`;
    console.log(`🚀 Uploading ${filePath} → s3://${BUCKET}/${key}`);
    try {
        const uploadCmd = new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: fs.createReadStream(resolvedPath),
            ContentType: contentType,
        });
        await s3.send(uploadCmd);
        console.log(`✅ Uploaded ${path.basename(filePath)} (${contentType})`);
    } catch (err) {
        console.error(`❌ Failed to upload ${filePath}:`, err.message);
    }
}

async function uploadDir(dirPath) {
    const resolvedDir = path.resolve(process.cwd(), dirPath);
    if (!fs.existsSync(resolvedDir)) {
        console.error(`❌ Directory not found: ${resolvedDir}`);
        return;
    }
    const allFiles = fs.readdirSync(resolvedDir);
    const files = allFiles.filter(f => {
        const ext = f.split(".").pop().toLowerCase();
        if (!mimeMap[ext]) return false;
        if (ALLOWED_TYPES && !ALLOWED_TYPES.includes(ext)) return false;
        return true;
    });
    if (files.length === 0) {
        console.log("⚠️ No matching files found for upload.");
        return;
    }
    console.log(`🚀 Uploading directory ${dirPath} → s3://${BUCKET}/${PREFIX} (types: ${ALLOWED_TYPES ? ALLOWED_TYPES.join(", ") : "all"})`);
    for (const file of files) {
        await uploadFile(path.join(resolvedDir, file));
    }
    console.log(`🎉 Upload complete (${files.length} files)`);
}

async function handleUpload() {
    if (UPLOAD_PATH) await uploadFile(UPLOAD_PATH);
    if (UPLOAD_DIR) await uploadDir(UPLOAD_DIR);
}

async function listBucket() {
    console.log(`🔍 Listing s3://${BUCKET}/${PREFIX} (list-only mode)...`);
    try {
        const listCmd = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: PREFIX });
        const listResp = await s3.send(listCmd);
        if (!listResp.Contents || listResp.Contents.length === 0) {
            console.log("⚠️  No assets found.");
            return;
        }
        // Filter out folders and, if ALLOWED_TYPES, filter by extension
        let filteredObjs = listResp.Contents.filter(obj => !obj.Key.endsWith("/"));
        if (ALLOWED_TYPES) {
            filteredObjs = filteredObjs.filter(obj => {
                const ext = obj.Key.split(".").pop().toLowerCase();
                return ALLOWED_TYPES.includes(ext);
            });
        }
        filteredObjs.forEach(obj => {
            console.log(`• ${obj.Key} (${(obj.Size / 1024).toFixed(1)} KB)`);
        });
        console.log(`✅ Total files: ${filteredObjs.length}`);
    } catch (err) {
        console.error("❌ Failed to list bucket:", err.message);
    }
}

// --- Main Logic ---
async function buildDemoAssets() {
    console.log(`🔍 Listing objects in s3://${BUCKET}/${PREFIX} using profile "${PROFILE}"${ALLOWED_TYPES ? " (filter: " + ALLOWED_TYPES.join(", ") + ")" : ""}...`);
    const listCmd = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: PREFIX });
    const listResp = await s3.send(listCmd);

    // Optional filtering by type (if provided)
    const objects = listResp.Contents
        ? listResp.Contents.filter(obj => !obj.Key.endsWith("/"))
            .filter(obj => {
                if (!ALLOWED_TYPES) return true;
                const ext = obj.Key.split(".").pop().toLowerCase();
                return ALLOWED_TYPES.includes(ext);
            })
        : [];

    if (ALLOWED_TYPES && objects.length === 0) {
        const typesMsg = ALLOWED_TYPES.join(" or ");
        console.log(`Currently you do not have any ${typesMsg} assets in s3://${BUCKET}/${PREFIX}`);
        console.log("💡 Use --upload or --uploadDir to add these files to your AWS demo-assets bucket.");
        process.exit(0);
    }

    if (!objects || objects.length === 0) {
        console.log("⚠️  No assets found.");
        return;
    }

    const now = new Date();
    const expiryDate = new Date(now.getTime() + EXPIRY_HOURS * 60 * 60 * 1000);

    // --- Generate signed URLs in parallel ---
    const assets = await Promise.all(
        objects.map(async obj => {
            try {
                const getCmd = new GetObjectCommand({ Bucket: BUCKET, Key: obj.Key });
                const signedUrl = await getSignedUrl(s3, getCmd, { expiresIn: EXPIRY_HOURS * 3600 });
                const ext = obj.Key.split(".").pop().toLowerCase();

                return {
                    src: signedUrl,
                    title: obj.Key.replace(PREFIX, ""),
                    format: mimeMap[ext] || "application/octet-stream",
                    expiry: expiryDate.toISOString(),
                };
            } catch (err) {
                console.error(`❌ Failed to sign ${obj.Key}:`, err.message);
                return null;
            }
        })
    );

    const validAssets = assets.filter(Boolean);
    const output = { assets: validAssets };
    const outputPath = path.resolve(process.cwd(), "demo-assets.json");

    try {
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
            console.log("♻️  Existing demo-assets.json removed.");
        }
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
        console.log(`✅ ${validAssets.length} assets written to demo-assets.json (expires in ${EXPIRY_HOURS}h)`);
    } catch (err) {
        console.error("❌ Failed to write demo-assets.json:", err.message);
    }
}

// --- Run ---
if (showHelp) {
    console.log(`
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
  https://github.com/audioshake-dev/demo-assets-tool
`);
    process.exit(0);
}
if (UPLOAD_PATH || UPLOAD_DIR) {
    await handleUpload();
    process.exit(0);
}
if (listOnly) {
    await listBucket();
    process.exit(0);
}
buildDemoAssets().catch(err => {
    console.error("❌ Fatal error:", err.message);
});