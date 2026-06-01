/**
 * src/models/User.js
 * Core user account – referenced by Student, Teacher profiles
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type    : String,
      required: [true, 'Name is required'],
      trim    : true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type     : String,
      required : [true, 'Email is required'],
      unique   : true,
      lowercase: true,
      trim     : true,
      match    : [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
      index    : true,
    },
    password: {
      type    : String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select  : false,   // never returned in queries by default
    },
    role: {
      type   : String,
      enum   : {
        values : ['admin', 'teacher', 'student'],
        message: 'Role must be admin, teacher, or student',
      },
      required: [true, 'Role is required'],
      index   : true,
    },
    isActive: {
      type   : Boolean,
      default: true,
      index  : true,
    },
    mustChangePassword: {
      type   : Boolean,
      default: true,   // new accounts must change temp password
    },
    lastLogin: {
      type   : Date,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref : 'User',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// ── Pre-save: hash password ────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const rounds    = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  this.password   = await bcrypt.hash(this.password, rounds);
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

// ── Instance method: compare password ─────────────────────────
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// ── Instance method: was password changed after JWT issued? ───
userSchema.methods.passwordChangedAfter = function (jwtIssuedAt) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwtIssuedAt < changedTimestamp;
  }
  return false;
};

// ── Compound index for common queries ─────────────────────────
userSchema.index({ email: 1, role: 1 });
userSchema.index({ role: 1, isActive: 1 });

const User = mongoose.model('User', userSchema);
module.exports = User;
