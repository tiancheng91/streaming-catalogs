import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import addon from './addon.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === 'production') {
    const errorLog = fs.createWriteStream(path.join(__dirname, 'vue', 'dist', 'error.log'));
    process.stderr.write = errorLog.write.bind(errorLog);

    process.on('uncaughtException', function (err) {
        console.error((err && err.stack) ? err.stack : err);
    });
}

const app = express();
app.set('trust proxy', true)
app.use(cors());

let movies = {trend: [], nfx: [], lin: []};
let series = {trend: [], nfx: [], lin: []};

async function loadNewCatalog() {
    console.log('loadNewCatalog');

    series.trend = await addon.getMetas('SHOW', ['nfx', 'atp', 'hbm'], 'US');
    series.nfx = await addon.getMetas('SHOW', ['nfx'], 'US');
    series.lin = await addon.getMetas("SHOW", ['nfx', 'atp', 'lin'], 'JP');

    movies.trend = await addon.getMetas('MOVIE', ['nfx', 'atp', 'hbm'], 'US');
    movies.nfx = await addon.getMetas('MOVIE', ['nfx'], 'US');
    movies.lin = await addon.getMetas("MOVIE", ['nfx', 'atp', 'lin'], 'JP');

    console.log('done');
}


app.get('/manifest.json', (req, res) => {
    res.setHeader('Cache-Control', 'max-age=86400,stale-while-revalidate=86400,stale-if-error=86400,public');
    res.setHeader('content-type', 'application/json');

    // parse config
    const selectedProviders = [
        {key: "trend", name: "Trending"},
        {key: "nfx", name: "Netflix"},
        {key: "lin", name: "Line"}
    ]

    let catalogs = [];
    selectedProviders.forEach(row => {
        catalogs.push({
            id: row.key,
            type: 'movie',
            name: row.name,
        });
        catalogs.push({
            id: row.key,
            type: 'series',
            name: row.name,
        });
    })

    // show catalogs for providers
    res.send({
        id: 'net.appsvc.streamcategory',
        logo: 'https://play-lh.googleusercontent.com/TBRwjS_qfJCSj1m7zZB93FnpJM5fSpMA_wUlFDLxWAb45T9RmwBvQd5cWR5viJJOhkI',
        version: process.env.npm_package_version,
        name: 'Streaming Catalogs(中文)',
        description: '美剧/日剧榜单',
        catalogs: catalogs,
        resources: ['catalog'],
        types: ['series', 'movie'],
        idPrefixes: ['tt']
    });
})

app.get('/catalog/:type/:id/:extra?.json', (req, res) => {
    res.setHeader('Cache-Control', 'max-age=86400,stale-while-revalidate=86400,stale-if-error=86400,public');
    res.setHeader('content-type', 'application/json');

    let id = req.params.id;

    if (req.params.type === 'movie') {
        res.send({ metas: movies[id] });
        return;
    }

    if (req.params.type === 'series') {
        res.send({ metas: series[id] });
        return;
    }

    return;
})

loadNewCatalog();
setInterval(loadNewCatalog, process.env.REFRESH_INTERVAL || 21600000);

app.listen(process.env.PORT || 9000, () => {
    console.log('http://127.0.0.1:9000/manifest.json');
});