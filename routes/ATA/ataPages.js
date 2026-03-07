import express from "express";
import { requireAuth } from "../../middleware/ata_authMiddleware.js";
import ATAForm from "../../models/ATA/ATAForm.js";

const router = express.Router();

const getSafeUser = (reqUser) => {
    // 1. Grab whatever program data they have, or default to an empty string
    let rawProgram = reqUser.program || reqUser.department || reqUser.college || "";
    
    // 2. If the database literally says "N/A", clear it out so the UI ignores it
    if (rawProgram === "N/A") {
        rawProgram = "";
    }

    return {
        ...reqUser,
        name: reqUser.name || `${reqUser.firstName || ''} ${reqUser.lastName || ''}`.trim() || "Faculty Member",
        role: reqUser.role || "Professor",
        employmentType: reqUser.employmentType || "Full-Time",
        isPracticumCoordinator: reqUser.isPracticumCoordinator || false,
        program: rawProgram // 👈 Now safely passes the cleaned data
    };
};

// ==========================================
// 🏠 MAIN ATA ENTRY POINT (Smart Redirect)
// ==========================================
router.get("/", (req, res) => {
    // 1. Is there a real session from the MainDB?
    if (req.session && req.session.user) {
        return res.redirect("/ata/dashboard/window"); 
    }
    
    // 2. No session? Kick them immediately to the official login page!
    // (Note: If your group's main login page is '/auth' instead of '/login', change this line)
    return res.redirect("/login"); 
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
            myApprovedCount: myApprovedCount,   // 👈 Pass to EJS
            currentPageCategory: 'ata'
        });

    } catch (error) {
        console.error("Error loading dashboard data:", error);
        res.status(500).send("Server Error loading dashboard.");
    }
});

// Other pages
// 📄 VIEW MY SUBMISSIONS
// 📄 VIEW MY SUBMISSIONS (With Smart Filtering)
router.get("/submissions", requireAuth, async (req, res) => {
    try {
        let userID = "unknown";
        if (req.user) {
            if (req.user._id && req.user._id.$oid) userID = req.user._id.$oid;
            else if (req.user._id) userID = req.user._id.toString();
            else if (req.user.id) userID = req.user.id;
            else if (req.user.employeeId) userID = req.user.employeeId;
        }

        // 1. Check the URL to see what the user clicked
        const filterType = req.query.filter || 'all';
        let dbQuery = { userID: userID };

        // 2. Adjust the database search based on the filter
        if (filterType === 'approved') {
            dbQuery.status = 'FINALIZED'; 
        } else if (filterType === 'pending') {
            dbQuery.status = { $ne: 'FINALIZED' };
        }

        // 3. Fetch the filtered forms
        const myForms = await ATAForm.find(dbQuery).sort({ createdAt: -1 });

        res.render("ATA/submissions", { 
            forms: myForms,
            user: req.user,                 
            currentPageCategory: 'ata',
            filterType: filterType 
        });

    } catch (error) {
        console.error("Error loading submissions:", error);
        res.status(500).send("Error loading submissions page.");
    }
});
// 📄 VIEW MY SUBMISSION (Read-Only UI Viewer)
router.get("/view-submission/:id", requireAuth, async (req, res) => {
    try {
        const form = await ATAForm.findById(req.params.id);
        if (!form) return res.status(404).send("Form not found");

        res.render("ATA/view-submission", {
            form: form,
            user: req.user,
            role: req.user.role,
            currentPageCategory: 'ata'
        });
    } catch (error) {
        console.error("Error loading view submission page:", error);
        res.status(500).send("Server Error loading page.");
    }
});

router.get("/reports", requireAuth, (req, res) => res.render("ATA/reports"));
router.get("/profile", requireAuth, (req, res) => res.render("ATA/profile"));
router.get("/admin/courses", requireAuth, (req, res) => res.render("ATA/admin-courses"));

export default router;