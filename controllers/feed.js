const { validationResult } = require("express-validator");
const errMessageValidation = require("../utils/errMessageValidation");
const { deleteFile } = require("../utils/file");
const PostModel = require("../models/postModel");
const UserModel = require("../models/userModel");

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;

  try {
    const totalItems = await PostModel.countDocuments();
    const posts = await PostModel.find()
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    return res.status(200).json({
      message: "Fetched posts successfully ",
      posts: posts,
      totalItems: totalItems,
    });
  } catch (err) {
    console.log(err);
    if (!err.statusCode) {
      err.statusCode = 500;
      err.message = "Something went wrong";
    }
    next(err);
  }
};

exports.createPost = async (req, res, next) => {
  const title = req.body.title;
  const content = req.body.content;
  const image = req.fileimg;
  let creator;
  const errors = validationResult(req);

  if (image.type === "error") {
    errors.errors.push({
      value: "",
      msg: image.message,
      param: "image",
      location: "file",
    });
  }

  const errMessage = errMessageValidation(errors.array());
  if (!errors.isEmpty()) {
    const error = new Error();
    error.message = "Validation failed , entered data is incorrect";
    error.statusCode = 422;
    error.validationMessage = errMessage;
    throw error;
  }

  const postModel = new PostModel({
    title: title,
    content: content,
    imageUrl: "/" + image.data.path,
    creator: req.userId,
  });

  try {
    const createdPost = await postModel.save();

    const user = await UserModel.findById(req.userId);
    creator = user;
    user.posts.push(createdPost);
    const newUser = await user.save();
    console.log(newUser, "new");
    return res.status(201).json({
      status: "success",
      message: "Post created successfully!",
      post: createdPost,
      creator: { _id: creator._id, name: creator.name },
    });
  } catch (err) {
    console.log(err);
    if (!err.statusCode) {
      err.statusCode = 500;
      err.message = "Something went wrong";
    }
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await PostModel.findById(postId);
    const imageUrl = `${req.protocol}://${req.get("host")}${post.imageUrl}`;

    post.imageUrl = imageUrl;

    return res.status(200).json({
      post: post,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
      err.message = "Something went wrong";
    }

    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  const postId = req.params.postId;
  const title = req.body.title;
  const content = req.body.content;

  const fileimg = req.fileimg;

  try {
    const post = await PostModel.findById(postId);

    if (!post) {
      const error = new Error("Could not find post");
      error.statusCode = 404;
      throw error;
    }

    if (post.creator.toString() !== req.userId) {
      const error = new Error("Not  Authorize ");
      error.statusCode = 403;
      throw error;
    }

    let imagePath = post.imageUrl;

    if (fileimg.data !== null) {
      deleteFile(post.imageUrl.substring(1));
      imagePath = `/${fileimg.data?.path}`;
    }

    post.title = title;
    post.content = content;
    post.imageUrl = imagePath;

    const result = await post.save();

    return res.status(200).json({
      status: "success",
      message: "update successfully",
      post: result,
    });
  } catch (err) {
    console.log(err);
    if (!err.statusCode) {
      err.statusCode = 500;
      err.message = "Something went wrong";
    }

    next(err);
  }
};

exports.deletePost = (req, res, next) => {
  const postId = req.params.postId;

  PostModel.findById(postId)
    .then(post => {
      if (!post) {
        const error = new Error();
        error.message = "Could not find post";
        error.statusCode = 404;

        throw error;
      }

      if (post.creator.toString() !== req.userId) {
        const error = new Error("Not Authorize");
        error.statusCode = 403;
        throw error;
      }

      deleteFile(post.imageUrl.substring(1));

      return PostModel.findByIdAndRemove(postId);
    })
    .then(() => {
      return UserModel.findById(req.userId);
    })
    .then(user => {
      user.posts.pull(postId);
      return user.save();
    })
    .then(() => {
      return res.status(200).json({
        status: "success",
        message: "Deleted post successfully",
      });
    })
    .catch(err => {
      console.log(err);
      if (!err.statusCode) {
        err.statusCode = 500;
        err.message = "Something went wrong";
      }

      next(err);
    });
};
