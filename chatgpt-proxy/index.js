const functions = require('@google-cloud/functions-framework');
const { Configuration, OpenAIApi } = require('openai');

function removeLineBreaksFromList(list) {
    return list.map((text) => text.replace(/(\r\n|\n|\r)/gm, ""));
}

function generatePrompt(poList, invoiceList) {
    const sanitizedPoList = removeLineBreaksFromList(poList);
    const sanitizedInvoiceList = removeLineBreaksFromList(invoiceList);
    return `I have two lists of item descriptions, one list is from a purchase order and another list is from a corresponding invoice. It is expected that each item in the purchase order list will have a matching item in the invoice list, although there may be mistakes that cause some items to be missing. The invoice list may also contain items not in the purchase order list. Note that descriptions may in Korean, English, or a mix of the two languages.

Can you try to match up the items between the two lists and note any items that have no apparent match? Please format your output as a JSON object that follows the TypeScript interface ListMatchingOutput, which is specified below. Please suppress any additional text in your output so that you only output the JSON object.

interface ListMatchingOutput {
  matches: Array<[purchaseOrderItem: string, invoiceItem: string]>
  unmatched: Array<string>
}

In the interface ListMatchingOutput, the matches property contains an array of tuples of matched items, with the item from the purchase order list at index 0 of each tuple, and the item from the invoice at index 1 of each tuple.

The lists of items are as follows:

Purchase Order List

${sanitizedPoList.join('\n')}

Invoice List

${sanitizedInvoiceList.join('\n')}`;
}

functions.http('helloWorld', async (req, res) => {
    // Set CORS headers for preflight requests
    // Allows GETs from any origin with the Content-Type header
    // and caches preflight response for 3600s

    res.set('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
        // Send response to OPTIONS requests
        res.set('Access-Control-Allow-Methods', 'POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.set('Access-Control-Max-Age', '3600');
        res.status(204).send('');
    }

    if (req.method !== 'POST') {
        // Return a "method not allowed" error
        return res.status(405).end();
    }

    const { poList, invoiceList } = req.body;
    const prompt = generatePrompt(poList, invoiceList);

    const configuration = new Configuration({
        organization: 'org-B01dnPk8c8f6H9kKqIWP92Ef',
        apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);
    const chatCompletion = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [{role: 'user', content: prompt}],
        temperature: 0
    });

    res.send(chatCompletion.data);
});