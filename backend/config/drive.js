const fs = require('fs');
const { google } = require('googleapis');
const path = require('path');
const { PassThrough } = require('stream');

const credentials = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../credentials.json'), 'utf8')
);

const auth = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

async function uploadToDrive(file) {
  const bufferStream = new PassThrough();
  bufferStream.end(file.buffer);

  const res = await drive.files.create({
    requestBody: {
      name: file.originalname,
      mimeType: file.mimetype,
    },
    media: {
      mimeType: file.mimetype,
      body: bufferStream,
    },
  });

  await drive.permissions.create({
    fileId: res.data.id,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  const publicUrl = `https://drive.google.com/uc?export=view&id=${res.data.id}`;
  return publicUrl;
}

module.exports = uploadToDrive;
