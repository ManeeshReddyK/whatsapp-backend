const path = require('path');
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    signatureVersion: 'v4',
    region: 'ap-south-1',
});

const awsStorage = multerS3({
    s3: s3,
    bucket: 'whatsapp-message-storage',
    key: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
})

const upload = multer({
    storage: awsStorage,
    fileFilter: (req, file, cb) => {
        checkFileFilter(file, cb);
    }
}).single('image');

checkFileFilter = (file, cb) => {
    // Allowed ext
    const filetypes = /jpeg|jpg|png|gif/;
    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

module.exports = s3
