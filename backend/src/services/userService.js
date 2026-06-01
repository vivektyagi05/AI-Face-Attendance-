/**
 * src/services/userService.js
 * Shared logic for creating, updating, and deleting User + profile documents
 */

const User     = require('../models/User');
const Teacher  = require('../models/Teacher');
const Student  = require('../models/Student');
const Class    = require('../models/Class');
const ApiError = require('../utils/ApiError');
const logger   = require('../utils/logger');

// ─────────────────────────────────────────────────────────────────────────────
// TEACHER OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

const createTeacher = async (data, createdBy) => {
  const { name, email, password, subjects = [], department, designation,
          employeeId, qualification, phone, joiningDate } = data;

  // Check duplicate email
  if (await User.findOne({ email })) {
    throw ApiError.conflict('A user with this email already exists');
  }

  try {
    // 1. Create user account
    const user = await User.create({
      name,
      email,
      password,
      role: 'teacher',
      isActive: true,
      mustChangePassword: true,
      createdBy
    });

    // 2. Create teacher profile
    const teacher = await Teacher.create({
      userId: user._id,
      subjects,
      department,
      designation,
      employeeId,
      qualification,
      phone,
      joiningDate: joiningDate ? new Date(joiningDate) : undefined
    });

    logger.info(`Teacher created: ${email} by admin ${createdBy}`);

    return { user, teacher };
  } catch (err) {
    throw err;
  } finally {
  }
};

const updateTeacher = async (teacherId, data) => {
  const teacher = await Teacher.findById(teacherId).populate('userId');
  if (!teacher) throw ApiError.notFound('Teacher not found');

  const { name, email, subjects, department, designation,
          employeeId, qualification, phone, isActive } = data;

  // Update User fields
  if (name || email !== undefined || isActive !== undefined) {
    const userUpdate = {};
    if (name)            userUpdate.name     = name;
    if (email)           userUpdate.email    = email.toLowerCase();
    if (isActive !== undefined) userUpdate.isActive = isActive;

    if (email && email !== teacher.userId.email) {
      if (await User.findOne({ email: email.toLowerCase(), _id: { $ne: teacher.userId._id } })) {
        throw ApiError.conflict('Email already taken by another user');
      }
    }
    await User.findByIdAndUpdate(teacher.userId._id, { $set: userUpdate }, { runValidators: true });
  }

  // Update Teacher profile fields
  const profileUpdate = {};
  if (subjects    !== undefined) profileUpdate.subjects    = subjects;
  if (department  !== undefined) profileUpdate.department  = department;
  if (designation !== undefined) profileUpdate.designation = designation;
  if (employeeId  !== undefined) profileUpdate.employeeId  = employeeId;
  if (qualification !== undefined) profileUpdate.qualification = qualification;
  if (phone       !== undefined) profileUpdate.phone       = phone;

  const updated = await Teacher.findByIdAndUpdate(
    teacherId, { $set: profileUpdate }, { new: true, runValidators: true }
  ).populate('userId', '-password');

  logger.info(`Teacher updated: ${teacherId}`);
  return updated;
};

const deleteTeacher = async teacherId => {
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) throw ApiError.notFound('Teacher not found');

  // Soft delete: deactivate user
  await User.findByIdAndUpdate(teacher.userId, { isActive: false });
  // Remove from assigned classes
  await Class.updateMany(
    { classTeacher: teacherId },
    { $unset: { classTeacher: '' } }
  );
  logger.info(`Teacher deactivated: ${teacherId}`);
};

const getTeacher = async teacherId => {
  const teacher = await Teacher.findById(teacherId)
    .populate('userId', '-password -__v')
    .populate('assignedClasses', 'name section academicYear');
  if (!teacher) throw ApiError.notFound('Teacher not found');
  return teacher;
};

const listTeachers = async ({ filter, sort, skip, limit, page }) => {
  // Join with User for name/email search
  const pipeline = [
    {
      $lookup: {
        from        : 'users',
        localField  : 'userId',
        foreignField: '_id',
        as          : 'user',
      },
    },
    { $unwind: '$user' },
    {
      $match: {
        ...filter,
        'user.role'    : 'teacher',
        'user.isActive': filter.isActive !== undefined ? filter.isActive : { $in: [true, false] },
      },
    },
  ];

  // Apply text search on user.name and user.email
  if (filter.$or) {
    pipeline[2].$match.$or = filter.$or.map(cond => {
      const key = Object.keys(cond)[0];

      // remove old "name/email"
      const cleanKey = key.replace(/^user\./, '');

      return {
        [`user.${cleanKey}`]: cond[key]
      };
    });
  }

  const countPipeline = [...pipeline, { $count: 'total' }];
  const dataPipeline  = [...pipeline,
    { $sort: sort },
    { $skip: skip },
    { $limit: limit },
    { $project: { 'user.password': 0, 'user.__v': 0 } },
  ];

  const [countResult, teachers] = await Promise.all([
    Teacher.aggregate(countPipeline),
    Teacher.aggregate(dataPipeline),
  ]);

  return { teachers, total: countResult[0]?.total || 0 };
};

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

const createStudent = async (data, createdBy) => {
  const {
      name,
      email,
      password,
      rollNumber,
      classId,
      section,
      subjects = [],
      phone,
      address,
      guardianName,
      guardianPhone,
      dateOfBirth,
      gender,
      admissionNumber
    } = data;

  // Validate class exists
  const classDoc = await Class.findById(classId);
  if (!classDoc) throw ApiError.notFound('Class not found');

  // Unique email
  if (await User.findOne({ email })) {
    throw ApiError.conflict('A user with this email already exists');
  }

  // Unique rollNumber per class
  if (await Student.findOne({ classId, rollNumber })) {
    throw ApiError.conflict(`Roll number ${rollNumber} already exists in this class`);
  }

  try {
    const user = await User.create({
      name,
      email,
      password,
      role: 'student',
      isActive: true,
      mustChangePassword: true,
      createdBy,
    });

    const student = await Student.create({
      userId: user._id,
      classId,
      section,
      rollNumber,
      admissionNumber,
      phone,
      address,
      guardianName,
      guardianPhone,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      gender,
      subjects,
      createdBy,
    });
    // Add student to class.students array
    await Class.findByIdAndUpdate(
      classId,
      { $addToSet: { students: student._id } },
    );

    logger.info(`Student created: ${email} by admin ${createdBy}`);
    return { user, student };
  } catch (err) {
    throw err;
  } finally {
  }
};

const updateStudent = async (studentId, data) => {
  const student = await Student.findById(studentId).populate('userId');
  if (!student) throw ApiError.notFound('Student not found');

  const {
    name,
    email,
    rollNumber,
    section,
    classId,
    subjects,
    phone,
    address,
    guardianName,
    guardianPhone,
    isActive
  } = data;

  // Update User fields
  if (name || email !== undefined || isActive !== undefined) {
    const userUpdate = {};
    if (name)            userUpdate.name     = name;
    if (email)           userUpdate.email    = email?.toLowerCase();
    if (isActive !== undefined) userUpdate.isActive = isActive;

    if (email && email !== student.userId.email) {
      if (await User.findOne({ email: email.toLowerCase(), _id: { $ne: student.userId._id } })) {
        throw ApiError.conflict('Email already taken');
      }
    }
    await User.findByIdAndUpdate(student.userId._id, { $set: userUpdate }, { runValidators: true });
  }

  // Roll number uniqueness check if changing
  if (rollNumber && rollNumber !== student.rollNumber) {
    const targetClass = classId || student.classId;
    if (await Student.findOne({ classId: targetClass, rollNumber, _id: { $ne: studentId } })) {
      throw ApiError.conflict(`Roll number ${rollNumber} already exists in this class`);
    }
  }

  // If changing class: update Class.students arrays
  if (classId && classId.toString() !== student.classId.toString()) {
    const newClass = await Class.findById(classId);
    if (!newClass) throw ApiError.notFound('New class not found');

    await Class.findByIdAndUpdate(student.classId, { $pull: { students: student._id } });
    await Class.findByIdAndUpdate(classId,          { $addToSet: { students: student._id } });
  }

  const profileUpdate = {};
  if (rollNumber !== undefined) profileUpdate.rollNumber    = rollNumber;
  if (section    !== undefined) profileUpdate.section       = section;
  if (subjects   !== undefined) profileUpdate.subjects      = subjects;
  if (phone      !== undefined) profileUpdate.phone         = phone;
  if (address    !== undefined) profileUpdate.address       = address;
  if (guardianName  !== undefined) profileUpdate.guardianName  = guardianName;
  if (guardianPhone !== undefined) profileUpdate.guardianPhone = guardianPhone;

  const updated = await Student.findByIdAndUpdate(
    studentId, { $set: profileUpdate }, { new: true, runValidators: true }
  ).populate('userId', '-password').populate('classId', 'name section');

  logger.info(`Student updated: ${studentId}`);
  return updated;
};

const deleteStudent = async studentId => {
  const student = await Student.findById(studentId);
  if (!student) throw ApiError.notFound('Student not found');

  await User.findByIdAndUpdate(student.userId, { isActive: false });
  await Class.findByIdAndUpdate(student.classId, { $pull: { students: studentId } });
  logger.info(`Student deactivated: ${studentId}`);
};

const getStudent = async studentId => {
  const student = await Student.findById(studentId)
    .populate('userId', '-password -__v')
    .populate('classId', 'name section academicYear classTeacher');
  if (!student) throw ApiError.notFound('Student not found');
  return student;
};

const listStudents = async ({ filter, sort, skip, limit, page }) => {
  const query  = Student.find(filter)
    .populate('userId', '-password -__v')
    .populate('classId', 'name section')
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const [students, total] = await Promise.all([
    query,
    Student.countDocuments(filter),
  ]);
  return { students, total };
};

module.exports = {
  createTeacher, updateTeacher, deleteTeacher, getTeacher, listTeachers,
  createStudent, updateStudent, deleteStudent, getStudent, listStudents,
};
