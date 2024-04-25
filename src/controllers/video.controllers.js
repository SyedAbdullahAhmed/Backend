import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Video } from "../models/video.models.js"
import { uploadVideoOnCloudinary,uploadImageOnCloudinary } from '../utils/cloudinary.js'
import {deleteVideoFromCloudinary,deleteImageFromCloudinary} from '../utils/deleteCloudinaryAssets.js'

// TODO
const getAllVideos = asyncHandler(async (req, res) => {

    // const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination

    const videos = await Video.find({})

    if (videos.length === 0) {
        throw new ApiError(404, 'No videos found!!')
    }
    return res
        .status(200)
        .json(
            new ApiResponse(200, videos, "Videos fetched successfully!")
        )
})

const getVideoById = asyncHandler(async (req, res) => {
    // get video id
    const videoId = req.params.videoId

    // find video
    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, 'Video not found!!')
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, video, "Video fetched successfully!")
        )
})

const publishAVideo = asyncHandler(async (req, res) => {
    // get body and validate
    const { title, description } = req.body

    if (!title && !description) {
        throw new ApiError(400, 'title and description are required!!')
    }

    // upload video on multer
    let videoLocalPath
    if (req.files && Array.isArray(req.files.videoFile) && req.files.videoFile.length > 0) {
        videoLocalPath = req.files.videoFile[0].path
    }

    if (!videoLocalPath) {
        throw new Error('videoFile is required')
    }

    // thumbnail video on multer
    let thumbnailLocalPath
    if (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0) {
        thumbnailLocalPath = req.files.thumbnail[0].path
    }

    if (!thumbnailLocalPath) {
        throw new Error('thumbnai is required')
    }

    // upload video & multer on multer
    const videoURL = await uploadVideoOnCloudinary(videoLocalPath)
    const thumbnailURL = await uploadImageOnCloudinary(thumbnailLocalPath)

    // save to database
    const videoFile = await Video.create({
        title,
        description,
        videoFile: videoURL.url,
        owner: req.user._id,
        duration: Math.ceil(videoURL.duration),
        thumbnail: thumbnailURL.url
    })
    if (!videoFile) {
        throw new ApiError(500, 'Something went wrong while uploading videoFile!!')
    }

        console.log(videoFile);
    return res
        .status(201)
        .json(
            new ApiResponse(201, videoFile, "Video uploaded successfully")
        )
})

const deleteVideo = asyncHandler(async (req, res) => {
    // get id and find video
    const videoId = req.params.videoId

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, 'Video not found!!')
    }

    // validate owner
    if (req.user._id.toString() !== video.owner.toString()) {
        throw new ApiError(401, 'Unauthorized user!!')
    }

    // delete video and thumbnail from cloudinary
    const videoDeletionResponse = await deleteVideoFromCloudinary(video?.videoFile)
    if (
        !(videoDeletionResponse.result === 'ok')
        ) {
            if (
            !(videoDeletionResponse.result === 'not found')
            )
            throw new ApiError(400, "Video is not deleted!!")
        }

    const thumbnailDeletionResponse = await deleteImageFromCloudinary(video?.thumbnail)
    if (
        !(thumbnailDeletionResponse.result === 'ok')
    ) {
        if (
            !(thumbnailDeletionResponse.result === 'not found')
        )
            throw new ApiError(400, "thumbnail is not deleted!!")
    }

    // delete from database
    const deletedVideo = await Video.findByIdAndDelete(videoId)

    if (!deletedVideo) {
        throw new ApiError(500, "Something went wrong while deleting video!!")
    }


    return res
        .status(200)
        .json(
            new ApiResponse(200, deletedVideo, "Video deleted successfully")
        )

})
const updateVideo = asyncHandler(async (req, res) => {
    // get video id and find then validate owner
    const videoId = req.params.videoId

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, 'Video not found!!')
    }

    console.log(req.user._id);
    console.log(video.owner);
    if (req.user._id.toString() !== video.owner.toString()) {
        throw new ApiError(401, 'Unauthorized user!!');
    }
    

    // upload thumbnail to multer
    const thumbnailLocalPath = req.file?.path

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnail file is missing")
    }

    // upload on cloudinary
    const thumbnail = await uploadImageOnCloudinary(thumbnailLocalPath)

    if (!thumbnail.url) {
        throw new ApiError(400, "Error while uploading on thumbnail")

    }

    // delete existing thumbnail from cloudinary
    const imageDeletionResponse = await deleteImageFromCloudinary(video?.thumbnail)

    if (
        !(imageDeletionResponse.result === 'ok')
    ) {
        if (
            !(imageDeletionResponse.result === 'not found')
        )
            throw new ApiError(400, "Image is not deleted!!")
    }

    // update thumbnail
    const newThumbnail = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                thumbnail: thumbnail.url
            }
        },
        { new: true }
    )
    console.log(newThumbnail);
    if (!newThumbnail) {
        throw new ApiError(400, "Error while updating thumbnail")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, newThumbnail, "Thumbnail updated successfully")
        )

})

export {
    publishAVideo,
    getAllVideos,
    deleteVideo,
    getVideoById,
    updateVideo
}