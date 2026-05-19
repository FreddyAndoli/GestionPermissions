#!/usr/bin/env node
/**
 * Checks if Docker Compose ports are available and finds safe alternatives.
 *
 * On Windows, Hyper-V reserves port ranges that Docker cannot bind to.
 * This script checks your docker-compose.yml ports against Windows
 * excluded ranges and suggests (or applies) fixes.
 *
 * Usage:
 *   node scripts/check-ports.mjs
 *   node scripts/check-ports.mjs --auto-fix
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'net';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTO_FIX = process.argv.includes('--auto-fix');

const composePath = join(__dirname, '..', 'docker-compose.yml');
const composeContent = readFileSync(composePath, 'utf-8');

// ─── Parse port mappings from docker-compose.yml ─────────────────────────
const PORT_REGEX = /-\s*"(\d+):(\d+)"/g;
const portMappings = [];
let m;
while ((m = PORT_REGEX.exec(composeContent)) !== null) {
    portMappings.push({
        hostPort: parseInt(m[1], 10),
        containerPort: parseInt(m[2], 10),
        fullMatch: m[0]
    });
}

if (portMappings.length === 0) {
    console.log('No host:container port mappings found in docker-compose.yml');
    process.exit(0);
}

console.log('\n=== Port Check for docker-compose.yml ===\n');

// ─── Get Windows excluded port ranges ─────────────────────────────────────
let excludedRanges = [];
try {
    const netshOutput = execSync(
        'netsh interface ipv4 show excludedportrange protocol=tcp',
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    const rangeRegex = /(\d+)\s+(\d+)/g;
    let rm;
    while ((rm = rangeRegex.exec(netshOutput)) !== null) {
        excludedRanges.push({
            start: parseInt(rm[1], 10),
            end: parseInt(rm[2], 10)
        });
    }
} catch {
    console.warn('Could not retrieve excluded port ranges from netsh.');
}

// ─── Check if a port is already bound on this machine ───────────────────
function isPortBound(port) {
    return new Promise((resolve) => {
        const server = createServer();
        server.once('error', () => resolve(true));
        server.once('listening', () => {
            server.close();
            resolve(false);
        });
        server.listen(port);
    });
}

// ─── Check each port ──────────────────────────────────────────────────────
const conflicts = [];
for (const mapping of portMappings) {
    const hostPort = mapping.hostPort;
    const excluded = excludedRanges.find(r => hostPort >= r.start && hostPort <= r.end);
    const bound = await isPortBound(hostPort);

    let status, color;
    if (excluded) {
        status = `BLOCKED by Windows (reserved range ${excluded.start}-${excluded.end})`;
        color = '\x1b[31m'; // Red
        conflicts.push(mapping);
    } else if (bound) {
        status = 'BOUND (likely in use by Docker or another process)';
        color = '\x1b[33m'; // Yellow — not a hard conflict, just already running
    } else {
        status = 'OK';
        color = '\x1b[32m'; // Green
    }

    const reset = '\x1b[0m';
    console.log(`  Host port ${hostPort} -> container ${mapping.containerPort} : ${color}${status}${reset}`);
}

// ─── Suggest alternatives ─────────────────────────────────────────────────
if (conflicts.length > 0) {
    console.log('\n=== Conflicts Detected ===\n');

    const safePorts = [];
    for (let candidate = 5000; candidate <= 65535 && safePorts.length < conflicts.length * 2 + 5; candidate++) {
        const inExcluded = excludedRanges.some(r => candidate >= r.start && candidate <= r.end);
        if (inExcluded) continue;

        const bound = await isPortBound(candidate);
        if (bound) continue;

        // Skip common service ports to avoid future collisions
        const isCommonPort = [3306, 3307, 6379, 6380, 80, 443, 3000, 4000].includes(candidate);
        if (isCommonPort) continue;

        safePorts.push(candidate);
    }

    console.log('Suggested safe host ports:');
    const replacementMap = {};
    for (let i = 0; i < conflicts.length; i++) {
        const conflict = conflicts[i];
        const suggested = safePorts[i];
        replacementMap[conflict.hostPort] = suggested;
        console.log(`  \x1b[36m${conflict.hostPort} -> ${suggested} (container still ${conflict.containerPort})\x1b[0m`);
    }

    if (AUTO_FIX) {
        console.log('\nApplying fixes to docker-compose.yml...');

        let newContent = composeContent;
        for (const [oldPort, newPort] of Object.entries(replacementMap)) {
            // Replace exact port mapping lines
            const pattern = new RegExp(`(-\\s*")${oldPort}(:[^"]+")`, 'g');
            newContent = newContent.replace(pattern, `$1${newPort}$2`);

            // Update NEXT_PUBLIC_API_URL if backend port changed
            if (oldPort === '4000' || oldPort === '8080') {
                newContent = newContent.replace(
                    new RegExp(`http://localhost:${oldPort}/api/v1`, 'g'),
                    `http://localhost:${newPort}/api/v1`
                );
            }
        }

        // Backup original
        const backupPath = composePath + '.backup.' + new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
        copyFileSync(composePath, backupPath);
        writeFileSync(composePath, newContent, 'utf-8');

        console.log('\n\x1b[32mDone! Backup saved to:\x1b[0m');
        console.log(`  ${backupPath}`);
        console.log('\n\x1b[36mRun the following to restart with new ports:\x1b[0m');
        console.log('  docker-compose down');
        console.log('  docker-compose up -d');
    } else {
        console.log('\n\x1b[36mRun with --auto-fix to apply changes automatically:\x1b[0m');
        console.log('  node scripts/check-ports.mjs --auto-fix');
    }
} else {
    console.log('\n\x1b[32mAll ports are available. No changes needed.\x1b[0m');
}

console.log('');
