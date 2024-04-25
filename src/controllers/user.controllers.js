import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.models.js"
import { Video } from "../models/video.models.js"
import { uploadImageOnCloudinary } from '../utils/cloudinary.js'
import jwt from "jsonwebtoken"
import { options } from '../constants.js'
import { deleteImageFromCloudinary } from "../utils/deleteCloudinaryAssets.js"


const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)

        // custom accessToken & refreshToken generator method in user model
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        // save refreshToken in database without using validation
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body

    // check for empty fields
    if (
        [fullName, email, username, password].some(field => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required!!")
    }

    // check for working email
    // if (
    //     !await emailValidator(email)
    // ) {
    //     throw new ApiError(400, "Enter correct email!!")
    // }

    // check password for length 8
    if (
        password.length < 8
    ) {
        throw new ApiError(400, "Password must have at least 8 characters!!")
    }

    // find email or username already exist
    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (existedUser) {
        throw new ApiError(409, "User already exist with this email or username!!")
    }

    // get path of uploaded file
    // const avatarLocalPath = req.files?.avatar[0]?.path
    let avatarLocalPath;
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path
    }

    // we donot use optional chaining because coverImage is not required
    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    // if (!avatarLocalPath) {
    //     throw new ApiError(400, "Avatar is required!!")
    // }

    // upload file to cloudinary and get file url
    const avatar = await uploadImageOnCloudinary(avatarLocalPath)
    const coverImage = await uploadImageOnCloudinary(coverImageLocalPath)

    // if (!avatar) {
    //     throw new ApiError(400, "Avatar is required!!")
    // }

    // create user object 
    const user = await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar?.url || "",
        coverImage: coverImage?.url || "",
    })

    // check user created or not and exclude password and refresh token
    const createdUser = await User.findOne(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user!!")
    }

    // final response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully!!")
    )

})

const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    // custom password matching method in user model
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    // generate access and refresh token
    // save in database
    // exclude password and refresh token from the response 
    // set access and refresh token in cookie and send response
    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        )

})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )


    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    // getting token from frontend using body or cookie
    const incomingRefreshToken = req?.cookies?.refreshToken || req?.body?.refreshToken
    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        // verify token 
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        // find user by id 
        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        // match frontend refresh token with database refresh token
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")

        }

        // generate new tokens and send back to frontend
        const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: refreshToken },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)
    // custom password matching method in user model
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    // check password for length 8
    if (
        newPassword.length < 8
    ) {
        throw new ApiError(400, "Password must have at least 8 characters!!")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(
            200,
            req.user,
            "User fetched successfully"
        ))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    // if (
    //     !await emailValidator(email)
    // ) {
    //     throw new ApiError(400, "Enter correct email")
    // }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        { new: true }

    ).select("-password -refreshToken")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    // image path
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    // upload on cloudinary
    const avatar = await uploadImageOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")

    }

    // delete existing image from cloudinary
    const imageDeletionResponse = await deleteImageFromCloudinary(req?.user?.avatar)

    if (
        !(imageDeletionResponse.result === 'ok')
    ) {
        if (
            !(imageDeletionResponse.result === 'not found')
        )
            throw new ApiError(400, "Image is not deleted!!")
    }


    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password -refreshToken")

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Avatar updated successfully")
        )
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    // image path
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    // upload on cloudinary
    const coverImage = await uploadImageOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")

    }

    // delete existing image from cloudinary
    const imageDeletionResponse = await deleteImageFromCloudinary(req?.user?.coverImage)

    if (
        !(imageDeletionResponse.result === 'ok')
    ) {
        if (
            !(imageDeletionResponse.result === 'not found')
        )
            throw new ApiError(400, "Image is not deleted!!")
    }


    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password -refreshToken")

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Cover image updated successfully")
        )
})

const addVideoToWatchHistory = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (
        !(video.owner.toString() === req.user?._id.toString())
    ) {
        throw new ApiError(403, "You are not allowed to add this video to watch history")
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $push: {
                watchHistory: videoId
            }
        },
        { new: true }
    )

    if (!updatedUser) {
        throw new ApiError(500, "Something went wrong while adding video to watch history")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Video added to watch history"))
})
const removeVideoFromWatchHistory = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (
        !(video.owner.toString() === req.user?._id.toString())
    ) {
        throw new ApiError(403, "You are not allowed to add this video to watch history")
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $pull: {
                watchHistory: videoId
            }
        },
        { new: true }
    )

    if (!updatedUser) {
        throw new ApiError(500, "Something went wrong while removing video to watch history")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Video removed from watch history"))
}

)
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    addVideoToWatchHistory,
    removeVideoFromWatchHistory
}
