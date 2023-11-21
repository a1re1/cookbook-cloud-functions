const functions = require('@google-cloud/functions-framework');
const fs = require('fs');

// lib
const{Storage:Storage}=require("@google-cloud/storage"),os=require("os"),path=require("path"),storage=new Storage;function tempPath(){return path.join(os.tmpdir(),"temp-"+Date.now()+".json")}function enableCors(e,t){return t.set("Access-Control-Allow-Origin","*"),"OPTIONS"===e.method&&(t.set("Access-Control-Allow-Methods","GET, PUT, POST"),t.set("Access-Control-Allow-Headers","Content-Type"),t.set("Access-Control-Max-Age","3600"),t.status(204).send(""),!0)}async function getFile(e,t){const o=tempPath();try{await storage.bucket(e).file(t).download({destination:o})}finally{}return o}

const bucketName = "gs://whitehurst-cook-book"
const recipePath = 'recipes/testRecipes.json'

functions.http('recipes', (req, res) => {
  if (enableCors(req, res)) return;
  if (req.method === 'GET') {
    getFile(bucketName, recipePath)
      .then(temp => fs.readFileSync(temp, 'utf8'))
      .then((file) => res.send(file));
  } else if (req.method === 'POST') {
    // todo create recipe
  } else if (req.method === 'PUT') {
    // todo update recipe
  }
});

// function updateRecipe(recipeId, recipeJson, res) {
//   writeJsonToTempFile(recipeJson)
//     .then(filename =>
//       uploadFile(filename, recipeId).then(_ => filename)
//     )
//     .then(filename =>
//         fs.unlink(filename, () => res.send(recipeId))
//     )
// }

// function writeJsonToTempFile(jsonObject) {
//   return new Promise((resolve, reject) => {
//     const jsonString = JSON.stringify(jsonObject);
//     const filename = tempPath();
//     fs.writeFile(filename, jsonString, 'utf8', (err) => {
//       if (err) {
//         reject(err);
//       } else {
//         resolve(filename);
//       }
//     });
//   });
// }
//
// async function uploadFile(fileName) {
//   try {
//     await storage.bucket(bucketName).upload(fileName, {
//       gzip: true,
//       destination: "recipes",
//       metadata: {
//         cacheControl: 'no-cache',
//       },
//     });
//
//     console.log(`${fileName} uploaded to ${bucketName}.`);
//   } catch (error) {
//     console.error('ERROR:', error);
//   }
// }

// function tempPath() {
//   return path.join(os.tmpdir(), 'temp-' + Date.now() + '.json');
// }
// function enableCors(req, res) {
//   res.set('Access-Control-Allow-Origin', '*');
//   if (req.method === 'OPTIONS') {
//     res.set('Access-Control-Allow-Methods', 'GET, PUT, POST');
//     res.set('Access-Control-Allow-Headers', 'Content-Type');
//     res.set('Access-Control-Max-Age', '3600');
//     res.status(204).send('');
//     return true;
//   }
//   return false;
// }