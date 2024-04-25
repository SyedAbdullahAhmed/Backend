import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Playlist } from "../models/playlist.models.js"
import { Video } from "../models/video.models.js"

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body

    if (!name && !description) {
        throw new ApiError(400, 'All fields are required!!')
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req?.user?._id
    })

    return res
        .status(201)
        .json(
            new ApiResponse(201, playlist, 'Playlist created successfully')
        )

})
const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, 'Playlist not found')
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, 'Playlist retrieved successfully'))

})
const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body

    if (!name && !description) {
        throw new ApiError(400, 'All fields is required!!')
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, 'Playlist not found')
    }

    if (!(playlist.owner === req?.user?._id)) {
        throw new ApiError(403, 'You are not authorized to access this playlist')
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        { 
            name, 
            description 
        },
        { new: true }
    )

    if (!updatedPlaylist) {
        throw new ApiError(500, 'Something went wrong while updation!!')
    }

    return res
        .status(201)
        .json(
            new ApiResponse(201, updatedPlaylist, 'Playlist updated successfully')
        )
})
const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, 'Playlist not found')
    }

    if (!(playlist.owner === req?.user?._id)) {
        throw new ApiError(403, 'You are not authorized to access this playlist')
    }

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId)

    if (!deletedPlaylist) {
        throw new ApiError(500, 'Something went wrong while deletion!!')
    }

    return res
        .status(201)
        .json(
            new ApiResponse(200, deletedPlaylist, 'Playlist deleted successfully')
        )
})
const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { videoId,playlistId } = req.params

    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(404,'Playlist not found')
    }

    if(!(playlist.owner === req?.user?._id)){
        throw new ApiError(403,'You are not authorized to access this playlist')
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404,'Video not found')
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $push:{
                videos:videoId
            }
        },
        {new:true}
    )

    if (!updatedPlaylist) {
        throw new ApiError(500, 'Something went wrong while adding video to playlist')
    }

    return res
        .status(201)
        .json(
            new ApiResponse(200, updatedPlaylist, 'Video added to playlist successfully')
        )

})
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { videoId,playlistId } = req.params

    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(404,'Playlist not found')
    }

    if(!(playlist.owner === req?.user?._id)){
        throw new ApiError(403,'You are not authorized to access this playlist')
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404,'Video not found')
    }

    const removedVideoFromPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull:{
                videos:videoId
            }
        },
        {new:true}
    )

    if (!removedVideoFromPlaylist) {
        throw new ApiError(500, 'Something went wrong while removing video to playlist')
    }

    return res
        .status(201)
        .json(
            new ApiResponse(200, removedVideoFromPlaylist, 'Video removed from playlist successfully')
        )
})
const getUserPlaylists = asyncHandler(async (req, res) => {
    const { playlistId } = req.params

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, 'Playlist not found')
    }

    if (!(playlist.owner === req?.user?._id)) {
        throw new ApiError(403, 'You are not authorized to access this playlist')
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, 'Playlist retrieved successfully'))
})

export {
    createPlaylist,
    getPlaylistById,
    updatePlaylist,
    deletePlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    getUserPlaylists
}