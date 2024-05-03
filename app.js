const express = require('express');
// const { URL } = require('url');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const app = express();


PORT = process.env.PORT || 4000;
APPURL = process.env.APPURL || '127.0.0.1';

app.listen(PORT, APPURL, () => {
   console.log(`app is running on port http://${APPURL}:${PORT}`);
});


const spacesEndpoint = new AWS.Endpoint(process.env.SPACESENDPOINT);
const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.ACCESSKEYID,
  secretAccessKey: process.env.SECRETACCESSKEY
});

// Define an API route to list all files in the bucket
app.get('/files', (req, res) => {
  const params = {
    Bucket: process.env.BUCKET
  };

  s3.listObjectsV2(params, (err, data) => {
    if (err) {
      console.error("Error listing objects: ", err);
      res.status(500).send("Internal Server Error");
    } else {
      const fileList = data.Contents.map(item => item.Key);
      res.json(fileList);
    }
  });
});



// app.get('/upload', (req, res)=>{
   
// });

// AWS.config.update({
//     region: '<your-region>',
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
// });

// // Create a new instance of the S3 class
// const s3 = new AWS.S3();




// Set the parameters for the file you want to upload

// const params = {
//     Bucket: '<your-bucket-name>',
//     Key: 'myFile.txt',
//     Body: fs.createReadStream('path/to/myFile.txt')
// };

// // Upload the file to S3

// s3.upload(params, (err, data) => {
//     if (err) {
//         console.log('Error uploading file:', err);
//     } else {
//         console.log('File uploaded successfully. File location:', data.Location);
//     }
// });

