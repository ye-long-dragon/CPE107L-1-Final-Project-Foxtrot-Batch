import jwt from 'jsonwebtoken'; 

// ==========================================
// 🛡️ 1. THE GENERAL BOUNCER (Are you logged in?)
// ==========================================
export const requireAuth = (req, res, next) => {
    try {
        // 1. Look for the "badge" in the incoming request headers
        // Usually formatted as: "Bearer eyJhbGciOiJIUzI1NiIsInR..."
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(" ")[1];

        // If they didn't bring a badge at all, kick them out.
        if (!token) {
            return res.status(401).json({ error: "Access Denied: Please log in first." });
        }

        // 2. Verify the badge isn't fake or expired
        // (Tell Bastasa to make sure process.env.JWT_SECRET is set up!)
        const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);

        // 3. Attach the user's data to the request object!
        // This is exactly how your ataController.js gets access to req.user._id and req.user.role
        req.user = decodedPayload;

        // 4. They pass the check. Open the door to the next step.
        next(); 

    } catch (error) {
        // If the token is fake or expired, jwt.verify throws an error. Catch it here.
        console.error("Auth Middleware Error:", error.message);
        return res.status(403).json({ error: "Invalid or expired login session." });
    }
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