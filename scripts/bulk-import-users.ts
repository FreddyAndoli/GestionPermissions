#!/usr/bin/env tsx
/**
 * Script d'import en masse d'utilisateurs
 *
 * Usage :
 *   npx tsx scripts/bulk-import-users.ts < users.csv
 *   ou
 *   npx tsx scripts/bulk-import-users.ts users.csv
 *
 * Format CSV (sans en-tête) :
 *   email,firstName,lastName,password,roleName
 *
 * Exemple :
 *   jean@exemple.com,Jean,Dupont,password123,Employe
 *   marie@exemple.com,Marie,Martin,password123,Manager
 */

import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: path.resolve(__dirname, '../backend/.env') });

const API_URL = process.env.API_URL || 'http://localhost:3001/api/v1';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''; // Token Firebase de l'admin

async function importUsers(filePath?: string) {
  let csvContent: string;

  if (filePath) {
    csvContent = fs.readFileSync(filePath, 'utf-8');
  } else {
    // Read from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    csvContent = Buffer.concat(chunks).toString('utf-8');
  }

  const lines = csvContent.split('\n').filter(l => l.trim() && !l.startsWith('email,'));

  const users = lines.map(line => {
    const [email, firstName, lastName, password, roleName] = line.split(',').map(s => s.trim());
    return { email, firstName, lastName, password, roleName };
  }).filter(u => u.email && u.firstName);

  if (users.length === 0) {
    console.error('Aucun utilisateur trouvé dans le CSV');
    process.exit(1);
  }

  console.log(`Import de ${users.length} utilisateur(s)...`);

  const response = await fetch(`${API_URL}/users/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ADMIN_TOKEN}`
    },
    body: JSON.stringify({ users })
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Erreur API:', err);
    process.exit(1);
  }

  const result = await response.json();
  console.log('\n✅ Import termine !');
  console.log(`   Crees : ${result.created}`);
  if (result.errors?.length) {
    console.log(`   Erreurs : ${result.errors.length}`);
    result.errors.forEach((e: any) => console.log(`   - ${e.email}: ${e.error}`));
  }
}

const file = process.argv[2];
if (file && file !== '-') {
  importUsers(file).catch(console.error);
} else {
  importUsers().catch(console.error);
}
