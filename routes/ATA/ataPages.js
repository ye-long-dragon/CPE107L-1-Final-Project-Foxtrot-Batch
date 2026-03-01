import express from "express";
import { requireAuth } from "../../middleware/ata_authMiddleware.js";
import { mockUsers } from "./authRoutes.js"; 
import ATAForm from "../../models/ATA/ATAForm.js";

const router = express.Router();

const getSafeUser = (reqUser) => {
    return {
        ...reqUser,
        name: reqUser.name || `${reqUser.firstName || ''} ${reqUser.lastName || ''}`.trim() || "Faculty Member",
        role: reqUser.role || "Professor",
        employmentType: reqUser.employmentType || "Full-Time",
        isPracticumCoordinator: reqUser.isPracticumCoordinator || false,
        program: reqUser.program || reqUser.department || reqUser.college || "CpE" 
    };
};

// Main ATA landing page
router.get("/", (req, res) => {
    if (req.session && req.session.user) {
        return res.render("ATA/AtaMain", { user: req.session.user, currentPageCategory: 'ata' }); 
    }
    res.render("ATA/AtaMain", { mockUsers, currentPageCategory: 'ata' }); 
});
// ATA Form page
router.get("/new", requireAuth, (req, res) => {
    const safeUser = getSafeUser(req.user);
    res.render("ATA/new-ata", {
        user: safeUser,
        role: safeUser.role,
        employmentType: safeUser.employmentType,
        isPracticumCoordinator: safeUser.isPracticumCoordinator
    });
});

// 2. DYNAMIC DASHBOARD ROUTE
router.get("/dashboard/window", requireAuth, async (req, res) => {
    try {
        const safeUser = getSafeUser(req.user);
        
        let userID = "unknown";
        if (req.user) {
            if (req.user._id && req.user._id.$oid) userID = req.user._id.$oid;
            else if (req.user._id) userID = req.user._id.toString();
            else if (req.user.id) userID = req.user.id;
            else if (req.user.employeeId) userID = req.user.employeeId;
        }

        const myPendingCount = await ATAForm.countDocuments({ 
            userID: userID, 
            status: { $regex: '^PENDING' } 
        });

        // This looks for fully approved forms
        const myApprovedCount = await ATAForm.countDocuments({ 
            userID: userID, 
            status: 'FINALIZED' 
        });

        // Pass the live counts to the HTML!
        res.render("ATA/dashboard_window", {
            user: safeUser,
            role: safeUser.role,
            employmentType: safeUser.employmentType,
            isPracticumCoordinator: safeUser.isPracticumCoordinator,
            myPendingCount: myPendingCount,     // 👈 Pass to EJS
            myApprovedCount: myApprovedCount    // 👈 Pass to EJS
        });

    } catch (error) {
        console.error("Error loading dashboard data:", error);
        res.status(500).send("Server Error loading dashboard.");
    }
});

// Other pages
router.get("/submissions", requireAuth, (req, res) => res.render("ATA/submissions"));
router.get("/reports", requireAuth, (req, res) => res.render("ATA/reports"));
router.get("/profile", requireAuth, (req, res) => res.render("ATA/profile"));
router.get("/admin/courses", requireAuth, (req, res) => res.render("ATA/admin-courses"));

export default router;