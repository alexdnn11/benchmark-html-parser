// include modules
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const {google} = require('googleapis');
const cheerio = require('cheerio');
var klawSync = require('klaw-sync');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

//Other definition
const spreadsheetId = '1Sa6cGuxxMSzVp397CbpzmNaY0pMwYGfQmkaSqIOBqkw';
var rows = []; //all parsed results
var dataRange;
var dataValues;
const measures = [' tps', ' s', 'MB'];
const signaturesFromPath = [
  {name: 'config.', DB: 'LevelDB', collection: 'N'},
  {name: 'config-private.', DB: 'LevelDB', collection: 'Y'},
  {name: 'config-couch.', DB: 'CouchDB', collection: 'N'},
  {name: 'config-couch-private.', DB: 'CouchDB', collection: 'Y'},
];
const roundsIds = ['round 1', "round 2", "round 3", "round 4", "round 5"];
// The directory that you want to explore
var directoryToExplore = "../benchmark-reports/";


//Start parsing
var parse = new Promise(function (resolve, reject) {
  // console.log('Doing');
  //Collect all html-files in array paths[]
  var pathList = getListHtmlFiles();

  //loop for each html-file
  pathList.forEach((filePath) => {
    fs.readFile(filePath.path, function (error, pgResp) {
      if (error) {
        console.log(error);
      } else {
        //get one full-row from html-file
        parseValueFromHtml(pgResp, filePath.path);
      }
    });
  });
  resolve(rows);
});

parse.then(function successHandler(result) {
    // Load client secrets from a local file.
    fs.readFile('credentials.json', (err, content) => {
        // Authorize a client with credentials, then call the Google Sheets API.
        dataRange  ='Summary!D12';
        dataValues =result;
        authorize(JSON.parse(content), rowWriteToSpreadsheet);
    });
}, function failureHandler(error) {
    console.log('Wrong!');
});

function parseValueFromHtml(pgResp, filePath) {
  let bufferOriginal = Buffer.from(JSON.parse(JSON.stringify(pgResp)).data);
  let content = bufferOriginal.toString('utf8');
  const $ = cheerio.load(content);
  let row = []; //one full row after parsing
  let signatures = ['', ''];

  try {
    row.push(JSON.parse($('pre#benchmarkInfo').text()).clients.number);
  }catch (e) {
    row.push('');
  }

  signaturesFromPath.forEach((config) => {
    if (filePath.includes(config.name)) {
      signatures[0] = config.DB;
      signatures[1] = config.collection;
    }
  });

  signatures.forEach((signature) => {
    row.push(signature);
  });

  roundsIds.forEach((id) => {
    let roundElemsTd = $("[id='" + id + "'] " + "table tr td").each(function () {
      let value = $(this).text();
      if (!value.includes("Process") && !value.includes("node local-client.js")) {
        //clean measure
        measures.forEach((measure) => {
          value = value.replace(measure, '');
        });
        row.push(value);
      }

    });
    rows.push(row);
  });
}

function getListHtmlFiles() {
  let paths = [];
  const filterFn = item => {
    const basename = path.basename(item.path);
    return basename.substr(basename.length - 4) !== 'json' && basename.substr(basename.length - 3) !== 'log'
  };

  try {
    paths = klawSync(directoryToExplore, {nodir: true, filter: filterFn});
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

function rowWriteToSpreadsheet(auth) {
  const sheets = google.sheets({version: 'v4', auth});

  let range = dataRange;
  let majorDimension = 'ROWS';

  let values = dataValues;
  const data = [{
    range,
    values,
    majorDimension,
  }];
  // Additional ranges to update ...
  let valueInputOption = 'USER_ENTERED';
  const resource = {
    data,
    valueInputOption,
  };

  sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    resource,
  }, (err, results) => {
    if (err) {
      // Handle error
      console.log(err);
    } else {
      console.log('Successfull!');
    }
  });

}

function getDataFromTable(table = '') {
  if (!table) {
    return false;
  }


}
