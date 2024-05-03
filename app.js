const express = require('express');
const { URL } = require('url');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const app = express();

PORT = process.env.PORT || 4000;
APPURL = process.env.APPURL || '127.0.0.1';

app.listen(PORT, APPURL, () => {
   console.log(`app is running on port http://${APPURL}:${PORT}`);
});