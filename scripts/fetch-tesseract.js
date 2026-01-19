import fs from 'fs';
import path from 'path';

async function fetchToFile(url, dest) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
        const ab = await res.arrayBuffer();
        fs.writeFileSync(dest, Buffer.from(ab));
        console.log(`Saved ${dest}`);
    } catch (err) {
        console.error(`Error saving ${url} -> ${dest}:`, err);
        throw err;
    }
}

(async () => {
    const outDir = path.join(process.cwd(), 'public', 'tesseract');
    fs.mkdirSync(outDir, { recursive: true });

    const files = [
        {
            url: 'https://cdn.jsdelivr.net/npm/tesseract.js@v7.0.0/dist/worker.min.js',
            name: 'worker.min.js'
        },
        {
        },
        {
            url: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',
            name: 'eng.traineddata.gz'
        },
        {
            url: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/swe/4.0.0_best_int/swe.traineddata.gz',
            name: 'swe.traineddata.gz'
        }
    ];

    for (const f of files) {
        const dest = path.join(outDir, f.name);
        try {
            await fetchToFile(f.url, dest);
        } catch (e) {
            console.warn('Continuing despite fetch failure for', f.url);
        }
    }
    console.log('fetch-tesseract: done');
})();
