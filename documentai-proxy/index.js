const functions = require('@google-cloud/functions-framework');
const fs = require('fs');
const {DocumentProcessorServiceClient} = require('@google-cloud/documentai').v1;
const Busboy = require('busboy');

const projectId = '64184610370';
const location = 'us';
const processorId = '7ecd2f9f8b3b8776';

async function processDocument(buffer) {
    const client = new DocumentProcessorServiceClient();
    const processorName = `projects/${projectId}/locations/${location}/processors/${processorId}`;
    const request = {
        name: processorName,
        rawDocument: {
            content: buffer.toString('base64'),
            mimeType: 'application/pdf',
        },
    };

    return await client.processDocument(request);
}

functions.http('helloHttp', async (req, res) => {
    // Set CORS headers for preflight requests
    // Allows GETs from any origin with the Content-Type header
    // and caches preflight response for 3600s

    res.set('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
        // Send response to OPTIONS requests
        res.set('Access-Control-Allow-Methods', 'GET');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.set('Access-Control-Max-Age', '3600');
        res.status(204).send('');
    }

    if (req.method !== 'POST') {
        // Return a "method not allowed" error
        return res.status(405).end();
    }

    const busboy = Busboy({headers: req.headers});
    let fileBufferPromise;

    busboy.on('file', (fieldname, fileStream) => {
        const chunks = [];
        fileStream.on('data', (chunk) => chunks.push(chunk));
        fileBufferPromise = new Promise((resolve, reject) => {
            fileStream.once('error', (err) => reject(err));
            fileStream.once('end', () => resolve(Buffer.concat(chunks)));
        })
    });

    busboy.on('close', async () => {
        const buffer = await fileBufferPromise;
        return res.send(await processDocument(buffer));
    });

    busboy.end(req.rawBody);
});
