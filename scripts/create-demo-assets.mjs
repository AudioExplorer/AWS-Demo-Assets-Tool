#!/usr/bin/env node
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
const profileArg = args.find(a => a.startsWith("--profile="));
const hoursArg = args.find(a => a.startsWith("--hours="));
const PROFILE = profileArg ? profileArg.split("=")[1] : process.env.AWS_PROFILE || "admin";
const EXPIRY_HOURS = hoursArg ? Number(hoursArg.split("=")[1]) : 12;

// --- AWS S3 Client ---
const s3 = new S3Client({
    region: REGION,
    signerRegion: REGION,
    credentials: fromIni({ profile: PROFILE }),
});

// --- Main Logic ---
async function buildDemoAssets() {
    console.log(`🔍 Listing objects in s3://${BUCKET}/${PREFIX} using profile "${PROFILE}"...`);
    const listCmd = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: PREFIX });
    const listResp = await s3.send(listCmd);

    if (!listResp.Contents || listResp.Contents.length === 0) {
        console.log("⚠️  No assets found.");
        return;
    }

    const now = new Date();
    const expiryDate = new Date(now.getTime() + EXPIRY_HOURS * 60 * 60 * 1000);
    const mimeMap = {
        mp4: "video/mp4",
        mov: "video/quicktime",
        mp3: "audio/mpeg",
        wav: "audio/wav",
        m4a: "audio/m4a",
    };

    // --- Generate signed URLs in parallel ---
    const assets = await Promise.all(
        listResp.Contents.filter(obj => !obj.Key.endsWith("/")).map(async obj => {
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
    const outputPath = path.join(__dirname, "demo-assets.json");

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
buildDemoAssets().catch(err => {
    console.error("❌ Fatal error:", err.message);
});