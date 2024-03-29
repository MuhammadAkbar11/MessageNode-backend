const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "new user",
    },
    posts: [
      {
        type: Schema.Types.ObjectId,
        ref: "PostModel",
      },
    ],
  },
  {
    timestamps: true,
  }
);
const UserModel = mongoose.model("UserModel", userSchema, "users");

module.exports = UserModel;
