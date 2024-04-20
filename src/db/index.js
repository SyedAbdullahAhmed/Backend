import mongoose from 'mongoose'
import { DB_NAME } from '../constants.js'

const connectDB = async () => {
    try {
        const uri = `${process.env.MONGO_URI}/${DB_NAME}`
        const connectionInstance = await mongoose.connect(uri)
        console.log("MONGODB connection SUCCESSFUL !! DD Host : ", connectionInstance.connection.host)
    } catch (error) {
        console.log("MONGODB connection FAILED ", error);
        process.exit(1)
    }
}

export default connectDB