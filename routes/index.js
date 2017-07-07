var express = require('express');
var router = express.Router();
var ObjectId = require('mongodb').ObjectID;
var fs = require('fs');
var uuidv4 = require('uuid/v4');

function dbFindOne(collection, fields) {
  return new Promise((resolve, reject) => {
    collection.findOne(fields, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

function dbFindMany(collection, fields, limit, sort) {
  return new Promise((resolve, reject) => {
      collection.find(fields, (err, result) => {
          if (err) {
              reject(err);
          } else {
              resolve(result);
          }
      });
  });
}

function checkIfNotEmpty(obj) {
  return new Promise((resolve, reject) => {
      if (obj == null) {
          resolve('OK');
      }
      if (Object.keys(obj).length > 0) {
          reject('EDUP');
      } else {
          resolve('OK');
      }
  });
}

function dbInsert(collection, obj) {
  return new Promise((resolve, reject) => {
      collection.insert(obj, (err, result) => {
          if (err) {
              reject(err);
          } else {
              resolve(result);
          }
      });
  });
}

function dbUpdate(collection, obj, field) {
  return new Promise((resolve, reject) => {
    collection.update(obj, field, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

function generateUUID() {
  return uuidv4();
}

router.post('/profile/save', (req, res, next) => {
//  console.log(req.body);
console.log(req.session);
  if (typeof req.session.user !== 'undefined' && typeof req.body.raw !== 'undefined') {
    let raw = req.body.raw;
    let rawParts = raw.split(',');
    let imageData = rawParts[1];
    let rawMetaData = rawParts[0];
    let rawMetaParts = rawMetaData.split(':');
    let rawMetaParts2 = rawMetaParts[1].split(';');
    let rawMetaParts3 = rawMetaParts2[0].split('/');
    let imgType = rawMetaParts3[1];
    console.log(imgType);
    let uuid = generateUUID();
    let newFileName = 'public/assets/users/avatars/'+uuid+'_profile'+'.'+imgType;

    fs.writeFile(newFileName, imageData, 'base64', (err) => {
      if (err) {
        res.status(500).send(JSON.stringify(err));
      } else {
        newFileName = 'assets/users/avatars/'+uuid+'_profile'+'.'+imgType;
        let Users = req.db.get('users');
        dbUpdate(Users, {_id: new ObjectId(req.session.user._id)}, { $set: {profileURL: newFileName}})
        .then((result) => {
          let saveResult = {
            status: 'OK',
            filename: newFileName
          }
          req.session.user.profileURL = newFileName;
          res.status(200).send(JSON.stringify(saveResult));
        })
        .catch((err) => {
          res.status(500).send(JSON.stringify(err));
        });
      }
    });
  } else {
    res.status(403).send('bad input');
  }
});

router.post('/profile/upload', (req, res, next) => {
//  console.log(req.files);
  if (typeof req.session.user !== 'undefined' && typeof req.files.file !== 'undefined') {
    let newFileName = 'public/assets/tmp/'+req.files.file.uuid+'_'+req.files.file.filename;
    fs.rename(req.files.file.file, newFileName, (e) => {
      if (e) {
        res.status(500).send(JSON.stringify(e));
      }
      newFileName = 'assets/tmp/'+req.files.file.uuid+'_'+req.files.file.filename;
      let result = {
        status: 'OK',
        filename: newFileName
      }
      res.status(200).send(JSON.stringify(result));
    });
  } else {
    res.status(403).send(JSON.stringify(req));
  }
});

router.get('/checksession', (req, res, next) => {
  let response = {
    ok: 0
  };
  if (typeof req.session.key !== 'undefined') {
    response.ok = 1;
    response.user = {
      uname: req.session.user.uname,
      id: req.session.user._id,
      profilePic: req.session.user.profileURL
    }
  } 
  res.status(200).send(JSON.stringify(response));
});

router.get('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(200).send(JSON.stringify({ok: 0, err: e}));
    }
    res.status(200).send(JSON.stringify({ok: 1}));
  });
});

router.get('/getlatestposts', (req, res, next) => {
  let Posts = req.db.get('posts');
  dbFindMany(Posts)
  .then((result) => {
      res.status(200).send(JSON.stringify(result));
  })
});

router.get('/getpost', (req, res, next) => {
  let postid = req.query.postid;
  let Posts = req.db.get('posts');
  if (postid) {
    dbFindOne(Posts, {_id: postid})
    .then((result) => {
      res.status(200).send(JSON.stringify(result));
    })
    .catch((err) => {
        console.log(err);
        res.status(500).send(err);
    });
  } else {
    res.status(403).send('Invalid request');
  }
});

router.get('/getcomments', (req, res, next) => {
    if (req.query.postid) {
      let collection = req.db.get('comments');
      dbFindMany(collection, {parent_id: req.query.postid})
      .then((result) => {
        res.status(200).send(JSON.stringify(result));
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send(err);
      });
    } else {
      res.status(403).send();
    }
});

router.post('/savepost', (req, res, next) => {
  let postSubj = req.body.subj;
  let postBody = req.body.post;
  if (typeof req.session.user !== 'undefined' && typeof req.session.user._id !== 'undefined ' && postSubj && postBody) {
    let toSave = {
      ts: new Date(),
      subj: postSubj,
      body: postBody,
      review: 0,
      comments_enabled: 1,
      author_id: req.session.user._id,
      author_name: req.session.user.uname,
      parent_id: req.body.parent_id
    }
    let Posts = (req.body.parent_id)?req.db.get('comments'):req.db.get('posts');
    dbInsert(Posts, toSave)
    .then((result) => {
        res.status(200).send(JSON.stringify(toSave));
    }).catch((err) => {
      console.log(err);
      res.status(500).send(err);
    });
  } else {
    res.status(403).send('Invalid Post data');
  }
});

router.get('/getuser', (req, res, next) => {
  let uid = req.query.uid;
  if (uid) {
    let Users = req.db.get('users');

    dbFindOne(Users, {_id:new ObjectId(uid)})
    .then((result) => {
      res.status(200).send(JSON.stringify(result));
    })
    .catch((err) => {
      res.status(500).send(err);
    });
  } else {
    res.status(403).send('invalid parameters');
  }
});

router.post('/register', (req, res, next) => {
    let uname = req.body.uname;
    let pwd = req.body.pwd;
    if (uname && pwd) {
        Users = req.db.get('users');

        dbFindOne(Users, {uname:uname}).
        then((result) => {
            return checkIfNotEmpty(result);
        }).
        then((msg) => {
            let new_user = {
                uname: uname,
                password: pwd,
                email: '',
                createdAt: new Date(),
                verified: 0
            };
            return dbInsert(Users, new_user);
        }).
        then((result) => {
            let res_obj = {
                err_no: 0,
                err_msg: 'OK',
                data: result
            };
            res.status(200).send(JSON.stringify(res_obj));
        }).
        catch((err) => {
            let res_obj = {
                err_no: 1,
                err_msg: err,
                data: null
            };
            res.status(200).send(JSON.stringify(res_obj));
        });

    } else {
        let res_obj = {
            err_no: 1,
            err_msg: 'Username or password not defined.',
            data: null
        };
        res.status(200).send(JSON.stringify(res_obj));
    }
});

router.post('/login', (req, res, next) => {
    let uname = req.body.uname;
    let pwd = req.body.pwd;
    if (uname && pwd) {
        Users = req.db.get('users');
        dbFindOne(Users, {uname:uname, password:pwd})
        .then((result) => {
            let res_obj = {
                err_no: 1,
                err_msg: '',
                data: null
            };
            if (result) {
                res_obj.err_no = 0;
                res_obj.err_msg = 'OK';
                res_obj.data = {
                  uname: result.uname,
                  id: result._id
                }
                req.session.key = uname;
                req.session.user = result;
            } else {
                res_obj.err_no = 1;
                res_obj.err_msg = 'ENONE';
                res_obj.data = 'User does not exist';
            }
            res.status(200).send(JSON.stringify(res_obj));
        }).catch((err) => {
            let res_obj = {
                err_no: 1,
                err_msg: err,
                data: null
            };
            res.status(200).send(JSON.stringify(res_obj));
        })
    } else {
      res.status(403).send();
    }
});

module.exports = router;
