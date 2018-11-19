const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
// const HTMLParser = require('node-html-parser');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
// fs.readFile('credentials.json', (err, content) => {
//     if (err) return console.log('Error loading client secret file:', err);
//     // Authorize a client with credentials, then call the Google Sheets API.
//
//     authorize(JSON.parse(content), listMajors);
// });
const file = '../../../Downloads/Benchmark/reports-beautiful/10tx-100-total-5-orgs/20181116T093853/reports/report20181116T094055-config-private.json.html';
const roundsIds = ['round 1', "round 2", "round 3", "round 4", "round 5"];
let root = '';

const cheerio = require('cheerio');

fs.readFile(file, function (error, pgResp) {
    if (error) {
        console.log(error);
    } else {
        let bufferOriginal = Buffer.from(JSON.parse(JSON.stringify(pgResp)).data);
        let content = bufferOriginal.toString('utf8');
        const $ = cheerio.load(content);


        let roundsElems = $("[id='round 1']");
        roundsElems.find('table').each(function(i, elem) {
            console.log(elem);
        });
        // console.log(roundsTables);

        // roundsTables.forEach((table) => {
        //     console.log(table.html());
        //     // let roundsElems = $("[id='"+id+"']");
        //     // let roundsTables = roundsElems.find('table');
        //     // console.log("[id='"+id+"']");
        //     // console.log(roundsTables.html());
        // });
        roundsIds.forEach((id) => {
            // let roundsElems = $("[id='"+id+"']");
            // let roundsTables = roundsElems.find('table');
            // console.log("[id='"+id+"']");
            // console.log(roundsTables.html());
        });
        // let el = root.querySelector('[class="right-column"]');
        // let elems = root.querySelector("div:not(#benchmarksummary)");
    }
});

// fs.readFile('complex.html', 'utf8', dataLoaded);
//
// function dataLoaded(err, data) {
//     $ = cheerio.load('' + data + '');
//     $('#topLevelWrapper > div').each(function(i, elem) {
//         var id = $(elem).attr('id'),
//             filename = id + '.html',
//             content = $.html(elem);
//         fs.writeFile(filename, content, function(err) {
//             console.log('Written html to ' + filename);
//         });
//     });
// }

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getNewToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error while trying to retrieve access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function listMajors(auth) {
    const sheets = google.sheets({version: 'v4', auth});
    sheets.spreadsheets.values.get({
        spreadsheetId: '1Sa6cGuxxMSzVp397CbpzmNaY0pMwYGfQmkaSqIOBqkw',
        range: 'Parsed!A9:Q',
    }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const rows = res.data.values;
        if (rows.length) {
            console.log('Name,	Max Latency:');
            // Print columns A and E, which correspond to indices 0 and 4.
            rows.map((row) => {
                console.log(`${row[0]}, ${row[5]}`);
            });
        } else {
            console.log('No data found.');
        }
    });
}

function getDataFromTable(table = ''){
    if(!table){
        return false;
    }


}