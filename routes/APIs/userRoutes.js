import express from 'express';
import { mainDB, backup1, backup2 } from "../../database/mongo-dbconnect.js"; 
import userSchema from "../../models/user.js";

const MainUser = mainDB.model("User", userSchema);
const Backup1User = backup1.model("User", userSchema);
const Backup2User = backup2.model("User", userSchema);
const router = express.Router();

// ==========================================
// CREATE - POST /api/users
// ==========================================

router.post('/add', async (req, res) => {
    try {
        const userData = req.body;

        // Create the save promises for all three databases
        const savePromises = [
            new MainUser(userData).save(),
            new Backup1User(userData).save(),
            new Backup2User(userData).save()
        ];

        // Execute all saves in parallel
        await Promise.all(savePromises);

        res.status(201).json({ 
            message: "Success: User created in MainDB, Backup1, and Backup2!" 
        });

    } catch (error) {
        console.error("Triple Save Error:", error);
        
        if (error.code === 11000) {
            return res.status(400).json({ 
                message: "Error: Email or Employee ID already exists in the system." 
            });
        }

        res.status(500).json({ message: "Server Error: " + error.message });
    }
});

// ==========================================
// UPDATE - PUT /api/users/:id
// ==========================================

router.put('/:id', async (req, res) => {
    const {
        email,
        firstName,
        lastName,
        middleName,
        employeeId,
        phoneNumber,
        birthdate,
        gender,
        address,
        role,
        employmentType,
        employmentStatus,
        employmentFromOutside,
        program,
        department
    } = req.body;

    try {
        const updateData = {
            email,
            firstName,
            lastName,
            middleName,
            employeeId,
            phoneNumber,
            birthdate,
            gender,
            address,
            role,
            employmentType,
            employmentStatus,
            employmentFromOutside,
            program,
            department
        };

        // Remove undefined fields
        Object.keys(updateData).forEach(key => 
            updateData[key] === undefined && delete updateData[key]
        );

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ 
                message: "User not found" 
            });
        }

        res.status(200).json(updatedUser);
    } catch (error) {
        // Handle duplicate key error
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(409).json({ 
                message: `${field} already exists` 
            });
        }

        // Handle validation errors
        if (error.name === "ValidationError") {
            const errors = Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message
            }));
            return res.status(400).json({ 
                message: "Validation error", 
                errors 
            });
        }

        // Handle invalid ObjectId
        if (error.kind === "ObjectId") {
            return res.status(400).json({ 
                message: "Invalid user ID format" 
            });
        }

        res.status(500).json({ message: error.message });
    }
});

// ==========================================
// READ ALL - POST /api/users (with filters)
// ==========================================

router.post('/search', async (req, res) => {
    const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
        search,
        role,
        program,
        department,
        employmentStatus,
        employmentType,
        gender
    } = req.body;

    try {
        // Build query object
        const query = {};

        // Search functionality
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: "i" } },
                { lastName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { employeeId: { $regex: search, $options: "i" } }
            ];
        }

        // Filter by specific fields
        if (role) query.role = role;
        if (program) query.program = program;
        if (department) query.department = department;
        if (employmentStatus) query.employmentStatus = employmentStatus;
        if (employmentType) query.employmentType = employmentType;
        if (gender) query.gender = gender;

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortOptions = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

        // Execute query
        const [users, total] = await Promise.all([
            User.find(query)
                .select("-password")
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            User.countDocuments(query)
        ]);

        res.status(200).json({
            data: users,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalUsers: total,
                usersPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ==========================================
// READ BY ID - POST /api/users/:id
// ==========================================

router.post('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password").lean();

        if (!user) {
            return res.status(404).json({ 
                message: "User not found" 
            });
        }

        res.status(200).json(user);
    } catch (error) {
        // Handle invalid ObjectId
        if (error.kind === "ObjectId") {
            return res.status(400).json({ 
                message: "Invalid user ID format" 
            });
        }

        res.status(500).json({ message: error.message });
    }
});

// ==========================================
// DELETE - DELETE /api/users/:id
// ==========================================

router.delete('/:id', async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        
        if (!deletedUser) {
            return res.status(404).json({ 
                message: "User not found" 
            });
        }

        res.status(200).json({ 
            message: "User deleted successfully" 
        });
    } catch (error) {
        // Handle invalid ObjectId
        if (error.kind === "ObjectId") {
            return res.status(400).json({ 
                message: "Invalid user ID format" 
            });
        }

        res.status(500).json({ message: error.message });
    }
});

export default router;