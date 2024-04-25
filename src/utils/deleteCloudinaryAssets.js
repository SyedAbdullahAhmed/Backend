import { ApiError } from "./ApiError.js";
import { v2 as cloudinary } from "cloudinary"

const deleteImageFromCloudinary = async (imageURL) => {
    try {
        // get public id from url
        const parts = imageURL.split("/");
        const splicedString = parts[parts.length - 1];
        const publicId = splicedString.slice(0, -4);

        //delete image using public id
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        throw new ApiError(500, `Error deleting image from Cloudinary: ${error}`);
    }
};
const deleteVideoFromCloudinary = async (imageURL) => {
    try {
        // get public id from url
        const parts = imageURL.split("/");
        const splicedString = parts[parts.length - 1];
        const publicId = splicedString.slice(0, -4);

        //delete image using public id
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        throw new ApiError(500, `Error deleting video from Cloudinary: ${error}`);
    }
};

export { deleteImageFromCloudinary, deleteVideoFromCloudinary }