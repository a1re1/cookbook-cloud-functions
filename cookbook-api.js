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
      fetchCache()
        .then((temp) => fs.readFileSync(temp, "utf8"))
        .then((file) => res.send(file));
    } else if (path.startsWith("/rebuild-cache/")) {
      rebuildSearchIdxCache()
        .then((_) => res.send("ok"));
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

function fetchCache() {
  return getFile(bucketName, "searchIdx-cache.json");
}

function rebuildSearchIdxCache() {
  const dec = new TextDecoder("utf-8");
  return getFolder("recipes")
    .then((files) => {
      const idx = [];
      for (let i = 0; i < files.length; i++) {
        let file = dec.decode(new Uint8Array(files[i][0]));
        idx.push(file);
      }
      return idx;
    }).then((idx) => {
      return writeJsonToFile(tempPath(), idx)
        .then((filename) => uploadFile(bucketName, "searchIdx-cache.json", filename));
    });;
}