#!/usr/bin/env node

/**
 * AudioShake Demo Asset Builder
 *
 * Lists all files in s3://audioshake/demo-assets/,
 * generates presigned URLs (12h expiry),
 * and writes demo-assets.json
 */

// --- ensure NVM global modules are visible ---
// --- ensure NVM global modules are visible ---
import { createRequire } from 'module';
import { existsSync } from 'fs';
import fs from "fs";
import path from "path";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { fromIni } from "@aws-sdk/credential-providers";

const nvmGlobal = path.resolve(process.env.HOME, '.nvm/versions/node/v21.6.2/lib/node_modules');
if (existsSync(nvmGlobal)) {
    process.env.NODE_PATH = process.env.NODE_PATH
        ? `${process.env.NODE_PATH}:${nvmGlobal}`
        : nvmGlobal;
    createRequire(import.meta.url)('module').Module._initPaths();
}



// --- Configuration ---
const REGION = "us-east-1";
const BUCKET = "audioshake";
const PREFIX = "demo-assets/";
const PROFILE = "admin"; // 🔑 hardcoded KISS profile
const EXPIRY_HOURS = 12;

// --- AWS S3 Client ---
// explicit region
const s3 = new S3Client({
    region: "us-east-1",
    signerRegion: "us-east-1", // ✅ explicit signer region for null LocationConstraint
    forcePathStyle: false,
    credentials: fromIni({ profile: "admin" })
});

// --- Main Logic ---
async function buildDemoAssets() {
    console.log(`🔍 Listing objects in s3://${BUCKET}/${PREFIX} ...`);
    const listCmd = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: PREFIX });
    const listResp = await s3.send(listCmd);

    if (!listResp.Contents || listResp.Contents.length === 0) {
        console.log("⚠️  No assets found.");
        return;
    }

    const now = new Date();
    const expiryDate = new Date(now.getTime() + EXPIRY_HOURS * 60 * 60 * 1000);

    const assets = [];

    for (const obj of listResp.Contents) {
        if (obj.Key.endsWith("/")) continue; // skip folder markers

        // Generate signed URL (GET)
        const getCmd = new GetObjectCommand({ Bucket: BUCKET, Key: obj.Key });
        const signedUrl = await getSignedUrl(s3, getCmd, { expiresIn: EXPIRY_HOURS * 3600 });

        // Detect format
        const ext = obj.Key.split(".").pop().toLowerCase();
        const mimeMap = {
            mp4: "video/mp4",
            mov: "video/quicktime",
            mp3: "audio/mpeg",
            wav: "audio/wav",
            m4a: "audio/m4a"
        };

        assets.push({
            src: signedUrl,
            title: obj.Key.replace(PREFIX, ""),
            format: mimeMap[ext] || "application/octet-stream",
            expiry: expiryDate.toISOString()
        });
    }

    // --- Write output ---
    const output = { assets };
    const outputPath = path.join(process.cwd(), "demo-assets.json");
    if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
        console.log("♻️  Existing demo-assets.json removed.");
    }
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`✅ demo-assets.json created with ${assets.length} assets`);
}

// --- Run ---
buildDemoAssets().catch(err => {
    console.error("❌ Error:", err.message);
});