import jwt from 'jsonwebtoken'; 

// ==========================================
// 🛡️ 1. THE SMART BOUNCER (Production + Dev Simulator)
// ==========================================
export const requireAuth = (req, res, next) => {
    
    // 🌟 SCENARIO A: PRODUCTION (Main Branch) 🌟
    // Does the Main branch's express-session exist?
    if (req.session && req.session.user) {
        req.user = req.session.user; // Use the real database user!
        return next(); 
    }

    // 🛠️ SCENARIO B: LOCAL DEV (Your Simulator) 🛠️
    // If no real session, look for our Simulator Cookie
    const token = req.cookies ? req.cookies.jwt : null;
    
    if (token) {
        try {
            // Verify the simulator token
            req.user = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
            return next(); 
        } catch (error) {
            return res.status(403).send("Simulator session expired.");
        }
    }

    // 🛑 SCENARIO C: NO LOGIN AT ALL 🛑
    return res.status(401).send("Access Denied: Please log in first.");
};
// ==========================================
// 👑 2. THE VIP BOUNCER (Do you have the right role?)
// ==========================================
// This takes a list of roles, e.g., checkRole('DEAN', 'CHAIR')
export const checkRole = (...allowedRoles) => {
    
    // It returns a custom middleware function specifically for that route
    return (req, res, next) => {
        
        // Safety check: Ensure requireAuth ran first
        if (!req.user) {
            return res.status(500).json({ error: "Server Error: Role check ran before Auth check." });
        }

        // Check if the user's role is in the list of allowed roles
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: `Forbidden: You do not have permission. Required roles: ${allowedRoles.join(' or ')}` 
            });
        }

        // They have the correct role. Let them through.
        next();
    };
};