import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data/db.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_FILE))) {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}

export async function readDb() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            return {};
        }
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error('Failed to read database:', e);
        return {};
    }
}

export async function writeDb(data: any) {
    try {
        const currentData = await readDb();
        const newData = { ...currentData, ...data };
        fs.writeFileSync(DB_FILE, JSON.stringify(newData, null, 2));
    } catch (e) {
        console.error('Failed to write to database:', e);
    }
}
