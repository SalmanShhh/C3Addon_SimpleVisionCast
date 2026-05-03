import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const acesDir = path.join(__dirname, 'src', 'aces');

function listFilesRecursive(dir) {
  const files = fs.readdirSync(dir);
  const result = [];
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      result.push(...listFilesRecursive(filePath));
    } else if (file.endsWith('.js')) {
      result.push(filePath);
    }
  });
  
  return result;
}

const allFiles = listFilesRecursive(acesDir);
const output = allFiles.map(f => f.replace(/\\/g, '/')).join('\n');
fs.writeFileSync(path.join(__dirname, 'ACE_FILES_LIST.txt'), output);
console.log(`Found ${allFiles.length} ACE files`);
console.log(output);
