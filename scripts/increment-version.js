const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '../app.json');
const appJson = require(appJsonPath);

if (!appJson.expo.android.versionCode) {
    appJson.expo.android.versionCode = 1000;
}

const oldVersion = appJson.expo.android.versionCode;
const newVersion = oldVersion + 1;

appJson.expo.android.versionCode = newVersion;

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');

console.log(`✅ Bumped android.versionCode from ${oldVersion} to ${newVersion}`);
