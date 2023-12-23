const functions = require("@google-cloud/functions-framework");
const fs = require("fs");

// lib
const { Storage: Storage, TransferManager } = require("@google-cloud/storage"),
  os = require("os"),
  path = require("path"),
  storage = new Storage();

const bucketName = "gs://whitehurst-cook-book";
const getRecipePath = (recipeId) => `recipes/${recipeId}.json`;
const bucket = storage.bucket(bucketName);

function tempPath() {
  return path.join(os.tmpdir(), "temp-" + Date.now() + ".json");
}
function enableCors(e, t) {
  return (
    t.set("Access-Control-Allow-Origin", "*"),
    "OPTIONS" === e.method &&
      (t.set("Access-Control-Allow-Methods", "GET, PUT, POST"),
      t.set("Access-Control-Allow-Headers", "Content-Type"),
      t.set("Access-Control-Max-Age", "3600"),
      t.status(204).send(""),
      !0)
  );
}
async function writeJsonToFile(fileName, jsonObject) {
  return new Promise((resolve, reject) => {
    const jsonString = JSON.stringify(jsonObject);
    const filename = fileName;
    fs.writeFile(filename, jsonString, 'utf8', (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(filename);
      }
    });
  });
}
async function getFile(e, t) {
  const o = tempPath();
  try {
    await storage.bucket(e).file(t).download({ destination: o });
  } catch (e) {
    await writeJsonToFile(o, {"err": "not found"});
  } finally {
  }
  return o;
}
async function uploadFile(e, d, t) {
  try {
    await storage.bucket(e).upload(t, {
      gzip: true,
      destination: d,
      metadata: {
        cacheControl: 'no-cache',
      },
    });
    console.log(`${fileName} uploaded to ${bucketName}.`);
  } catch (error) {
    console.error('ERROR:', error);
  }
}
async function getFolder(t) {
  const transferManager = new TransferManager(bucket);
  return transferManager.downloadManyFiles(t);
}
function getIdFromPath(path) {
  const id = path.split("/")[2].split("?")[0];
  return id;
}
// end lib

functions.http("recipes", (req, res) => {
  if (enableCors(req, res)) return;
  if (req.method === "GET") {
    const path = req.path;    
    if (path.startsWith("/recipe")) {
      const id = getIdFromPath(path);
      recipePath = getRecipePath(id);
      try {
        getFile(bucketName, recipePath)
          .then((temp) => fs.readFileSync(temp, "utf8"))
          .then((file) => res.send(file));
      } catch (e) {
        res.send("Not Found");
      }
    } else if (path.startsWith("/search")) {
      const dec = new TextDecoder("utf-8");
      getFolder("recipes")
        .then((files) => {
          const idx = [];
          for (let i = 0; i < files.length; i++) {
            let file = dec.decode(new Uint8Array(files[i][0]));
            idx.push(file);
          }
          res.send(JSON.stringify(idx));
        });
    } else if (path.startsWith("/most-recent/")) {
      const date = new Date(path.split("/")[2] ? path.split("/")[2] : "1970-01-01");
      let filesMeta = {}
      bucket.getFilesStream()
        .on('error', console.error)
        .on('data', function(file) {
          if (new Date(file.metadata.updated) < date 
            || file.metadata.name.indexOf("recipes/") !== 0 
            || file.metadata.name == "recipes/"
          ) {
            return;
          }
          filesMeta[file.metadata.name] = file.metadata.updated;
        })
        .on('end', function() {
          filesMeta = Object.entries(filesMeta).sort((a,b) => {
            return new Date(b[1]) - new Date(a[1]);
          });
          res.send(JSON.stringify({"mostRecentUpdate": filesMeta[0]}));
        });
    } else if (path.startsWith("/all-recipes-older-than/")) {
      const date = new Date(path.split("/")[2] ? path.split("/")[2] : "1970-01-01");
      let filesMeta = {}
      const dec = new TextDecoder("utf-8");
      bucket.getFilesStream()
        .on('error', console.error)
        .on('data', function(file) {
          if (new Date(file.metadata.updated) < date 
            || file.metadata.name.indexOf("recipes/") !== 0 
            || file.metadata.name == "recipes/"
          ) {
            return;
          }
          filesMeta[file.metadata.name] = file.metadata.updated;
        })
        .on('end', function() {
          let fileNames = Object.entries(filesMeta);
          // extract file names
          fileNames = fileNames.map((file) => {
            return file[0];
          });

          getFolder(fileNames)
          .then((files) => {
            const idx = [];
            for (let i = 0; i < files.length; i++) {
              let file = dec.decode(new Uint8Array(files[i][0]));
              idx.push(file);
            }
            res.send(JSON.stringify(idx));
          });
        });
    } else {
      res.send("404");
    }
  } else if (req.method === "POST") {
    if (req.path.startsWith("/recipe")) {
      const id = getIdFromPath(req.path);
      const recipeJson = req.body;
      writeJsonToFile(tempPath(), recipeJson)
        .then((filename) => uploadFile(bucketName, getRecipePath(id), filename))
        .then((_) => res.send(id));
    }
  } else {
    res.send("404");
  }
});
