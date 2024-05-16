const express = require("express");
const fs = require("fs");
const path = require("path");
const AWS = require("aws-sdk");
const app = express();
const ejs = require("ejs");
const multer = require("multer");
const upload = multer();
var bodyParser = require("body-parser");

require("dotenv").config();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use("/icons", express.static("icons"));

PORT = process.env.PORT || 4000;
APPURL = process.env.APPURL || "127.0.0.1";

app.listen(PORT, APPURL, () => {
  console.log(`app is running on port http://${APPURL}:${PORT}`);
});

app.get("/", (req, res) => {
  res.render("login");
});

const spacesEndpoint = new AWS.Endpoint(process.env.SPACESENDPOINT);
const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.ACCESSKEYID,
  secretAccessKey: process.env.SECRETACCESSKEY,
});

app.post("/login", (req, res) => {
  const { accessKeyId, secretAccessKey, spaceEndPoint, bucketName } = req.body;
  AWS.config.update({
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  });

  const spacesEndpoint = new AWS.Endpoint(spaceEndPoint);
  const s3 = new AWS.S3({ endpoint: spacesEndpoint });

  const params = { Bucket: bucketName };
  s3.headBucket(params, (err, data) => {
    if (err) {
      console.error("Error:", err);
      res.status(500).send("Internal Server Error");
    } else {
      process.env.ACCESSKEYID = accessKeyId;
      process.env.SECRETACCESSKEY = secretAccessKey;
      process.env.SPACESENDPOINT = spaceEndPoint;
      process.env.BUCKET = bucketName;

      res.redirect("/folders");
    }
  });
});

app.get("/files", (req, res) => {
  const params = {
    Bucket: process.env.BUCKET,
    Prefix: req.query.folder || "",
  };

  s3.listObjectsV2(params, (err, data) => {
    if (err) {
      console.error("Error listing objects: ", err);
      res.status(500).send("Internal Server Error");
    } else {
      const fileList = data.Contents.map(async (item) => {
        const metaData = await s3
          .headObject({ Bucket: process.env.BUCKET, Key: item.Key })
          .promise();
        return {
          Key: item.Key,
          LastModified: metaData.LastModified,
          Size: formatBytes(metaData.ContentLength),
          DownloadUrl: s3.getSignedUrl("getObject", {
            Bucket: process.env.BUCKET,
            Key: item.Key,
            Expires: 3600,
          }),
          ImageUrl:
            "http://" +
            process.env.BUCKET +
            "." +
            process.env.SPACESENDPOINT +
            "/" +
            item.Key,
        };
      });
      Promise.all(fileList)
        .then((files) => {
          files.sort(
            (a, b) => new Date(b.LastModified) - new Date(a.LastModified)
          );
          ejs.renderFile(
            path.join(__dirname, "views", "files.ejs"),
            { files: files },
            (err, html) => {
              if (err) {
                console.error("Error rendering EJS file: ", err);
                res.status(500).send("Internal Server Error");
              } else {
                res.send(html);
              }
            }
          );
        })
        .catch((error) => {
          console.error("Error getting file metadata: ", error);
          res.status(500).send("Internal Server Error");
        });
    }
  });
});

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

app.post("/upload", upload.single("file"), (req, res) => {
  const file = req.file;
  const folderName = req.body.folderName;
  if (!file) {
    return res.status(400).send("No file uploaded");
  } else if (!folderName) {
    return res.status(400).send("select foulder name");
  }
  const key = folderName + "/" + file.originalname;
  const params = {
    Bucket: process.env.BUCKET,
    Key: key,
    Body: file.buffer,
    ACL: 'public-read'
  };

  s3.upload(params, (err, data) => {
    if (err) {
      console.error("Error uploading file:", err);
      return res.status(500).send("Internal Server Error");
    }
    console.log("File uploaded successfully:", data.Location);
    res.sendStatus(200);
  });
});

app.post("/remove", (req, res) => {
  const key = req.body.key;
  if (!key) {
    return res.status(400).send("No file key provided");
  }
  const params = {
    Bucket: process.env.BUCKET,
    Key: key,
  };

  s3.deleteObject(params, (err, data) => {
    if (err) {
      console.error("Error removing file:", err);
      return res.status(500).send("Internal Server Error");
    }
    console.log("File removed successfully:", key);
    res.sendStatus(200);
  });
});

app.get("/folders", (req, res) => {
  const params = {
    Bucket: process.env.BUCKET,
    Delimiter: "/",
  };

  s3.listObjectsV2(params, (err, data) => {
    if (err) {
      console.error("Error listing folders: ", err);
      res.status(500).send("Internal Server Error");
      return;
    }
    const folders = data.CommonPrefixes.map((prefix) => prefix.Prefix);
    res.render("folders", { folders: folders });
  });
});
