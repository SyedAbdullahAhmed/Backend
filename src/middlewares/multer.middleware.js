import multer from "multer";

const storage = multer.diskStorage({// use dist storage or memeory storage
    destination: function (req, file, cb) {
      cb(null, "./public/temp") // file is on server before uploading on cloudinary 
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
  })
  
export const upload = multer({ 
    storage, 
})
