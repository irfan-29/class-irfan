const { google } = require('googleapis');
const readline = require('readline');

const CLIENT_ID = '558744717211-p9n9m2gseolpqianpj9p9oo2j7k32hfp.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const authUrl = oauth2Client.generateAuthUrl({
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
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err);
    console.log('Your refresh token is:', token.refresh_token);
  });
});

