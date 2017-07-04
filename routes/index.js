var express = require('express');
var router = express.Router();

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
};
/*
router.get('/', (req, res, next) => {
    res.status(200).send('ok');
});
*/

router.get('/checksession', (req, res, next) => {
  let response = {
    ok: 0
  };
  if (typeof req.session.key !== 'undefined') {
    response.ok = 1;
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
  let postid = req.body.postid;
  let Posts = db.get('posts');
  if (postid) {
    dbFindOne(Posts, {_id: postid})
    .then((result) => {
      res.status(200).send(JSON.stringify(result));
    })
    .catch((err) => {
    });
  } else {
  }
});

router.post('/savepost', (req, res, next) => {
  let postSubj = req.body.subj;
  let postBody = req.body.post;
  if (typeof req.session.user._id !== 'undefined ' && postSubj && postBody) {
    let toSave = {
      ts: new Date(),
      subj: postSubj,
      body: postBody,
      review: 0,
      comments_enabled: 1,
      author_id: req.session.user._id,
      author_name: req.session.user.uname
    }
    let Posts = req.db.get('posts');
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
                res_obj.data = result;
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
