const express = require('express');
const moment = require('moment');
const bodyParser = require('body-parser'); //post body handler
const { check, validationResult } = require('express-validator/check') //form validation
const { matchedData, sanitize } = require('express-validator/filter'); //sanitize form params
const multer = require('multer'); //multer form data
const path = require('path');
const crypto = require('crypto')
const app = express();


// set body parser for HTTP post operation 
app.use(bodyParser.json()); //suport json encode
app.use(bodyParser.urlencoded({ extended: true })); //support encodes bodies

// set statis asset for public directory 
app.use(express.static('public'));
const uploadDir = '/img/';
const storage = multer.diskStorage({
  destination: "./public"+uploadDir,
  filename: function (req, file, cb) {
    crypto.pseudoRandomBytes(16, function (err, raw) {
      if (err) return cb(err)  
      cb(null, raw.toString('hex') + path.extname(file.originalname))
    });
  }
});

const upload = multer({storage: storage, dest: uploadDir});
const Sequelize = require('sequelize');
const Op = Sequelize.Op; //With Operator Op for Or && and
const date1 = moment().format('D-MM-YYYY');
const sequelize = new Sequelize('simple-rest', 'ravelware', 'R4v3lw4r3', {
  host: 'localhost',
  // dialect: 'postgres',
  dialect: 'mssql',
  dialectOptions: {
    useUTC: false //for reading from database
},
timezone: '+07:00', //for writing to database
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
});

// test connection 
sequelize.authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

  // create object model book 
  const book = sequelize.define('book', {
    'id': {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    'isbn': Sequelize.STRING,
    'name': Sequelize.STRING,
    'year': Sequelize.DATEONLY,
    'author': Sequelize.STRING,
    'description': Sequelize.TEXT,
    'image': {
        type: Sequelize.STRING,
        //Set custom getter for book image using URL
        get(){
            const image = this.getDataValue('image');
            return "/img/"+image;
        }
    },
    'createdAt': {
        type: Sequelize.DATE,
        // defaultValue: Sequelize.NOW
    },    
    'updatedAt': {
        type: Sequelize.DATE,
        // defaultValue: Sequelize.NOW
    },   
    
}, {
    //prevent sequelize transform table name into plural
    freezeTableName: true,    
})

// endpoint get 
app.get('/book/', (req,res) => {
    // findAll digunakan untuk mengambil semua data pada tabel 
    book.findAll().then(book => {
      res.json(book)
    })
});

//endpoint get date
app.get('/book/date', (req, res) =>{
  // console.log(date1);
  // var a = moment([10, 0, 29]);
  // var b = moment([09, 0, 28]);
  // var test = a.diff(b, 'hours')
 
  // var now = moment(new Date()); //todays date
  // var end = moment("2015-12-1"); // another date
  // var duration = moment.duration(now.diff(end));
  // var days = duration.asYears();
  var a = moment(new Date()); //todays date
  // var b = moment('2020-03-10T10:00:00');
  // var hours = console.log(a.diff(b, 'hours'))
  // console.log(hours);
  book.findAll(
    {
    where: 
    { 
      createdAt: {
        // [Op.lt]: req.body.createdAt // get value form request.body.cretedAt lether than value var b
        [Op.lt]: a //lether than value var b
      }
    }
  }
  ).then(book => {
    res.json(book)
  })
})

//endpoint post 
app.post('/book/', [
  //File upload (karena pakai multer, tempatkan di posisi pertama agar membaca multipar form-data)
  upload.single('image'),
  // Set Form Validate rule 
  check('isbn')
    .isLength({ min: 5 })
    .isNumeric()
    .custom(value => {
      return book.findOne({where: {isbn: value}}).then(b => {
        if(b){
          throw new Error('ISBN Alredy in use')
        }
      })
    }
),
check('name')
    .isLength({min: 2}),
check('author')
    .isLength({min: 2}),
check('description')
    .isLength({min: 2})
],
 (req, res)=> {
 const errors = validationResult(req);
 if(!errors.isEmpty()) {
   return res.status(422).json({errors: errors.mapped()});
 }

 book.create({
   name: req.body.name,
   isbn: req.body.isbn,
   year: req.body.year,
   author: req.body.author,
   description: req.body.description,
   image: req.file === undefined ? "" : req.file.filename
   
 }).then(newBook => {
   res.json({
     "status": "success",
     "message": "Book Addeds",
     "data": newBook
   })
  })
 })

// endpoint put
app.put('/book',[
  // file upload (karena pakai multer, tempatkan di posisi pertama agar membaca multipart formdata)
  upload.single('image'),

  // Set Form Validation Rule 
  check('isbn')
    .isLength({min: 5})
    .isNumeric()
    .custom(value => {
      return book.findOne({where: {isbn:value}}).then(b => {
        if(!b){
          throw new Error('ISBN not found');
        }
      })
    }
  ),
  check('name')
    .isLength({min: 2}),
  // check('author')
  //   .isLength({min: 2}),
  // check('description')
  //   .isLength({min: 10})
], (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.status(422).json({errors: errors.mapped()});
  }
  const update = {
    name: req.body.name,
    isbn: req.body.isbn,
    year: req.body.year,
    author: req.body.author,
    description: req.body.description,
    image: req.file === undefined ? "" : req.file.filename
  }
  book.update(update,{where: {isbn: req.body.isbn}})
    .then(affectedRow => {
      return book.findOne({where: {isbn: req.body.isbn}})
    })
    .then(b => {
      res.json({
        "status": "success",
        "message": "Book Updated",
        "data": b
      })
    })
  }
)

//endpoint delete
app.delete('/book/:isbn' ,[
  // Set form validation rule 
  check('isbn')
    .isLength({ min: 5})
    .isNumeric()
    .custom(value => {
      return book.findOne({where: {isbn: value}}).then(b => {
        if(!b){
          throw new Error('ISBN not found');
        }
      })
    }
),
], (req, res)=> {
  book.destroy({where: {isbn: req.params.isbn}})
  .then(affectedRow => {
    if(affectedRow){
      return {
        "status":"succes",
        "message":"Book Delete",
        "data": null
      }
    }
    return {
      "status":"error",
      "message":"Failed",
      "data": null
    }
  })
  .then(r => {
    res.json(r)
  })
} 
)



app.listen(3000, () => console.log("server berjalan pada http://localhost:3000"))

