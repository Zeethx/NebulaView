import { asyncHandler } from '../utils/asyncHandler.js';
import {apiError} from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import { apiResponse } from '../utils/apiResponse.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new apiError(500, "Something went wrong while generating tokens")
    }
}

const registerUser = asyncHandler(async (req, res) => 
    {
        const {fullName, email, username, password} = req.body
        
        if (
            [fullName, email, username, password].some((field) => field?.trim() === "")
        ) {
            throw new apiError(400, "All fields are required")
        }
    
        const existedUser = await User.findOne({
            $or: [{ username }, { email }]
        })
    
        if (existedUser) {
            throw new apiError(409, "User with email or username already exists")
        }
        //console.log(req.files);
    
        const avatarLocalPath = req.files?.avatar[0]?.path;
        //const coverImageLocalPath = req.files?.coverImage[0]?.path;
    
        let coverImageLocalPath;
        if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
            coverImageLocalPath = req.files.coverImage[0].path
        }
        
    
        if (!avatarLocalPath) {
            throw new apiError(400, "Avatar file is required")
        }
    
        const avatar = await uploadOnCloudinary(avatarLocalPath)
        const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
        if (!avatar) {
            throw new apiError(400, "Avatar file is required")
        }
       
    
        const user = await User.create({
            fullName,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email, 
            password,
            username: username.toLowerCase()
        })
    
        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        )
    
        if (!createdUser) {
            throw new apiError(500, "Something went wrong while registering the user")
        }
        
        return res.status(201).json(
            new apiResponse(201, createdUser, "User registered successfully")
        )
    }
);

const loginUser = asyncHandler(async (req, res) => {

    const { username, email, password } = req.body

    if (!username || !email) {
        throw new apiError(400, "Username/Email is required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new apiError(404, "User not found")
    }

    if (!await user.verifyPassword(password)) {
        throw new apiError(401, "Invalid credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    // could be an expensive operation
    // const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    user.password = undefined;
    user.refreshToken = undefined;

    const loggedInUser = user;

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new apiResponse(200, {
            user: loggedInUser,
            accessToken,
            refreshToken
        }, "User logged in successfully")
    )
});

const logoutUser = asyncHandler(async (req, res) => {
    
});

export { 
    registerUser,
    loginUser
};