import mongoose from "mongoose";

const playlistSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            requrired: true,
            unique: true,
            lowercase: true
        },
        description: {
            type: String,
            required: true,
            lowercase: true
        },
        videos: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Video'
            }
        ],
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
);

export const Playlist = mongoose.model("Playlist", playlistSchema);

