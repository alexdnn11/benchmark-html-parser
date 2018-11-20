// include modules
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const {google} = require('googleapis');
const cheerio = require('cheerio');
var klawSync = require('klaw-sync');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

//Other definition
const spreadsheetId = '1Sa6cGuxxMSzVp397CbpzmNaY0pMwYGfQmkaSqIOBqkw';
const valueInputOption = null;
var   rows = []; //all parsed results

var parse = new Promise(function(resolve, reject) {
    // console.log('Doing');
    //Collect all html-files in array paths[]
    var pathList = getListHtmlFiles();

    //loop for each html-file
    pathList.forEach((filePath)=>{
        fs.readFile(filePath.path, function (error, pgResp) {
            if (error) {
                console.log(error);
            } else {
                //get one full-row from html-file
                parseValueFromHtml(pgResp);
            }
        });
    });
    resolve(pathList);
});

parse.then(function successHandler(result) {
    console.log(result.length);
    // Load client secrets from a local file.
    fs.readFile('credentials.json', (err, content) => {
        // if (err) return console.log('Error loading client secret file:', err);
        // var rowCurrent = 1;
        // rows.push(row);
        //
        // let rowStr = '';
        // row.forEach((cell)=>{
        //      rowStr += ' ' + cell;
        // });
        // console.log(rowStr);

        // Authorize a client with credentials, then call the Google Sheets API.
        // var dataRange  ='Parsed!A'+rowCurrent+':N';
        // var dataValues =row;
        // authorize(JSON.parse(content), listMajors);
        // rowCurrent +=1;
    });
}, function failureHandler(error) {
    console.log('Wrong!');
});

function parseValueFromHtml(pgResp) {
    const roundsIds = ['round 1', "round 2", "round 3", "round 4", "round 5"];
    let bufferOriginal = Buffer.from(JSON.parse(JSON.stringify(pgResp)).data);
    let content = bufferOriginal.toString('utf8');
    const $ = cheerio.load(content);

    roundsIds.forEach((id) => {
        let row = []; //one full row after parsing
        let roundElemsTd = $("[id='"+id+"'] "+"table tr td").each( function(){
            let value = $(this).text();
            if (!value.includes("Process") && !value.includes("node local-client.js")){
                //clean measure
                value = value.replace(' tps','');
                value = value.replace(' s','');
                value = value.replace('MB','');
                row.push(value);
            }

        });
        rows.push(row);
    });
}

function getListHtmlFiles(){
    let paths = [];
    const filterFn = item => {
        const basename = path.basename(item.path);
        return basename.substr(basename.length - 4) !== 'json' &&  basename.substr(basename.length - 3) !== 'log'
    };

// The directory that you want to explore
    var directoryToExplore = "../benchmark-reports/";

    try {
        paths = klawSync(directoryToExplore,{nodir: true, filter: filterFn});
    } catch (err) {
        console.error(err);
    }
    return paths;
}
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

function rowWriteToSpreadsheet(auth, dataRange, dataValues) {
    const sheets = google.sheets({version: 'v4', auth});

    const data = [{
        dataRange,
        dataValues,
    }];
    // Additional ranges to update ...
    const resource = {
        data,
        valueInputOption,
    };
    // console.log(this);
    this.sheetsService.spreadsheets.values.batchUpdate({
        spreadsheetId,
        resource,
    }, (err, result) => {
        if (err) {
            // Handle error
            console.log(err);
        } else {
            console.log('%d cells updated.', result.totalUpdatedCells);
        }
    });

    sheets.spreadsheets.values.get({
        spreadsheetId: '1Sa6cGuxxMSzVp397CbpzmNaY0pMwYGfQmkaSqIOBqkw',
        range: 'Parsed!A9:Q',
    }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const rowsRead = res.data.values;
        if (rowsRead.length) {
            console.log('Name,	Max Latency:');
            // Print columns A and E, which correspond to indices 0 and 4.
            rowsRead.map((rowRead) => {
                console.log(`${rowRead[0]}, ${rowRead[5]}`);
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