const express = require('express');
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
const sequelize = new Sequelize('simple-rest', 'ravelware', 'R4v3lw4r3', {
  host:'localhost',
  dialect: 'mssql',
//   operatorsAliases: false,
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
    'year': Sequelize.STRING,
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
        defaultValue: Sequelize.NOW
    },    
    'updatedAt': {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
    },   
    
}, {
    //prevent sequelize transform table name into plural
    freezeTableName: true,
})

// endpoint get 
app.get('/book/', (req,res) => {
    // res.send('hello world');
    book.findAll().then(book => {
      res.json(book)
    })
});

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
    })
),
check('name')
    .isLength({min: 2}),
check('year')
    .isLength({min: 4, max: 4})
    .isNumeric(),
check('author')
    .isLength({min: 2}),
check('description')
    ,isLength({min: 10})
], (req, res)=> {
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
}



app.listen(3000, () => console.log("server berjalan pada http://localhost:3000"))

